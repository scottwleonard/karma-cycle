#!/usr/bin/env bash
#
# sync-todos.sh — Post-commit hook
#
# Issue creation is handled by the GitHub Action (.github/workflows/sync-todos.yml)
# which triggers on any push that changes todo.md and has automatic GITHUB_TOKEN access.
#
# This hook just reminds developers that the sync happens on push.
#
set -euo pipefail

TODO_FILE="todo.md"

if [[ ! -f "$TODO_FILE" ]]; then
  exit 0
fi

if git diff-tree --no-commit-id --name-only -r HEAD | grep -q "^todo.md$"; then
  echo "[sync-todos] todo.md changed — issues will sync when you push."
fi
