# gascript

One repo for all Google Apps Script automations. Each script lives in its own folder and deploys independently to its own Apps Script project via GitHub Actions.

## Scripts

| Folder | What it does |
|---|---|
| `job-alerts/` | Parses job alert emails (LinkedIn, Simplify, Built In, WTTJ) into a Google Sheet |

---

## Adding a new script

```bash
./new-script.sh my-script-name
```

This creates:
- `my-script-name/` — folder with starter `code.js` and `appsscript.json`
- `.github/workflows/deploy-my-script-name.yml` — workflow that only triggers on changes to that folder

Then follow the printed instructions:
1. Go to [script.google.com](https://script.google.com), create a new project
2. Copy the Script ID from **Project Settings**
3. Add a GitHub secret `MY_SCRIPT_NAME_SCRIPT_ID` at **Settings → Secrets → Actions**
4. Write your script, push to `main` — CI deploys it automatically

---

## How deployment works

- Each script folder has its own workflow in `.github/workflows/`
- A workflow only runs when files in its folder change — pushing to `job-alerts/` never touches `slack-alerts/`
- `CLASPRC_JSON` is shared across all scripts (it's your Google account auth)
- Each script has its own `*_SCRIPT_ID` secret pointing to its Apps Script project

---

## One-time auth setup (new machine or server)

### 1. Install clasp

```bash
npm install -g @google/clasp
```

### 2. Log in to Google

```bash
clasp login
```

On a headless server:

```bash
clasp login --no-localhost
```

Prints a URL — open it on any machine, approve, paste the code back. Credentials are saved to `~/.clasprc.json`.

### 3. Add GitHub secrets

| Secret | Value |
|---|---|
| `CLASPRC_JSON` | Full contents of `~/.clasprc.json` |
| `JOB_ALERTS_SCRIPT_ID` | Script ID for the job-alerts project (**rename from old `CLASP_SCRIPT_ID`**) |
| *(one per script)* | |

### 4. Verify

Push any change to `main`. Check the Actions tab to confirm the right workflow ran.

### Refreshing credentials

Tokens expire. If a deploy fails with an auth error:
1. Run `clasp login` locally
2. Copy the new `~/.clasprc.json`
3. Update the `CLASPRC_JSON` GitHub secret

---

## Working on a script locally

```bash
npm install -g @google/clasp
clasp login

# Point clasp at a specific script project
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":"job-alerts"}' > .clasp.json

clasp push --force   # push current files
clasp open           # open in Apps Script editor
clasp logs           # view execution logs
```

`.clasp.json` is git-ignored — never commit it.

---

## Apps Script constraints

- No `require`/`import` — plain JS only, all files share a global scope
- Execution timeout: 6 minutes
- Triggers must be installed manually once from the Apps Script editor (run the `installTrigger` function)
