import type { GameEngine } from './GameEngine';
import { CONFIG } from '../config';

export function applyOfflineProgress(engine: GameEngine): { offlineSeconds: number; karmaEarned: number; wealthEarned: number } {
  const now = Date.now();
  const elapsed = (now - engine.state.lastSaveTimestamp) / 1000;

  if (elapsed < 5) {
    return { offlineSeconds: 0, karmaEarned: 0, wealthEarned: 0 };
  }

  const maxOffline = CONFIG.save.maxOfflineHours * 3600;
  const offlineSeconds = Math.min(elapsed, maxOffline);

  const karmaBefore = engine.state.currentKarma;
  const wealthBefore = engine.state.wealth;

  // Simulate in 1-second chunks
  const steps = Math.floor(offlineSeconds);
  for (let i = 0; i < steps; i++) {
    engine.update(1);
    if (!engine.state.isAlive) break;
  }

  const karmaEarned = engine.state.currentKarma - karmaBefore;
  const wealthEarned = engine.state.wealth - wealthBefore;

  return { offlineSeconds, karmaEarned, wealthEarned };
}
