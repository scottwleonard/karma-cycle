import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { LIFE_UPGRADES } from '../types/upgrades';

export function getWealthPerSecond(state: GameState): number {
  if (!state.isAlive) return 0;

  let rate = CONFIG.wealth.baseRate;

  // Apply wealth multipliers from all purchased life upgrades
  // In karma focus mode, material upgrade wealth bonuses are suspended
  for (const u of state.lifeUpgrades) {
    if (!u.purchased) continue;
    const def = LIFE_UPGRADES.find((d) => d.id === u.id);
    if (def?.wealthMultiplier) {
      if (def.category === 'material' && !state.wealthFocusMode) continue;
      rate *= def.wealthMultiplier;
    }
  }

  return rate;
}

export function update(dt: number, state: GameState): void {
  if (!state.isAlive) return;
  state.wealth += getWealthPerSecond(state) * dt;
}
