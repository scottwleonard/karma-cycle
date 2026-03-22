#!/usr/bin/env bash
#
# sync-todos.sh — Post-commit hook script
#
# Keeps four artifacts aligned from todo.md as the single source of truth:
#   1. GitHub Issues  — developer-level detail (from `issue:` lines)
#   2. Changelog HTML — player-level descriptions (from `changelog:` lines)
#   3. todo.md        — planning shorthand (checkbox titles)
#   4. Commit log     — stays as-is (developer writes these naturally)
#
# Requirements: gh (GitHub CLI) authenticated
#
set -euo pipefail

TODO_FILE="todo.md"
CHANGELOG_FILE="public/changelog/index.html"
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s "$COMMIT_SHA")
COMMIT_URL=""

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

echo "[sync-todos] Syncing todo.md ↔ Issues ↔ Changelog for ${REPO}..."

# ── Parse todo.md (multi-line format) ─────────────────────────────────────────

MODIFIED=false
CHANGELOG_ENTRIES=""

if [[ ! -f "$TODO_FILE" ]]; then
  echo "[sync-todos] No todo.md found — skipping todo sync."
else
  # Parse todo items with their metadata blocks
  # State machine: read checkbox lines, then collect indented metadata
  current_title=""
  current_checked=""
  current_issue_num=""
  current_issue_body=""
  current_changelog=""
  current_tag="new"
  in_item=false
  current_meta_key=""

  flush_item() {
    if [[ -z "$current_title" ]]; then
      return
    fi

    if [[ "$current_checked" == "x" ]]; then
      # ── Completed: close issue, queue changelog entry ──
      if [[ -n "$current_issue_num" ]]; then
        state=$(gh issue view "$current_issue_num" --repo "$REPO" --json state -q '.state' 2>/dev/null || echo "")
        if [[ "$state" == "OPEN" ]]; then
          gh issue close "$current_issue_num" --repo "$REPO" \
            --comment "Completed. Commit: ${COMMIT_URL}" 2>/dev/null || true
          echo "[sync-todos] Closed issue #${current_issue_num}: ${current_title}"
        fi
      fi

      # Queue changelog entry if we have player-facing text
      if [[ -n "$current_changelog" ]]; then
        CHANGELOG_ENTRIES+="ENTRY|${current_tag}|${current_title}|${current_changelog}"$'\n'
      fi
    else
      # ── Open: create issue if not linked ──
      if [[ -z "$current_issue_num" ]]; then
        # Build issue body from metadata (developer-facing)
        body="## ${current_title}"$'\n\n'
        if [[ -n "$current_issue_body" ]]; then
          body+="${current_issue_body}"$'\n\n'
        fi
        body+="---"$'\n'
        body+="Tracked in \`todo.md\`. Synced by post-commit hook."

        new_issue=$(gh issue create \
          --repo "$REPO" \
          --title "$current_title" \
          --body "$body" \
          ${CURRENT_USER:+--assignee "$CURRENT_USER"} \
          2>/dev/null || echo "")

        if [[ -n "$new_issue" ]]; then
          new_num=$(echo "$new_issue" | grep -oE '[0-9]+$')
          if [[ -n "$new_num" ]]; then
            # Append (#N) to the checkbox line in todo.md
            escaped_title=$(printf '%s\n' "$current_title" | sed 's/[&/\]/\\&/g')
            sed -i "s|- \[ \] ${escaped_title}$|- [ ] ${current_title} (#${new_num})|" "$TODO_FILE"
            MODIFIED=true
            echo "[sync-todos] Created issue #${new_num}: ${current_title}"
          fi
        fi
      fi
    fi
  }

  # Read todo.md line by line
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Check for a checkbox line
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[([[:space:]x])\][[:space:]]+(.*) ]]; then
      # Flush previous item
      flush_item

      # Start new item
      current_checked="${BASH_REMATCH[1]}"
      rest="${BASH_REMATCH[2]}"
      current_issue_num=""
      current_issue_body=""
      current_changelog=""
      current_tag="new"
      current_meta_key=""
      in_item=true

      # Extract issue number if present: "Title (#123)"
      if [[ "$rest" =~ ^(.*)[[:space:]]+\(#([0-9]+)\)[[:space:]]*$ ]]; then
        current_title="${BASH_REMATCH[1]}"
        current_issue_num="${BASH_REMATCH[2]}"
      else
        current_title=$(echo "$rest" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      fi

    elif [[ "$in_item" == true ]] && [[ "$line" =~ ^[[:space:]]+- ]]; then
      # Indented metadata line under a checkbox item
      meta_content=$(echo "$line" | sed 's/^[[:space:]]*- //')

      if [[ "$meta_content" =~ ^issue:[[:space:]]*(.*) ]]; then
        current_meta_key="issue"
        current_issue_body="${BASH_REMATCH[1]}"
      elif [[ "$meta_content" =~ ^changelog:[[:space:]]*(.*) ]]; then
        current_meta_key="changelog"
        current_changelog="${BASH_REMATCH[1]}"
      elif [[ "$meta_content" =~ ^tag:[[:space:]]*(.*) ]]; then
        current_meta_key="tag"
        current_tag=$(echo "${BASH_REMATCH[1]}" | sed 's/[[:space:]]*$//')
      else
        # Continuation line for multi-line metadata
        trimmed=$(echo "$meta_content" | sed 's/^[[:space:]]*//')
        case "$current_meta_key" in
          issue)    current_issue_body+=" ${trimmed}" ;;
          changelog) current_changelog+=" ${trimmed}" ;;
        esac
      fi

    elif [[ "$line" =~ ^[[:space:]]*$ ]] || [[ "$line" =~ ^## ]] || [[ "$line" =~ ^--- ]]; then
      # Blank line, heading, or separator — end of current item
      if [[ "$in_item" == true ]]; then
        flush_item
        in_item=false
        current_title=""
        current_meta_key=""
      fi
    fi
  done < "$TODO_FILE"

  # Flush last item
  flush_item

  # ── Update changelog if we have new entries ─────────────────────────────────

  if [[ -n "$CHANGELOG_ENTRIES" ]] && [[ -f "$CHANGELOG_FILE" ]]; then
    TODAY=$(date +"%B %-d, %Y")

    # Build HTML for new entries
    new_html=""
    while IFS='|' read -r _ tag title changelog_text; do
      [[ -z "$title" ]] && continue

      # Map tag to CSS class
      tag_class="tag-new"
      tag_label="New"
      case "$tag" in
        improved) tag_class="tag-improved"; tag_label="Improved" ;;
        fixed)    tag_class="tag-fixed";    tag_label="Fixed" ;;
        balance)  tag_class="tag-balance";  tag_label="Balance" ;;
        new)      tag_class="tag-new";      tag_label="New" ;;
      esac

      new_html+="
    <article class=\"entry\">
      <div class=\"entry-date\">${TODAY}</div>
      <div class=\"entry-version\">
        <span class=\"tag ${tag_class}\">${tag_label}</span>
        ${title}
      </div>
      <ul>
        <li>${changelog_text}</li>
      </ul>
    </article>
