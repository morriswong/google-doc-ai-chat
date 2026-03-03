# google-doc-ai-chat

AI sidebar chat in Google Docs, built with Google Apps Script.

## Deployment

Code is automatically deployed to Google Apps Script via GitHub Actions on every push to `main`.

### How it works

1. The workflow (`.github/workflows/deploy.yml`) runs `clasp push --force` on each push to `main`
2. Credentials are stored as GitHub Actions secrets — nothing sensitive is committed to the repo

### One-time setup (already done)

To replicate this in a fresh clone:

1. **Get your local clasp token** (requires running `clasp login` first):
   ```bash
   cat ~/.clasprc.json
   ```

2. **Add two GitHub Actions secrets** at `Settings → Secrets → Actions`:

   | Secret name | Value |
   |---|---|
   | `CLASPRC_JSON` | Full contents of `~/.clasprc.json` |
   | `CLASP_SCRIPT_ID` | The Apps Script project ID |

3. Push to `main` — the workflow will trigger automatically.
