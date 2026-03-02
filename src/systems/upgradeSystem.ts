import type { GameState } from '../state/GameState';
import {
  getSoulUpgradeCost,
  type SoulUpgradeDefinition,
  type LifeUpgradeDefinition,
} from '../types/upgrades';

export function getSoulUpgradeLevel(state: GameState, upgradeId: string): number {
  const upgrade = state.soulUpgrades.find((u) => u.id === upgradeId);
  return upgrade ? upgrade.level : 0;
}

export function canBuySoulUpgrade(state: GameState, def: SoulUpgradeDefinition): boolean {
  const currentLevel = getSoulUpgradeLevel(state, def.id);
  if (currentLevel >= def.maxLevel) return false;
  const cost = getSoulUpgradeCost(def, currentLevel);
  return state.karma >= cost;
}

export function buySoulUpgrade(state: GameState, def: SoulUpgradeDefinition): boolean {
  if (!canBuySoulUpgrade(state, def)) return false;

  const currentLevel = getSoulUpgradeLevel(state, def.id);
  const cost = getSoulUpgradeCost(def, currentLevel);
  state.karma -= cost;

  const existing = state.soulUpgrades.find((u) => u.id === def.id);
  if (existing) {
    existing.level++;
  } else {
    state.soulUpgrades.push({ id: def.id, level: 1 });
  }

  return true;
}

export function canBuyLifeUpgrade(state: GameState, def: LifeUpgradeDefinition): boolean {
  if (state.lifeUpgrades.some((u) => u.id === def.id && u.purchased)) return false;
  // Material upgrades locked during Nirvana challenge
  if (state.nirvanaChallengeActive && def.category === 'material') return false;
  return state.wealth >= def.cost;
}

export function buyLifeUpgrade(state: GameState, def: LifeUpgradeDefinition): boolean {
  if (!canBuyLifeUpgrade(state, def)) return false;

  state.wealth -= def.cost;
  const existing = state.lifeUpgrades.find((u) => u.id === def.id);
  if (existing) {
    existing.purchased = true;
  } else {
    state.lifeUpgrades.push({ id: def.id, purchased: true });
  }

  return true;
}
