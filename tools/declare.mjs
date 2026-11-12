// Runs inside an app's own repository, as the action no-file-left-behind/adopters.
// It reads the app's declaration (.nflb.json) and says, on the pull request that changes it, what
// merging will declare. After the merge the adopters list follows the file by itself.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { declares, problemsIn, tidy, DECLARATION } from "./lib.mjs";

const LIST = "no-file-left-behind/adopters";
const MARK = "<!-- nflb-declaration -->";
const env = process.env;
const event = env.GITHUB_EVENT_PATH && existsSync(env.GITHUB_EVENT_PATH) ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8")) : {};
const repo = env.GITHUB_REPOSITORY || "";
const api = env.GITHUB_API_URL || "https://api.github.com";
const summary = (text) => { console.log(text); if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, text + "\n"); };
const gh = (path, { token = env.NFLB_TOKEN, method = "GET", body, raw = false } = {}) => fetch(`${api}${path}`, {
  method, body: body && JSON.stringify(body),
  headers: { accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(token ? { authorization: `Bearer ${token}` } : {}) },
});

if (!existsSync(DECLARATION)) { summary(`There is no \`${DECLARATION}\` at the top of this repository. See https://github.com/${LIST}#declare-it-in-your-own-repository`); process.exit(1); }
let now;
try { now = JSON.parse(readFileSync(DECLARATION, "utf8")); } catch (e) { summary(`\`${DECLARATION}\` is not valid JSON (${e.message}).`); process.exit(1); }
const found = problemsIn(now);
if (found.length) { summary(`\`${DECLARATION}\` needs fixing:\n\n${found.map((p) => `- ${p}`).join("\n")}`); process.exit(1); }

// What it said before this change, if anything.
const pr = event.pull_request;
const beforeRef = pr ? pr.base.sha : event.before;
let before = null;
if (beforeRef && !/^0+$/.test(beforeRef)) {
  try {
    const r = await gh(`/repos/${repo}/contents/${DECLARATION}?ref=${beforeRef}`, { raw: true });
    if (r.ok) { const old = JSON.parse(await r.text()); if (!problemsIn(old).length) before = old; }
  } catch { /* no earlier declaration we can read: treat this as the first */ }
}
const same = before && JSON.stringify(tidy(before)) === JSON.stringify(tidy(now));

// Is this repository already followed by the list?
let followed = false;
try {
  const r = await fetch(`https://raw.githubusercontent.com/${LIST}/main/adopters.json`);
  if (r.ok) followed = (await r.json()).apps.some((a) => (a.source || "").toLowerCase() === repo.toLowerCase());
} catch { /* the list can't be read just now: say how to add it */ }
const addLink = `https://github.com/${LIST}/issues/new?template=from-declaration.yml&title=${encodeURIComponent(`Add ${now.name}`)}&repository=${encodeURIComponent(repo)}`;
const after = followed
  ? `After the merge, the [adopters list](https://github.com/${LIST}#readme) opens its own pull request to match, within the hour.`
  : `After the merge, add ${now.name} to the [adopters list](https://github.com/${LIST}#readme) once: [open this form](${addLink}) and submit it. From then on the list follows this file by itself. (Being on the list is optional.)`;
const whose = `This is the app's makers' own statement, in \`${DECLARATION}\`. Nobody certifies it; the [checklist](https://no-file-left-behind.github.io/CHECKLIST.html) and the [scenarios](https://no-file-left-behind.github.io/scenarios/) are how anyone can check.`;

if (pr) {
  if (same) { summary(`\`${DECLARATION}\` says what it said before: ${declares(now)}.`); process.exit(0); }
  const text = [MARK, `### Merging this pull request declares that ${declares(now)}`, "",
    before ? `Before: ${declares(before)}.` : "This is the app's first declaration.", "", whose, "", after].join("\n");
  summary(text);
  // One comment on the pull request, kept up to date. Without permission to comment, the summary above is enough.
  try {
    const list = await gh(`/repos/${repo}/issues/${pr.number}/comments?per_page=100`);
    const mine = list.ok ? (await list.json()).find((c) => typeof c.body === "string" && c.body.includes(MARK)) : null;
    const r = mine
      ? await gh(`/repos/${repo}/issues/comments/${mine.id}`, { method: "PATCH", body: { body: text } })
      : await gh(`/repos/${repo}/issues/${pr.number}/comments`, { method: "POST", body: { body: text } });
    if (!r.ok) console.log(`(could not comment on the pull request: HTTP ${r.status}; give the job "pull-requests: write" to get the comment)`);
  } catch (e) { console.log(`(could not comment on the pull request: ${e.message})`); }
  process.exit(0);
}

// On the default branch: the declaration now stands.
summary([`### Declared: ${declares(now)}`, "", whose, "", same ? "" : after].join("\n"));
if (!same && followed && env.NFLB_ADOPTERS_TOKEN) {
  // Optional: with a token for the list's repository, tell it now instead of waiting for its hourly look.
  const r = await gh(`/repos/${LIST}/dispatches`, { token: env.NFLB_ADOPTERS_TOKEN, method: "POST", body: { event_type: "declared", client_payload: { repo } } });
  console.log(r.ok ? "Told the adopters list." : `(could not tell the adopters list: HTTP ${r.status}; it will notice within the hour)`);
}
