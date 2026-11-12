// What an entry may hold, shared by the list (apps/*.json) and an app's own declaration (.nflb.json).
import { execFileSync } from "node:child_process";

export const DECLARATION = ".nflb.json";
const KEYS = { name: 1, url: 1, app_version: 0, spec_version: 1, status: 1, missing: 0, notes: 0 }; // 1 = required
export const REPO = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/;

// Returns a list of problems, empty when the entry is good. `source` is allowed only in the list.
export function problemsIn(a, { source = false } = {}) {
  const out = [];
  if (!a || typeof a !== "object" || Array.isArray(a)) return ["must be one JSON object"];
  for (const k of Object.keys(a)) if (!(k in KEYS) && !(source && k === "source")) out.push(`unknown field "${k}"`);
  for (const [k, required] of Object.entries(KEYS)) if (required && a[k] === undefined) out.push(`missing "${k}"`);
  const line = (k, max) => { if (a[k] !== undefined && (typeof a[k] !== "string" || !a[k].trim() || a[k].length > max || /[\r\n|<>`]/.test(a[k]))) out.push(`"${k}" must be one line of plain text, at most ${max} characters`); };
  line("name", 60); line("app_version", 30); line("notes", 300);
  if (a.url !== undefined && (typeof a.url !== "string" || !/^https:\/\/[^\s|)<>"`]+$/.test(a.url))) out.push('"url" must be an https link');
  if (a.spec_version !== undefined && (typeof a.spec_version !== "string" || !/^\d+\.\d+(\.\d+)?$/.test(a.spec_version))) out.push('"spec_version" is the specification\'s version, such as "0.4.0"');
  if (a.status !== undefined && a.status !== "conforms" && a.status !== "partly") out.push('"status" is "conforms" or "partly"');
  const rules = a.missing;
  if (rules !== undefined && (!Array.isArray(rules) || rules.some((r) => typeof r !== "string" || !/^\d+(\.\d+){1,2}$/.test(r)))) out.push('"missing" is a list of rule numbers, such as ["2.6", "3.1.1"]');
  else if (a.status === "partly" && !(Array.isArray(rules) && rules.length)) out.push('with "partly", list the unmet rules in "missing"');
  else if (a.status === "conforms" && Array.isArray(rules) && rules.length) out.push('with "conforms", leave "missing" out');
  if (source && a.source !== undefined && (typeof a.source !== "string" || !REPO.test(a.source))) out.push('"source" is the repository that holds the app\'s .nflb.json, as "owner/name"');
  return out;
}

// In words: what an entry declares.
export function declares(a) {
  return a.status === "conforms"
    ? `${a.name} conforms to No File Left Behind ${a.spec_version}`
    : `${a.name} partly meets No File Left Behind ${a.spec_version} (not yet: ${a.missing.join(", ")})`;
}

// The fields in a fixed order, so the same declaration always makes the same file.
export function tidy(a, source) {
  const out = {};
  for (const k of Object.keys(KEYS)) if (a[k] !== undefined) out[k] = a[k];
  if (source) out.source = source;
  return out;
}

// An app's declaration, read from its repository's default branch. null when there is none.
export async function fetchDeclaration(repo) {
  const base = process.env.NFLB_RAW_BASE || "https://raw.githubusercontent.com";
  const r = await fetch(`${base}/${repo}/HEAD/${DECLARATION}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`could not read ${DECLARATION} from ${repo} (HTTP ${r.status})`);
  const text = await r.text();
  if (text.length > 4000) throw new Error(`${DECLARATION} in ${repo} is too long`);
  try { return JSON.parse(text); } catch (e) { throw new Error(`${DECLARATION} in ${repo} is not valid JSON (${e.message})`); }
}

// Opens (or updates) a pull request in this repository that changes one file. Runs in a workflow.
// Nothing here goes through a shell, so nothing from a declaration can be run as a command.
export function propose({ branch, file, title, body }) {
  const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
  if (process.env.NFLB_DRY_RUN) { console.log(`would open a pull request: ${title} (${file})`); return null; }
  run("git", ["config", "user.name", "github-actions[bot]"]);
  run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  run("git", ["checkout", "-q", "-B", branch, "origin/main"]);
  run("git", ["add", "--", file]);
  run("git", ["commit", "-q", "-m", title]);
  run("git", ["push", "-q", "--force", "origin", branch]);
  run("git", ["checkout", "-q", "--detach", "origin/main"]);
  const open = run("gh", ["pr", "list", "--head", branch, "--state", "open", "--json", "url", "--jq", ".[0].url // \"\""]);
  if (open) { run("gh", ["pr", "edit", open, "--title", title, "--body", body]); return open; }
  return run("gh", ["pr", "create", "--head", branch, "--base", "main", "--title", title, "--body", body]);
}
