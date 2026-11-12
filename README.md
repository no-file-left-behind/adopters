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

**The quick way:** [fill in the form](https://github.com/no-file-left-behind/adopters/issues/new?template=we-use-it.yml).
We add your app for you.

**With a pull request:** add **one new file**, `apps/<your-app>.json`, and nothing else.

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

| Field | Meaning |
|---|---|
| `name` | Your app's name. |
| `url` | Its home page or repository (https). |
| `app_version` | The version of **your app** that first had it. Optional. |
| `spec_version` | The version of **the specification** you checked against. |
| `status` | `"conforms"` if you meet every MUST in sections 1 to 6; `"partly"` if not yet. |
| `missing` | With `"partly"`: the rules you don't meet yet, e.g. `["2.6", "6.3"]`. |
| `notes` | One line. Optional. |

### The rules for a pull request

These keep every pull request mergeable as it stands, with no conflicts and no rebasing:

1. **One pull request adds or changes one file, in `apps/`.** The file is named after your app,
   in lower case with dashes: `apps/my-app.json`.
2. **Don't edit `README.md` or `adopters.json`.** The table above and that file are rebuilt from
   `apps/` after every merge.
3. **Don't touch anyone else's file.**

A check runs on your pull request and tells you if the file needs fixing. To check it yourself:
`node tools/adopters.mjs`.

To update your entry later (a new specification version, or `"partly"` becoming `"conforms"`),
change your own file the same way.

## Licence

This list is public domain ([CC0 1.0](LICENSE)); the tool that builds it is [0BSD](LICENSE-code).
