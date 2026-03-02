import { Application } from 'pixi.js';
import { CONFIG } from './config';
import { GameEngine } from './engine/GameEngine';
import { SaveManager } from './saves/saveManager';
import { applyOfflineProgress } from './engine/offlineProgress';
import { calculateLayout } from './ui/layout';
import { GameScene } from './ui/scenes/GameScene';

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

  // Load or create game state
  const saveManager = new SaveManager();
  const state = saveManager.load();

  // Create engine
  const engine = new GameEngine(state);

  // Apply offline progress
  const offline = applyOfflineProgress(engine);
  if (offline.offlineSeconds > 5) {
    console.log(
      `Offline for ${Math.floor(offline.offlineSeconds)}s — earned ${offline.karmaEarned.toFixed(1)} karma, ${offline.wealthEarned.toFixed(1)} wealth`,
    );
  }

  // Create layout and scene
  const layout = calculateLayout(app.screen.width, app.screen.height);
  const scene = new GameScene(engine, layout);
  app.stage.addChild(scene);

  // Game loop
  app.ticker.add((ticker) => {
    const dtSeconds = ticker.deltaMS / 1000;
    engine.update(dtSeconds);
    scene.update(dtSeconds);
  });

  // Auto-save
  saveManager.startAutoSave(() => engine.state);

  // Save on exit
  window.addEventListener('beforeunload', () => {
    saveManager.save(engine.state);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    const newLayout = calculateLayout(app.screen.width, app.screen.height);
    scene.x = newLayout.offsetX;
    scene.y = newLayout.offsetY;
    scene.scale.set(newLayout.scale);
  });
}

main().catch(console.error);
