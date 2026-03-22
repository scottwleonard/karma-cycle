# Karma Cycle — Todo

What we're building next. This file is the **future** — planned work only.

When an item ships, the post-commit hook moves it through the pipeline:
**todo.md** (plan) → **GitHub Issue** (track) → **commit** (build) → **changelog** (announce)

## How it works

Each item has a checkbox line and optional indented metadata:

```
- [ ] Short feature title
  - issue: Technical details for the GitHub Issue. Implementation notes,
           files to change, acceptance criteria. Written for developers.
  - changelog: What the player sees in the changelog when this ships.
               Written for someone who plays the game, not codes it.
  - tag: new | improved | fixed | balance
```

**Lifecycle:**
1. Add `- [ ]` here with `issue:` and `changelog:` lines → describe the work
2. On next commit, a GitHub Issue is created with the `issue:` text as body
3. `(#N)` is appended to the title automatically — don't add it yourself
4. Do the work, reference `#N` in commit messages
5. Check it off `- [x]` → issue is closed, changelog entry is generated from `changelog:` text
6. Item stays in the Done section as a record

**Commits without an issue:** If a commit message doesn't reference `#N`,
a retroactive issue is created, assigned to you, and closed automatically.

**Who reads what:**

| Artifact | Audience | Tense | Voice |
|----------|----------|-------|-------|
| todo.md | Team | Future | "Add sound toggle" |
| GitHub Issues | Developers | Future→Past | Technical: files, systems, APIs |
| Commit messages | Developers | Past | Technical: what changed and why |
| Changelog | Players | Past | "You can now mute the soundtrack" |

---

## Planned Features

- [ ] Add sound toggle / mute button
  - issue: Add a mute toggle to AudioManager. Persist preference in localStorage alongside save data. Add a UI button in GameScene (speaker icon via Pixi.Graphics). Wire to AudioManager.setMuted(). Should suspend/resume AudioContext.
  - changelog: Added a mute button so you can silence the ambient soundtrack.
  - tag: new

- [ ] Visual themes for enlightenment tiers
  - issue: Swap background gradient, particle colors, and mandala palette at each enlightenment tier (Awakening, Bodhi, Nirvana). Define color schemes in config.ts. Apply in GameScene.update() based on state.enlightenment.
  - changelog: The world around you shifts as you awaken — new colors and atmosphere at each stage of enlightenment.
  - tag: new

- [ ] Particle effects on karma milestones
  - issue: Trigger a burst of golden particles at karma thresholds (1k, 5k, 10k, 50k, 100k, 200k). Use existing ParticleField.burst(). Track last celebrated milestone in GameState to avoid re-triggering.
  - changelog: Celebratory particle bursts when you hit major karma milestones.
  - tag: improved

- [ ] Leaderboard (total karma across players)
  - issue: Needs a backend service — out of scope for client-only MVP. Consider a simple Cloudflare Worker + KV store. POST score on Nirvana completion, GET top 50. Display in a new LeaderboardScene.
  - changelog: See how your spiritual journey compares — a global leaderboard for total karma earned.
  - tag: new

- [ ] Tutorial / onboarding overlay for new players
  - issue: Show a semi-transparent overlay on first load (check localStorage flag). Highlight Feed/Repair buttons, explain karma/wealth, point to the upgrade panel. Dismiss on tap. Use Pixi.Graphics overlay + Text nodes.
  - changelog: A quick guided tour for new players that explains the basics of survival and karma.
  - tag: new

- [ ] Save export / import (JSON download)
  - issue: Add export button that calls saveManager.export() → JSON.stringify(state) → download via Blob URL. Import button reads a file input, validates version, and loads via saveManager.import(). Add to GameScene UI.
  - changelog: Export your save to a file and import it on another device — never lose your progress.
  - tag: new

- [ ] Prestige system beyond Nirvana (New Game+)
  - issue: After Nirvana victory, offer "New Cycle" that resets everything but grants a permanent prestige multiplier. Track prestige level in GameState. Multiply all karma gains by 1 + (prestige * 0.5). New visual flair per prestige level.
  - changelog: Achieved Nirvana? Start a New Cycle with permanent bonuses and prove your mastery again.
  - tag: new

- [ ] Accessibility: screen reader support for key actions
  - issue: Add ARIA live regions outside the canvas for key state changes (need warnings, karma milestones, death/rebirth). Use a hidden DOM div updated by GameEngine. Won't replace canvas UI but provides screen reader narration of important events.
  - changelog: Screen reader announcements for key moments — karma milestones, need warnings, death and rebirth.
  - tag: improved

- [ ] Mobile haptic feedback on events
  - issue: Call navigator.vibrate() on Feed, Repair, Rebirth, death, and milestone events. Gate behind a feature check. Add a haptics toggle to settings (persisted in localStorage). Keep vibration patterns short (50-100ms).
  - changelog: Feel the game — subtle vibrations on your phone when you feed, repair, or reach a milestone.
  - tag: improved

## Bugs

## Done