"
    done <<< "$CHANGELOG_ENTRIES"

    if [[ -n "$new_html" ]]; then
      # Insert after <main> tag
      escaped_html=$(printf '%s' "$new_html" | sed 's/[&/\]/\\&/g; s/$/\\/' | sed '$ s/\\$//')
      sed -i "/<main>/a\\${escaped_html}" "$CHANGELOG_FILE"
      git add "$CHANGELOG_FILE"
      MODIFIED=true
      echo "[sync-todos] Added changelog entries."
    fi
  fi

  # ── Amend commit if todo.md or changelog were updated ───────────────────────

  if [[ "$MODIFIED" == true ]]; then
    git add "$TODO_FILE"
    git commit --amend --no-edit --no-verify 2>/dev/null || true
    echo "[sync-todos] Amended commit with updated todo.md / changelog."
  fi
fi

# ── Retroactive issue for untracked commits ────────────────────────────────────

# Skip if commit already references an issue or is from this script
if [[ "$COMMIT_MSG" =~ \#[0-9]+ ]] || [[ "$COMMIT_MSG" == *"[sync-todos]"* ]]; then
  echo "[sync-todos] Commit already references an issue."
  exit 0
fi

echo "[sync-todos] Commit has no linked issue — creating one."

changed_files=$(git diff-tree --no-commit-id --name-only -r "$COMMIT_SHA" | head -20)

# Issue body is developer-facing: technical detail
issue_body="## Retroactive issue

Commit: ${COMMIT_URL}

### What changed
\`\`\`
${changed_files}
\`\`\`

### Context
${COMMIT_MSG}

---
*Auto-created by post-commit sync for a commit made without a pre-existing issue.*"

new_issue=$(gh issue create \
  --repo "$REPO" \
  --title "$COMMIT_MSG" \
  --body "$issue_body" \
  ${CURRENT_USER:+--assignee "$CURRENT_USER"} \
  2>/dev/null || echo "")

if [[ -n "$new_issue" ]]; then
  new_num=$(echo "$new_issue" | grep -oE '[0-9]+$')
  echo "[sync-todos] Created and closed issue #${new_num}."
  gh issue close "$new_num" --repo "$REPO" \
    --comment "Work completed in ${COMMIT_URL}." \
    2>/dev/null || true
fi

echo "[sync-todos] Done."
