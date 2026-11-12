// Checks every file in apps/, and with --write rebuilds adopters.json and the table in README.md.
//   node tools/adopters.mjs            check only (what a pull request runs)
//   node tools/adopters.mjs --write    check, then rebuild (what runs after a merge)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const KEYS = { name: 1, url: 1, app_version: 0, spec_version: 1, status: 1, missing: 0, notes: 0 }; // 1 = required
const problems = [];
const apps = [];

for (const file of readdirSync(new URL("apps/", root)).sort()) {
  const say = (m) => problems.push(`apps/${file}: ${m}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.json$/.test(file)) { say("name the file in lower case with dashes, ending .json, e.g. my-app.json"); continue; }
  let a;
  try { a = JSON.parse(readFileSync(new URL(`apps/${file}`, root), "utf8")); } catch (e) { say(`not valid JSON (${e.message})`); continue; }
  if (!a || typeof a !== "object" || Array.isArray(a)) { say("must be one JSON object"); continue; }
  for (const k of Object.keys(a)) if (!(k in KEYS)) say(`unknown field "${k}"`);
  for (const [k, required] of Object.entries(KEYS)) if (required && a[k] === undefined) say(`missing "${k}"`);
  const line = (k, max) => { if (a[k] !== undefined && (typeof a[k] !== "string" || !a[k].trim() || a[k].length > max || /[\r\n|]/.test(a[k]))) say(`"${k}" must be one line of text, at most ${max} characters, with no | in it`); };
  line("name", 60); line("app_version", 30); line("notes", 300);
  if (a.url !== undefined && !/^https:\/\/[^\s|)]+$/.test(a.url)) say('"url" must be an https link');
  if (a.spec_version !== undefined && !/^\d+\.\d+(\.\d+)?$/.test(a.spec_version)) say('"spec_version" is the specification\'s version, such as "0.4.0"');
  if (a.status !== undefined && a.status !== "conforms" && a.status !== "partly") say('"status" is "conforms" or "partly"');
  const rules = a.missing;
  if (rules !== undefined && (!Array.isArray(rules) || rules.some((r) => typeof r !== "string" || !/^\d+(\.\d+){1,2}$/.test(r)))) say('"missing" is a list of rule numbers, such as ["2.6", "3.1.1"]');
  if (a.status === "partly" && !(Array.isArray(rules) && rules.length)) say('with "partly", list the unmet rules in "missing"');
  if (a.status === "conforms" && Array.isArray(rules) && rules.length) say('with "conforms", leave "missing" out');
  apps.push({ slug: file.replace(/\.json$/, ""), ...a });
}

if (problems.length) { for (const p of problems) console.log(p); console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}`); process.exit(1); }
console.log(`${apps.length} app${apps.length === 1 ? "" : "s"}, all good`);

if (process.argv.includes("--write")) {
  apps.sort((x, y) => x.name.localeCompare(y.name, "en", { sensitivity: "base" }));
  writeFileSync(new URL("adopters.json", root), JSON.stringify({ apps }, null, 2) + "\n");
  const rows = apps.map((a) => {
    const meets = a.status === "conforms" ? `Conforms to ${a.spec_version}` : `Partly meets ${a.spec_version}; not yet: ${a.missing.join(", ")}`;
    return `| [${a.name}](${a.url}) | ${a.app_version ? `${a.name} ${a.app_version}` : ""} | ${meets} | ${a.notes ?? ""} |`;
  });
  const table = ["| App | In the app since | Against the specification | Notes |", "|---|---|---|---|", ...rows].join("\n");
  const readme = readFileSync(new URL("README.md", root), "utf8");
  const [start, end] = ["<!-- adopters:start -->", "<!-- adopters:end -->"];
  const i = readme.indexOf(start), j = readme.indexOf(end);
  if (i < 0 || j < i) { console.log("README.md has lost its adopters markers"); process.exit(1); }
  writeFileSync(new URL("README.md", root), readme.slice(0, i + start.length) + "\n" + table + "\n" + readme.slice(j));
  console.log("wrote adopters.json and the table in README.md");
}
