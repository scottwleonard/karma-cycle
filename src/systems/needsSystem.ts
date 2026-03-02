import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { clamp } from '../utils/math';
import { getSoulUpgradeLevel } from './upgradeSystem';

export function update(dt: number, state: GameState): void {
  if (!state.isAlive) return;

  const lifeMinutes = state.lifeTimeElapsed / 60;
  const resilientLevel = getSoulUpgradeLevel(state, 'resilient_body');
  const drainReduction = 1 - resilientLevel * 0.1;

  // Hunger drain
  const hungerCfg = CONFIG.needs.hunger;
  let hungerDrain = (hungerCfg.baseDrain + hungerCfg.drainScaling * lifeMinutes) * drainReduction;
  if (state.lifeUpgrades.some((u) => u.id === 'better_farm' && u.purchased)) {
    hungerDrain *= 0.8;
  }
  state.needs.hunger = clamp(state.needs.hunger - hungerDrain * dt, 0, 100);

  // Shelter drain
  const shelterCfg = CONFIG.needs.shelter;
  let shelterDrain = (shelterCfg.baseDrain + shelterCfg.drainScaling * lifeMinutes) * drainReduction;
  if (state.lifeUpgrades.some((u) => u.id === 'sturdy_walls' && u.purchased)) {
    shelterDrain *= 0.8;
  }
  state.needs.shelter = clamp(state.needs.shelter - shelterDrain * dt, 0, 100);

  // Health
  const healthCfg = CONFIG.needs.health;
  let healthDelta = 0;

  // Damage from depleted needs
  if (state.needs.hunger <= 0) {
    healthDelta -= hungerCfg.healthDrain;
  }
  if (state.needs.shelter <= 0) {
    healthDelta -= shelterCfg.healthDrain;
  }

  // Regen when needs are above threshold
  if (state.needs.hunger > healthCfg.regenThreshold && state.needs.shelter > healthCfg.regenThreshold) {
    let regenRate = healthCfg.regenRate;
    if (state.lifeUpgrades.some((u) => u.id === 'herbalist' && u.purchased)) {
      regenRate *= 2;
    }
    healthDelta += regenRate;
  }

  state.needs.health = clamp(state.needs.health + healthDelta * dt, 0, 100);
}

export function getHungerDrainRate(state: GameState): number {
  const lifeMinutes = state.lifeTimeElapsed / 60;
  const resilientLevel = getSoulUpgradeLevel(state, 'resilient_body');
  const drainReduction = 1 - resilientLevel * 0.1;
  let rate = (CONFIG.needs.hunger.baseDrain + CONFIG.needs.hunger.drainScaling * lifeMinutes) * drainReduction;
  if (state.lifeUpgrades.some((u) => u.id === 'better_farm' && u.purchased)) {
    rate *= 0.8;
  }
  return rate;
}

export function getShelterDrainRate(state: GameState): number {
  const lifeMinutes = state.lifeTimeElapsed / 60;
  const resilientLevel = getSoulUpgradeLevel(state, 'resilient_body');
  const drainReduction = 1 - resilientLevel * 0.1;
  let rate = (CONFIG.needs.shelter.baseDrain + CONFIG.needs.shelter.drainScaling * lifeMinutes) * drainReduction;
  if (state.lifeUpgrades.some((u) => u.id === 'sturdy_walls' && u.purchased)) {
    rate *= 0.8;
  }
  return rate;
}

export function getFeedCost(state: GameState): number {
  const lifeMinutes = state.lifeTimeElapsed / 60;
  return Math.ceil(CONFIG.needs.hunger.feedCost * (1 + CONFIG.needs.hunger.feedCostScaling * lifeMinutes));
}

export function getRepairCost(state: GameState): number {
  const lifeMinutes = state.lifeTimeElapsed / 60;
  return Math.ceil(CONFIG.needs.shelter.repairCost * (1 + CONFIG.needs.shelter.repairCostScaling * lifeMinutes));
}
