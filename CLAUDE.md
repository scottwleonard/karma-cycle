# CLAUDE.md

## Project Overview

Karma Cycle is a Pixi.js-based incremental/clicker game built with TypeScript and Vite.

## Development

- `npm install` to install dependencies
- `npm run dev` to start dev server
- `npm run build` to build for production

## Architecture

- **Rendering**: Pixi.js 8 (canvas-based, mobile-first at 1080×1920 reference)
- **State**: In-memory `GameState` with localStorage persistence via `SaveManager`
- **Audio**: Procedural Web Audio API (no audio files)
- **UI**: `GameScene.ts` is the main view; components in `src/ui/components/`
- **Game logic**: Systems in `src/systems/` (karma, wealth, needs, death, rebirth, upgrades, enlightenment)
- **Config**: All tuning parameters in `src/config.ts`

## Community Suggestion Pipeline

Players can suggest features from in-game. The pipeline:

1. **In-game "Suggest" button** → `SuggestOverlay` collects text
2. **Netlify Function** (`netlify/functions/suggest.ts`) → creates GitHub Issue with `community-request` label
3. **Owner applies `approved` label** → triggers GitHub Action
4. **`implement-suggestion.yml`** → Claude Code implements on `community/{issue}` branch, opens PR
5. **Netlify Deploy Preview** auto-deploys the PR
6. **`preview-comment.yml`** → comments the preview URL on the original issue

**When implementing community suggestions:**
- Keep changes minimal and focused
- Add new files where possible rather than heavily modifying existing ones
- Do not refactor existing systems
- Match the game's dark/gold aesthetic (bg: 0x0a0a2e, gold: 0xffd700, panel: 0x1a1a4e)
- Always run `npm run build` to verify TypeScript compiles clean

## Permissions

Allow code input and edits from iPad (Claude Code on the web).
