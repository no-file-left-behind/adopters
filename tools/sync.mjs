// For every app in the list that names a `source` repository: read the declaration on that
// repository's default branch, and if it says something new, open a pull request here that
// brings the list up to date. One pull request per app, one file each.
//   node tools/sync.mjs [owner/name]     with a repository, only that app
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { declares, fetchDeclaration, problemsIn, propose, tidy, REPO } from "./lib.mjs";

const root = new URL("../", import.meta.url);
const only = process.argv[2];
if (only && !REPO.test(only)) { console.log("not a repository name"); process.exit(1); }
let failed = false;

for (const file of readdirSync(new URL("apps/", root)).sort()) {
  const path = new URL(`apps/${file}`, root);
  const now = JSON.parse(readFileSync(path, "utf8"));
  if (!now.source || (only && now.source.toLowerCase() !== only.toLowerCase())) continue;
  try {
    const declared = await fetchDeclaration(now.source);
    if (!declared) { console.log(`${file}: ${now.source} has no declaration yet; left as it is`); continue; }
    const found = problemsIn(declared);
    if (found.length) { console.log(`${file}: the declaration in ${now.source} has problems: ${found.join("; ")}`); failed = true; continue; }
    const next = tidy(declared, now.source);
    if (JSON.stringify(next) === JSON.stringify(tidy(now, now.source))) { console.log(`${file}: up to date`); continue; }
    writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
    const url = propose({
      branch: `declared/${file.replace(/\.json$/, "")}`, file: `apps/${file}`,
      title: `${declares(next)}`,
      body: `[${now.source}](https://github.com/${now.source}) changed its declaration (\`.nflb.json\` on its default branch).\n\n- Before: ${declares(now)}\n- Now: ${declares(next)}\n\nThis pull request was opened automatically. Each app's makers say this themselves; nobody certifies it.`,
    });
    console.log(`${file}: ${declares(next)}${url ? ` -> ${url}` : ""}`);
  } catch (e) { console.log(`${file}: ${e.message}`); failed = true; }
}
process.exit(failed ? 1 : 0);
