import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { getSoulUpgradeLevel } from './upgradeSystem';
import { allSoulUpgradesMaxed } from './enlightenmentSystem';
import type { EventBus } from '../types/events';

export function getKarmaMultiplier(lifeNumber: number): number {
  return 1 + Math.log2(1 + lifeNumber) * CONFIG.rebirth.multiplierBase;
}

export function getRebirthKarma(state: GameState): number {
  return state.currentKarma;
}

export function performRebirth(state: GameState, events: EventBus): void {
  if (state.nirvanaChallengeActive) return; // Cannot voluntarily rebirth during Nirvana trial
  const karmaEarned = getRebirthKarma(state);
  state.karma += karmaEarned;

  // Bank karma for late-game acceleration once all soul upgrades are maxed
  if (allSoulUpgradesMaxed(state)) {
    state.bankedKarma += karmaEarned;
  }

  state.lifeNumber++;
  state.karmaMultiplier = getKarmaMultiplier(state.lifeNumber);

  // Reset life state
  state.currentKarma = 0;

  // Starting wealth from Worldly Fortune
  const fortuneLevel = getSoulUpgradeLevel(state, 'worldly_fortune');
  state.wealth = fortuneLevel * 50;

  state.needs.hunger = 100;
  state.needs.shelter = 100;
  state.needs.health = 100;
  state.lifeTimeElapsed = 0;
  state.isAlive = true;
  state.lifeUpgrades = [];

  events.emit({ type: 'rebirth', karmaEarned, lifeNumber: state.lifeNumber });
}

export function performDeathRebirth(state: GameState, _events: EventBus): void {
  // After death, start a new life (karma was already applied with penalty in deathSystem)
  state.lifeNumber++;
  state.karmaMultiplier = getKarmaMultiplier(state.lifeNumber);
  state.currentKarma = 0;

  const fortuneLevel = getSoulUpgradeLevel(state, 'worldly_fortune');
  state.wealth = fortuneLevel * 50;

  state.needs.hunger = 100;
  state.needs.shelter = 100;
  state.needs.health = 100;
  state.lifeTimeElapsed = 0;
  state.isAlive = true;
  state.lifeUpgrades = [];
}
