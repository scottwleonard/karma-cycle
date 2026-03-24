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
    saveManager.reset();
  }
  const state = saveManager.load();

  // Prompt for player name if not set
  if (!state.playerName) {
    state.playerName = await showNamePrompt();
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

  // Leaderboard panel (left side of screen)
  const leaderboard = new LeaderboardPanel(engine.state.playerName);
  leaderboard.updateLayout(layout.offsetX);
  leaderboard.start();

  // Submit score periodically — uses banked karma (state.karma)
  const submitScore = () => {
    const s = engine.state;
    leaderboard.submitScore(Math.floor(s.karma), s.lifeNumber, s.enlightenmentTier);
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
    leaderboard.updateLayout(newLayout.offsetX);
  });

  // Auto-reload on new version deploy (save first)
  const versionChecker = new VersionChecker(__BUILD_HASH__, () => {
    saveManager.save(engine.state);
  });
  versionChecker.start();
}

main().catch(console.error);
