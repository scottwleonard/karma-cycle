import { Application } from 'pixi.js';
import { CONFIG } from './config';
import { GameEngine } from './engine/GameEngine';
import { SaveManager } from './saves/saveManager';
import { applyOfflineProgress } from './engine/offlineProgress';
import { calculateLayout } from './ui/layout';
import { GameScene } from './ui/scenes/GameScene';
import { AudioManager } from './audio/AudioManager';
import { showNamePrompt } from './ui/components/NamePrompt';
import { LeaderboardPanel } from './ui/components/LeaderboardPanel';
import { VersionChecker } from './ui/VersionChecker';
import { loadAvatarLocal } from './ui/avatarUtils';
import { BLESSING_INFO, applyBlessing } from './systems/blessingsSystem';
import type { BlessingType } from './systems/blessingsSystem';

async function main() {
  const app = new Application();
  await app.init({
    background: CONFIG.display.bgColor,
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const container = document.getElementById('app');
  if (!container) throw new Error('No #app element found');
  container.appendChild(app.canvas);

  // Load or create game state (reset flag clears save before loading)
  const saveManager = new SaveManager();
  if (sessionStorage.getItem('karma_cycle_reset')) {
    sessionStorage.removeItem('karma_cycle_reset');
    const oldState = saveManager.load();
    const playerName = oldState.playerName;
    saveManager.reset();
    const freshState = saveManager.load();
    freshState.playerName = playerName;
    saveManager.save(freshState);
  }
  const state = saveManager.load();

  // Prompt for player name if not set
  if (!state.playerName) {
    const name = await showNamePrompt();
    state.playerName = name ?? 'Anonymous';
    saveManager.save(state);
  }

  // Create engine
  const engine = new GameEngine(state);

  // Apply offline progress
  const offline = applyOfflineProgress(engine);
  if (offline.offlineSeconds > 5) {
    console.log(
      `Offline for ${Math.floor(offline.offlineSeconds)}s — earned ${offline.karmaEarned.toFixed(1)} karma, ${offline.wealthEarned.toFixed(1)} wealth`,
    );
  }

  // Create layout, audio, and scene
  const layout = calculateLayout(app.screen.width, app.screen.height);
  const audioManager = new AudioManager();
  audioManager.loadMutePreference();
  const scene = new GameScene(engine, layout, audioManager);
  app.stage.addChild(scene);
  scene.updateActivityLogLayout(layout);

  // Leaderboard panel (left side of screen)
  const leaderboard = new LeaderboardPanel(engine.state.playerName);
  leaderboard.updateLayout(layout.leftPanel);
  leaderboard.start();

  // Bless other players from leaderboard
  leaderboard.onBless = async (toName, type) => {
    const s = engine.state;
    const cost = BLESSING_INFO[type as BlessingType].cost;
    if (s.wealth < cost) {
      scene.showToast(`Not enough wealth (need ${cost})`);
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/bless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: s.playerName, to: toName, type }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; cost?: number; karmaReward?: number };
      if (data.success) {
        s.wealth -= cost;
        s.currentKarma += data.karmaReward ?? 0;
        scene.showToast(`Blessed ${toName} with ${BLESSING_INFO[type as BlessingType].label}! +${data.karmaReward} karma`);
      } else {
        scene.showToast(data.error ?? 'Blessing failed');
      }
    } catch {
      scene.showToast('Network error');
    }
  };

  // Poll for incoming blessings every 30s
  const pollBlessings = async () => {
    const name = engine.state.playerName;
    if (!name) return;
    try {
      const res = await fetch(`/.netlify/functions/bless?player=${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const blessings = (await res.json()) as { from_name: string; type: string }[];
      for (const b of blessings) {
        const type = b.type as BlessingType;
        if (BLESSING_INFO[type]) {
          applyBlessing(engine.state, type, b.from_name);
          scene.showToast(`${b.from_name} blessed you with ${BLESSING_INFO[type].label}!`);
        }
      }
    } catch { /* silent */ }
  };
  setInterval(pollBlessings, 30_000);
  pollBlessings(); // check on load

  // Sync name changes to leaderboard
  scene.onNameChange = (newName) => {
    leaderboard.setPlayerName(newName);
  };

  // Submit score periodically — total karma = banked + current life
  const submitScore = () => {
    const s = engine.state;
    if (!s.playerName) return;
    const avatar = loadAvatarLocal();
    const totalKarma = Math.floor(s.karma + s.currentKarma);
    const wealth = Math.floor(s.wealth);
    leaderboard.submitScore(totalKarma, wealth, s.lifeNumber, s.enlightenmentTier, avatar);
  };

  // Game loop
  app.ticker.add((ticker) => {
    const dtSeconds = ticker.deltaMS / 1000;
    engine.update(dtSeconds);
    scene.update(dtSeconds);
  });

  // Submit scores every 10s for real-time leaderboard
  setInterval(() => submitScore(), 10_000);
  saveManager.startAutoSave(() => engine.state);

  // Save on exit (skip if an import is in progress)
  window.addEventListener('beforeunload', () => {
    if (sessionStorage.getItem('karma_cycle_importing')) {
      sessionStorage.removeItem('karma_cycle_importing');
      return;
    }
    submitScore();
    saveManager.save(engine.state);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    const newLayout = calculateLayout(app.screen.width, app.screen.height);
    scene.x = newLayout.offsetX;
    scene.y = newLayout.offsetY;
    scene.scale.set(newLayout.scale);
    leaderboard.updateLayout(newLayout.leftPanel);
    scene.updateActivityLogLayout(newLayout);
  });

  // Auto-reload on new version deploy (save first)
  const versionChecker = new VersionChecker(__BUILD_HASH__, () => {
    saveManager.save(engine.state);
  });
  versionChecker.start();
}

main().catch(console.error);
