# gascript — Claude context

## What this project is

One repo, multiple Google Apps Script automations. Each script is an isolated folder deployed independently to its own Apps Script project via GitHub Actions.

## Repo layout

```
job-alerts/          ← one folder per script
  code.js
  parsers.js
  sheets.js
  email.js
  triggers.js
  debug.js
  appsscript.json

.github/workflows/
  deploy-job-alerts.yml   ← one workflow per script, path-filtered

new-script.sh        ← CLI to scaffold a new script
```

## Adding a new script

```bash
./new-script.sh my-script-name
```

Then:
1. Create an Apps Script project at script.google.com
2. Add `MY_SCRIPT_NAME_SCRIPT_ID` as a GitHub secret
3. Write code in `my-script-name/`, push to `main`

## Apps Script constraints (important)

- **No npm, no imports.** Plain ES5/ES6 only. No `require`, no `import`, no modules.
- **Global scope is shared within a project.** All `.js` files in a folder are concatenated — function names must be unique.
- **Google services only.** Use built-in globals: `GmailApp`, `SpreadsheetApp`, `UrlFetchApp`, `Logger`, etc.
- **6-minute execution limit.** Batch where possible.
- **Triggers are installed manually.** Add an `installTrigger()` function and run it once from the Apps Script editor.

## CI/CD per script

Each `deploy-{name}.yml` workflow:
- Triggers only on changes to its own folder (`paths: 'name/**'`)
- Uses shared `CLASPRC_JSON` secret (Google account auth)
- Uses its own `NAME_SCRIPT_ID` secret
- Runs `clasp push --force` with `rootDir` pointing to the script folder

## Coding conventions

- Plain `function` declarations at top level
- `var`, `const`, `let` all work (V8 runtime)
- `Logger.log()` or `console.log()` for logging
- Wrap Gmail/Sheets calls in try/catch where failures should be non-fatal

## Local dev

```bash
# Point clasp at one script at a time
echo '{"scriptId":"SCRIPT_ID","rootDir":"job-alerts"}' > .clasp.json
clasp push --force
clasp open
```

`.clasp.json` is git-ignored — never commit it.
