# Who uses No File Left Behind

Apps that use [No File Left Behind](https://no-file-left-behind.github.io/): when you close several
documents at once, they ask once, in one list, and never close anything if a save fails.

Nobody has to be on this list. The pattern is free for any use, with no credit and no permission
needed. But if your app uses it, we'd love to know, and the list helps the next app decide.

<!-- adopters:start -->
| App | In the app since | Against the specification | Notes |
|---|---|---|---|
| [SolidCraft](https://github.com/tangency-labs/solidcraft) | SolidCraft 0.40 | Partly meets 0.4.0; not yet: 2.6, 3.1.1, 3.1.3, 3.4, 6.3, 6.5 | The app the pattern came from. The rules it doesn't meet yet are being worked on. |
<!-- adopters:end -->

"In the app since" is the app's own version. "Against the specification" is the version of the
[specification](https://no-file-left-behind.github.io/SPEC.html) its makers checked it against.
Each app's makers say this themselves; nobody certifies it.

## Add your app

There are three ways. Use whichever suits you.

### 1. Fill in a form

[Fill in the form](https://github.com/no-file-left-behind/adopters/issues/new?template=we-use-it.yml).
We add your app for you.

### 2. Declare it in your own repository

Best if your app is on GitHub. Your repository says where it stands, and this list follows it.

Put a file named `.nflb.json` at the top of your repository:

```json
{
  "name": "My App",
  "url": "https://example.org/my-app",
  "app_version": "3.2",
  "spec_version": "0.4.0",
  "status": "conforms"
}
```

Add or change that file **in the same pull request as the work itself**. Merging that pull
request is then the declaration: the code and the statement land together.

To have the pull request say so, add this workflow as `.github/workflows/nflb.yml`:

```yaml
name: No File Left Behind
on:
  pull_request:
    paths: [".nflb.json"]
  push:
    branches: [main]
    paths: [".nflb.json"]
permissions:
  contents: read
  pull-requests: write
jobs:
  declaration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: no-file-left-behind/adopters@v1
```

It checks the file and comments on the pull request: "Merging this pull request declares that
My App conforms to No File Left Behind 0.4.0", with what it said before.

After the first merge, tell this list once that your repository has a declaration: the comment
gives you a link to [a one-field form](https://github.com/no-file-left-behind/adopters/issues/new?template=from-declaration.yml).
A pull request adding your app opens here by itself. From then on, whenever `.nflb.json` changes
on your default branch (a new specification version, `"partly"` becoming `"conforms"`), a pull
request updating your entry opens here within the hour. You do nothing.

The workflow is optional. The list follows the file with or without it.

Two things to know about the workflow:

- **Pull requests from forks get no comment.** GitHub gives a fork's pull request a read-only
  token, so the comment can't be posted there. The same text still appears in the job's summary,
  and the check still passes or fails on the file.
- **Pin it if your project pins its actions.** Use the commit instead of the tag:
  `no-file-left-behind/adopters@e185fc9b…  # v1` (the full hash is on the
  [v1 tag](https://github.com/no-file-left-behind/adopters/releases/tag/v1)). The action is one
  small script, [`tools/declare.mjs`](tools/declare.mjs), with no dependencies; read it first.

### 3. Open a pull request here

Add **one new file**, `apps/<your-app>.json`, and nothing else.

```json
{
  "name": "My App",
  "url": "https://example.org/my-app",
  "app_version": "3.2",
  "spec_version": "0.4.0",
  "status": "conforms",
  "notes": "One line, if there is something worth saying."
}
```

## The fields

The same in `.nflb.json` and in `apps/<your-app>.json`.

| Field | Meaning |
|---|---|
| `name` | Your app's name. |
| `url` | Its home page or repository (https). |
| `app_version` | The version of **your app** that first had it. Optional. |
| `spec_version` | The version of **the specification** you checked against. |
| `status` | `"conforms"` if you meet every MUST in sections 1 to 6; `"partly"` if not yet. |
| `missing` | With `"partly"`: the rules you don't meet yet, e.g. `["2.6", "6.3"]`. |
| `notes` | One line. Optional. |
| `source` | Only in `apps/`: the repository whose `.nflb.json` this entry follows, as `owner/name`. |

## The rules for a pull request here

These keep every pull request mergeable as it stands, with no conflicts and no rebasing:

1. **One pull request adds or changes one file, in `apps/`.** The file is named after your app,
   in lower case with dashes: `apps/my-app.json`.
2. **Don't edit `README.md` or `adopters.json`.** The table above and that file are rebuilt from
   `apps/` after every merge.
3. **Don't touch anyone else's file.**

A check runs on your pull request and tells you if the file needs fixing. To check it yourself:
`node tools/adopters.mjs`.

## Licence

This list is public domain ([CC0 1.0](LICENSE)); the tool that builds it is [0BSD](LICENSE-code).
