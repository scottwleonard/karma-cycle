# Karma Cycle

A meditative idle game about spiritual evolution across multiple lives. Earn karma, manage survival, buy upgrades, die, be reborn, and pursue Nirvana.

Built with [Pixi.js](https://pixijs.com/) and TypeScript. Fully procedural audio. No assets required.

---

## How This Project Is Built

**This game is developed with agentic / vibe coding.** We use [Claude Code](https://docs.anthropic.com/en/docs/claude-code) as the primary development workflow — describing features in natural language and letting the AI write, refactor, and ship code. If you want to contribute, that's the preferred approach.

You *can* open this in VS Code, WebStorm, or whatever IDE you like. The instructions below will get you running. But if you're here to contribute, consider giving agentic coding a try — it's how this project moves fast.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── main.ts                  # Entry point & game loop
├── config.ts                # All tuning parameters
├── audio/
│   └── AudioManager.ts      # Procedural Web Audio API soundtrack
├── engine/
│   ├── GameEngine.ts         # Core game loop & state management
│   └── offlineProgress.ts    # Offline karma calculation
├── saves/
│   ├── saveManager.ts        # Auto-save (30s) & manual save
│   ├── serializer.ts         # State serialization
│   └── localStorage.ts       # Browser storage adapter
├── state/
│   ├── GameState.ts          # Type definitions
│   └── createDefaultState.ts # Initial state factory
├── systems/                  # Game logic modules
│   ├── karmaSystem.ts        # Karma generation & drain
│   ├── wealthSystem.ts       # Income & spending
│   ├── needsSystem.ts        # Hunger, shelter, health
│   ├── deathSystem.ts        # Death handling & karma penalty
│   ├── rebirthSystem.ts      # Life reset & karma multiplier
│   ├── enlightenmentSystem.ts# Awakening, Bodhi, Nirvana
│   ├── lifeEventsSystem.ts   # Random narrative events
│   └── upgradeSystem.ts      # Soul & life upgrade logic
├── types/
│   ├── upgrades.ts           # Upgrade definitions
│   └── events.ts             # Event type definitions
├── ui/
│   ├── scenes/
│   │   └── GameScene.ts      # Main game view
│   ├── components/           # Pixi.js UI components
│   │   ├── ActionButton.ts
│   │   ├── NeedBar.ts
│   │   ├── ResourceCounter.ts
│   │   ├── Mandala.ts
│   │   ├── ParticleField.ts
│   │   ├── NumberPop.ts
│   │   ├── EventLog.ts
│   │   └── Panel.ts
│   └── layout.ts             # Responsive positioning
└── utils/
    ├── math.ts
    ├── time.ts
    └── format.ts
```

---

## Gameplay

You live, die, and live again — accumulating karma across lifetimes.

**Core loop:** Earn karma passively. Spend wealth to stay alive (feed hunger, repair shelter). Buy upgrades to specialize your life path. Die. Keep a fraction of your karma. Be reborn stronger.

**Progression:**
- **Awakening** — unlocked at 10,000 karma
- **Bodhi** — unlocked at 50,000 karma
- **Nirvana** — max all soul upgrades, reach 200,000 karma, then survive 5 minutes without dying

**Two upgrade paths per life:**
- **Spiritual** — boost karma generation, harder survival
- **Material** — boost wealth, but drain karma

**Soul upgrades** persist across lives. **Life upgrades** reset on death.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Rendering | Pixi.js 8 |
| Language | TypeScript (ES2022, strict) |
| Build | Vite 7 |
| Audio | Web Audio API (fully procedural, no audio files) |
| Storage | Browser localStorage |
| Target | Mobile-first (1080x1920 reference), responsive |

---

## Contributing

**Preferred workflow: agentic coding with Claude Code.** Describe what you want to build or fix in natural language. The `CLAUDE.md` file in this repo configures the AI coding environment.

If you prefer working in an IDE manually, that's fine too — just follow standard fork-and-PR workflow:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. `npm run build` to verify TypeScript compiles clean
5. Open a PR

Tests use [Vitest](https://vitest.dev/) — run with `npm test`.

### gstack Setup

This project uses [gstack](https://github.com/garrytan/gstack) skills for Claude Code. To install:

```bash
git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup
```

Requires [bun](https://bun.sh/) (`curl -fsSL https://bun.sh/install | bash`).

See the gstack section in `CLAUDE.md` for available skills and conventions.

---

## License

Private project. All rights reserved.
