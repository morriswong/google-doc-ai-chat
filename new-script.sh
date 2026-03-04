#!/bin/bash
# Usage: ./new-script.sh <script-name>
# Example: ./new-script.sh slack-alerts

set -e

NAME="$1"

if [ -z "$NAME" ]; then
  echo "Usage: ./new-script.sh <script-name>"
  echo "Example: ./new-script.sh slack-alerts"
  exit 1
fi

# Derive secret name: slack-alerts -> SLACK_ALERTS_SCRIPT_ID
SECRET_NAME=$(echo "$NAME" | tr '[:lower:]-' '[:upper:]_')_SCRIPT_ID

if [ -d "$NAME" ]; then
  echo "Error: folder '$NAME' already exists"
  exit 1
fi

# Create folder and starter files
mkdir -p "$NAME"

cat > "$NAME/appsscript.json" << 'EOF'
{
  "timeZone": "Europe/London",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
EOF

cat > "$NAME/code.js" << EOF
function main() {
  // Entry point for $NAME
  Logger.log('$NAME: running');
}
EOF

# Create deploy workflow
cat > ".github/workflows/deploy-$NAME.yml" << EOF
name: Deploy $NAME

on:
  push:
    branches:
      - main
    paths:
      - '$NAME/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install clasp
        run: npm install -g @google/clasp

      - name: Write clasp credentials
        run: echo '\${{ secrets.CLASPRC_JSON }}' > ~/.clasprc.json

      - name: Write clasp project settings
        run: echo '{"scriptId":"\${{ secrets.$SECRET_NAME }}","rootDir":"$NAME"}' > .clasp.json

      - name: Push to Apps Script
        run: clasp push --force
EOF

echo ""
echo "Created: $NAME/"
echo "         $NAME/appsscript.json"
echo "         $NAME/code.js"
echo "         .github/workflows/deploy-$NAME.yml"
echo ""
echo "Next steps:"
echo "  1. Go to https://script.google.com and create a new project"
echo "  2. Copy the Script ID from Project Settings"
echo "  3. Add a GitHub secret named $SECRET_NAME with that value"
echo "  4. Write your script in $NAME/"
echo "  5. Push to main — CI will deploy automatically"
echo ""
