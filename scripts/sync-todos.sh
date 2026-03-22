#!/usr/bin/env bash
#
# sync-todos.sh — Post-commit hook script
# Syncs todo.md items with GitHub Issues and creates issues for untracked commits.
#
# Requirements: gh (GitHub CLI) authenticated
#
set -euo pipefail

TODO_FILE="todo.md"
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s "$COMMIT_SHA")
COMMIT_URL="" # populated later if we can resolve the repo URL

# ── Preflight ──────────────────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  echo "[sync-todos] gh CLI not found — skipping issue sync."
  echo "[sync-todos] Install: https://cli.github.com"
  exit 0
fi

if ! gh auth status &>/dev/null 2>&1; then
  echo "[sync-todos] gh not authenticated — skipping issue sync."
  echo "[sync-todos] Run: gh auth login"
  exit 0
fi

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
if [[ -z "$REPO" ]]; then
  echo "[sync-todos] Could not determine GitHub repo — skipping issue sync."
  exit 0
fi

COMMIT_URL="https://github.com/${REPO}/commit/${COMMIT_SHA}"
CURRENT_USER=$(gh api user -q '.login' 2>/dev/null || echo "")

echo "[sync-todos] Syncing todo.md with GitHub Issues for ${REPO}..."

# ── Parse todo.md ──────────────────────────────────────────────────────────────

if [[ ! -f "$TODO_FILE" ]]; then
  echo "[sync-todos] No todo.md found — skipping todo sync."
else
  MODIFIED=false

  # Process each todo line. We use a temp file to allow in-place updates.
  TMPFILE=$(mktemp)
  cp "$TODO_FILE" "$TMPFILE"

  while IFS= read -r line; do
    # Match: - [ ] Some title (#123)  or  - [ ] Some title  or  - [x] Some title (#123)
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[([[:space:]x])\][[:space:]]+(.*) ]]; then
      checked="${BASH_REMATCH[1]}"
      rest="${BASH_REMATCH[2]}"

      # Extract issue number if present
      issue_num=""
      title="$rest"
      if [[ "$rest" =~ ^(.*)[[:space:]]+\(#([0-9]+)\)[[:space:]]*$ ]]; then
        title="${BASH_REMATCH[1]}"
        issue_num="${BASH_REMATCH[2]}"
      fi

      # Trim whitespace from title
      title=$(echo "$title" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

      if [[ "$checked" == "x" ]]; then
        # ── Completed item: close the issue if it exists and is open ──
        if [[ -n "$issue_num" ]]; then
          state=$(gh issue view "$issue_num" --repo "$REPO" --json state -q '.state' 2>/dev/null || echo "")
          if [[ "$state" == "OPEN" ]]; then
            gh issue close "$issue_num" --repo "$REPO" --comment "Closed via todo.md sync. Commit: ${COMMIT_URL}" 2>/dev/null || true
            echo "[sync-todos] Closed issue #${issue_num}: ${title}"
          fi
        fi
      else
        # ── Open item: create issue if not linked yet ──
        if [[ -z "$issue_num" ]]; then
          new_issue=$(gh issue create \
            --repo "$REPO" \
            --title "$title" \
            --body "Tracked in \`todo.md\`. Created automatically by post-commit sync." \
            ${CURRENT_USER:+--assignee "$CURRENT_USER"} \
            2>/dev/null || echo "")

          if [[ -n "$new_issue" ]]; then
            # Extract issue number from URL (https://github.com/owner/repo/issues/42)
            new_num=$(echo "$new_issue" | grep -oE '[0-9]+$')
            if [[ -n "$new_num" ]]; then
              # Update the line in todo.md to include the issue number
              escaped_title=$(printf '%s\n' "$title" | sed 's/[&/\]/\\&/g')
              sed -i "s|- \[ \] ${escaped_title}|- [ ] ${title} (#${new_num})|" "$TODO_FILE"
              MODIFIED=true
              echo "[sync-todos] Created issue #${new_num}: ${title}"
            fi
          fi
        fi
      fi
    fi
  done < "$TMPFILE"
  rm -f "$TMPFILE"

  # If we modified todo.md, amend the commit to include the updated file
  if [[ "$MODIFIED" == true ]]; then
    git add "$TODO_FILE"
    git commit --amend --no-edit --no-verify 2>/dev/null || true
    echo "[sync-todos] Updated todo.md with new issue numbers."
  fi
fi

# ── Create issue for commits not linked to an issue ────────────────────────────

# Check if the commit message references an issue (#N) or was made by this script
if [[ "$COMMIT_MSG" =~ \#[0-9]+ ]] || [[ "$COMMIT_MSG" == *"[sync-todos]"* ]]; then
  echo "[sync-todos] Commit already references an issue — skipping."
  exit 0
fi

# Check if commit is part of a PR that references an issue
# (we only check the commit message itself for speed)

echo "[sync-todos] Commit has no linked issue — creating one."

# Determine changed files for context
changed_files=$(git diff-tree --no-commit-id --name-only -r "$COMMIT_SHA" | head -20)

issue_body="Retroactively created for commit ${COMMIT_URL}

**Commit message:** ${COMMIT_MSG}

**Changed files:**
\`\`\`
${changed_files}
\`\`\`

*Auto-created by post-commit sync — this work was done without a pre-existing issue.*"

new_issue=$(gh issue create \
  --repo "$REPO" \
  --title "$COMMIT_MSG" \
  --body "$issue_body" \
  ${CURRENT_USER:+--assignee "$CURRENT_USER"} \
  2>/dev/null || echo "")

if [[ -n "$new_issue" ]]; then
  new_num=$(echo "$new_issue" | grep -oE '[0-9]+$')
  echo "[sync-todos] Created and closed issue #${new_num} for this commit."

  # Close it immediately since the work is already done
  gh issue close "$new_num" --repo "$REPO" \
    --comment "Work already completed in commit ${COMMIT_URL}. Issue created retroactively." \
    2>/dev/null || true
fi

echo "[sync-todos] Done."
