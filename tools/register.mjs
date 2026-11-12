// Someone asked for a repository's declaration to be added to the list (the "Add my app from its
// declaration" form). Read it, check it, and open a pull request with the new file.
//   NFLB_ISSUE_BODY="..." NFLB_ISSUE=12 node tools/register.mjs
// Prints what to tell the person; the workflow posts it on the issue.
import { existsSync, writeFileSync } from "node:fs";
import { declares, fetchDeclaration, problemsIn, propose, tidy, DECLARATION, REPO } from "./lib.mjs";

const root = new URL("../", import.meta.url);
const body = process.env.NFLB_ISSUE_BODY || "";
// The form puts the answer on the line after its heading. Accept a bare name or a GitHub link.
const m = body.match(/###\s*Repository\s*\n+\s*(?:https:\/\/github\.com\/)?([A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+?)(?:\.git)?\/?\s*(?:\n|$)/);
const say = (text, ok = false) => { console.log(text); process.exit(ok ? 0 : 1); };
if (!m || !REPO.test(m[1])) say("I couldn't find a repository in this issue. Write it as `owner/name`, then edit the issue.");
const repo = m[1];

let declared;
try { declared = await fetchDeclaration(repo); } catch (e) { say(`${e.message}. Fix it, then edit this issue to try again.`); }
if (!declared) say(`There is no \`${DECLARATION}\` on the default branch of ${repo} yet. Once the pull request that adds it has merged, edit this issue to try again.`);
const found = problemsIn(declared);
if (found.length) say(`The \`${DECLARATION}\` in ${repo} needs fixing:\n\n${found.map((p) => `- ${p}`).join("\n")}\n\nFix it there, then edit this issue to try again.`);

let slug = repo.split("/")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app";
if (existsSync(new URL(`apps/${slug}.json`, root))) slug = repo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
if (existsSync(new URL(`apps/${slug}.json`, root))) say(`${repo} is already in the list. Its entry follows its \`${DECLARATION}\` by itself; nothing more to do.`, true);

const entry = tidy(declared, repo);
writeFileSync(new URL(`apps/${slug}.json`, root), JSON.stringify(entry, null, 2) + "\n");
const issue = process.env.NFLB_ISSUE;
const url = propose({
  branch: `declared/${slug}`, file: `apps/${slug}.json`,
  title: `Add ${entry.name}: ${declares(entry)}`,
  body: `From the declaration in [${repo}](https://github.com/${repo}) (\`${DECLARATION}\` on its default branch).\n\n${declares(entry)}.\n\nFrom now on this entry follows that file: when it changes, a pull request opens here by itself.${issue ? `\n\nCloses #${issue}` : ""}`,
});
say(`Thank you. ${declares(entry)}.\n\n${url ? `The pull request that adds it: ${url}\n\n` : ""}From now on the list follows the \`${DECLARATION}\` in ${repo}: change it there and a pull request opens here by itself.`, true);
