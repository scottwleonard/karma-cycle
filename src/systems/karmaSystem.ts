import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { getSoulUpgradeLevel } from './upgradeSystem';
import { LIFE_UPGRADES } from '../types/upgrades';

export function getKarmaPerSecond(state: GameState): number {
  if (!state.isAlive) return 0;

  const cfg = CONFIG.karma;
  const lifeTimeMultiplier = 1 + Math.log(1 + state.lifeTimeElapsed / cfg.lifeTimeScaling);
  const soulMultiplier = 1 + Math.sqrt(state.karma) * cfg.soulMultiplierCoeff;

  let upgradeMultiplier = 1;

  // Soul upgrade: Enlightened Mind
  const enlightenedLevel = getSoulUpgradeLevel(state, 'enlightened_mind');
  upgradeMultiplier *= 1 + enlightenedLevel * 0.25;

  // Apply karma multipliers from all purchased life upgrades
  // This handles both spiritual (+karma) and material (-karma) upgrades
  for (const u of state.lifeUpgrades) {
    if (!u.purchased) continue;
    const def = LIFE_UPGRADES.find((d) => d.id === u.id);
    if (def?.karmaMultiplier !== undefined) {
      upgradeMultiplier *= def.karmaMultiplier;
    }
  }

  // Need debuffs
  const { needs } = state;
  const hungerCfg = CONFIG.needs.hunger;
  const shelterCfg = CONFIG.needs.shelter;
  const healthCfg = CONFIG.needs.health;

  if (needs.hunger < hungerCfg.lowThreshold) {
    upgradeMultiplier *= 1 - hungerCfg.karmaDebuff;
  }
  if (needs.shelter < shelterCfg.lowThreshold) {
    upgradeMultiplier *= 1 - shelterCfg.karmaDebuff;
  }
  if (needs.health < healthCfg.lowThreshold) {
    upgradeMultiplier *= 1 - healthCfg.karmaDebuff;
  }

  // Karma bank bonus — accelerates late-game once all soul upgrades are maxed
  const bankMultiplier =
    state.bankedKarma > 0
      ? 1 + Math.sqrt(state.bankedKarma) * CONFIG.karmaBank.coefficient
      : 1;

  return cfg.baseRate * lifeTimeMultiplier * soulMultiplier * state.karmaMultiplier * upgradeMultiplier * bankMultiplier;
}

/**
 * Returns the total flat karma drain per second from material upgrades.
 * This is separate from the rate multiplier — it directly subtracts karma.
 */
export function getKarmaDrainPerSecond(state: GameState): number {
  let drain = 0;
  for (const u of state.lifeUpgrades) {
    if (!u.purchased) continue;
    const def = LIFE_UPGRADES.find((d) => d.id === u.id);
    if (def?.karmaDrain) {
      drain += def.karmaDrain;
    }
  }
  return drain;
}

/**
 * Net karma rate = generation - drain.
 * Can go negative when material upgrades are actively draining karma.
 */
export function getNetKarmaPerSecond(state: GameState): number {
  return getKarmaPerSecond(state) - getKarmaDrainPerSecond(state);
}

export function update(dt: number, state: GameState): void {
  if (!state.isAlive) return;
  const generation = getKarmaPerSecond(state) * dt;
  const drain = getKarmaDrainPerSecond(state) * dt;
  state.currentKarma = Math.max(0, state.currentKarma + generation - drain);
}
