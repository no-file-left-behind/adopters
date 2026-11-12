// Checks every file in apps/, and with --write rebuilds adopters.json and the table in README.md.
//   node tools/adopters.mjs            check only (what a pull request runs)
//   node tools/adopters.mjs --write    check, then rebuild (what runs after a merge)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { problemsIn } from "./lib.mjs";

const root = new URL("../", import.meta.url);
const problems = [];
const apps = [];

for (const file of readdirSync(new URL("apps/", root)).sort()) {
  const say = (m) => problems.push(`apps/${file}: ${m}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.json$/.test(file)) { say("name the file in lower case with dashes, ending .json, e.g. my-app.json"); continue; }
  let a;
  try { a = JSON.parse(readFileSync(new URL(`apps/${file}`, root), "utf8")); } catch (e) { say(`not valid JSON (${e.message})`); continue; }
  const found = problemsIn(a, { source: true });
  found.forEach(say);
  if (!found.length) apps.push({ slug: file.replace(/\.json$/, ""), ...a });
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
