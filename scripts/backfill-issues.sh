#!/usr/bin/env bash
#
# backfill-issues.sh — One-time script to create + close issues for all past commits
# that don't reference an issue in their commit message.
#
# Run once after setting up the repo:
#   gh auth login
#   bash scripts/backfill-issues.sh
#
set -euo pipefail

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI required. Install from https://cli.github.com"
  exit 1
fi

if ! gh auth status &>/dev/null 2>&1; then
  echo "Error: gh not authenticated. Run: gh auth login"
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
if [[ -z "$REPO" ]]; then
  echo "Error: Could not determine GitHub repo."
  exit 1
fi

CURRENT_USER=$(gh api user -q '.login' 2>/dev/null || echo "")

echo "Backfilling issues for ${REPO}..."
echo "Current user: ${CURRENT_USER:-unknown}"
echo ""

# Get all commits on the current branch, oldest first
git log --reverse --pretty=format:"%H|%s" | while IFS='|' read -r sha msg; do
  # Skip commits that already reference an issue
  if [[ "$msg" =~ \#[0-9]+ ]]; then
    echo "SKIP (has issue ref): ${msg}"
    continue
  fi

  commit_url="https://github.com/${REPO}/commit/${sha}"
  changed_files=$(git diff-tree --no-commit-id --name-only -r "$sha" | head -20)

  body="Retroactively created for commit ${commit_url}

**Commit message:** ${msg}

**Changed files:**
\`\`\`
${changed_files}
\`\`\`

*Auto-created by backfill script — this work was done without a pre-existing issue.*"

  new_issue=$(gh issue create \
    --repo "$REPO" \
    --title "$msg" \
    --body "$body" \
    ${CURRENT_USER:+--assignee "$CURRENT_USER"} \
    2>/dev/null || echo "")

  if [[ -n "$new_issue" ]]; then
    new_num=$(echo "$new_issue" | grep -oE '[0-9]+$')
    gh issue close "$new_num" --repo "$REPO" \
      --comment "Work completed in commit ${commit_url}. Issue created retroactively." \
      2>/dev/null || true
    echo "CREATED+CLOSED #${new_num}: ${msg}"
  else
    echo "FAILED: ${msg}"
  fi

  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "Backfill complete."
