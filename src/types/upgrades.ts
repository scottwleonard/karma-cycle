export interface SoulUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effect: (level: number) => number;
  effectLabel: (level: number) => string;
}

export type LifeUpgradeCategory = 'survival' | 'spiritual' | 'material';

export interface LifeUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: LifeUpgradeCategory;
  /** Multiplier applied to wealth rate (>1 = more wealth) */
  wealthMultiplier?: number;
  /** Multiplier applied to karma rate (<1 = slower karma) */
  karmaMultiplier?: number;
  /** Flat karma drain per second (positive = draining karma) */
  karmaDrain?: number;
  /** Multiplier applied to negative life event weights (<1 = less likely) */
  negativeEventWeightMultiplier?: number;
}

export const SOUL_UPGRADES: SoulUpgradeDefinition[] = [
  {
    id: 'enlightened_mind',
    name: 'Enlightened Mind',
    description: 'Increases karma earning rate',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 3,
    effect: (level) => 1 + level * 0.25,
    effectLabel: (level) => `Karma rate +${level * 25}%`,
  },
  {
    id: 'resilient_body',
    name: 'Resilient Body',
    description: 'Reduces physical need drain rates',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 3,
    effect: (level) => 1 - level * 0.1,
    effectLabel: (level) => `Need drain -${level * 10}%`,
  },
  {
    id: 'worldly_fortune',
    name: 'Worldly Fortune',
    description: 'Start each life with bonus wealth',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 3,
    effect: (level) => level * 50,
    effectLabel: (level) => `Start with ${level * 50} wealth`,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Earn karma while offline',
    maxLevel: 5,
    baseCost: 75,
    costMultiplier: 2,
    effect: (level) => level * 0.2,
    effectLabel: (level) => `${level * 20}% offline karma`,
  },
  {
    id: 'auto_feed',
    name: 'Auto Feed',
    description: 'Automatically feed when hunger drops below 50%',
    maxLevel: 1,
    baseCost: 500,
    costMultiplier: 1,
    effect: (level) => level,
    effectLabel: (_level) => 'Unlocked',
  },
  {
    id: 'auto_repair',
    name: 'Auto Repair',
    description: 'Automatically repair when shelter drops below 50%',
    maxLevel: 1,
    baseCost: 500,
    costMultiplier: 1,
    effect: (level) => level,
    effectLabel: (_level) => 'Unlocked',
  },
];

export const LIFE_UPGRADES: LifeUpgradeDefinition[] = [
  // === SURVIVAL — keep you alive, no karma impact ===
  {
    id: 'better_farm',
    name: 'Better Farm',
    description: 'Hunger drain -20%',
    cost: 10,
    category: 'survival',
  },
  {
    id: 'sturdy_walls',
    name: 'Sturdy Walls',
    description: 'Shelter drain -20%',
    cost: 20,
    category: 'survival',
  },
  {
    id: 'herbalist',
    name: 'Herbalist',
    description: 'Health regen +100%',
    cost: 40,
    category: 'survival',
  },

  {
    id: 'self_defense',
    name: 'Self Defense',
    description: 'Bad events 30% less likely',
    cost: 35,
    category: 'survival',
    negativeEventWeightMultiplier: 0.7,
  },
  {
    id: 'iron_locks',
    name: 'Iron Locks',
    description: 'Secure your home — bad events 40% less likely',
    cost: 60,
    category: 'survival',
    negativeEventWeightMultiplier: 0.6,
  },
  {
    id: 'spirit_ward',
    name: 'Spirit Ward',
    description: 'Karma shields you — bad events 50% less likely · Karma +10%',
    cost: 100,
    category: 'spiritual',
    karmaMultiplier: 1.1,
    negativeEventWeightMultiplier: 0.5,
  },

  // === SPIRITUAL — boost karma ===
  {
    id: 'meditation_mat',
    name: 'Meditation Mat',
    description: 'Karma rate +30%',
    cost: 50,
    category: 'spiritual',
    karmaMultiplier: 1.3,
  },

  // === MATERIAL — boost wealth, but slow or drain karma ===
  {
    id: 'merchant',
    name: 'Merchant',
    description: 'Wealth +50% · Karma -15%',
    cost: 30,
    category: 'material',
    wealthMultiplier: 1.5,
    karmaMultiplier: 0.85,
  },
  {
    id: 'market_stall',
    name: 'Market Stall',
    description: 'Wealth +80% · Karma -25%',
    cost: 60,
    category: 'material',
    wealthMultiplier: 1.8,
    karmaMultiplier: 0.75,
  },
  {
    id: 'money_lender',
    name: 'Money Lender',
    description: 'Wealth +120% · Karma -40%',
    cost: 100,
    category: 'material',
    wealthMultiplier: 2.2,
    karmaMultiplier: 0.6,
  },
  {
    id: 'tax_collector',
    name: 'Tax Collector',
    description: 'Wealth +200% · Drains 0.5 karma/s',
    cost: 180,
    category: 'material',
    wealthMultiplier: 3.0,
    karmaMultiplier: 0.5,
    karmaDrain: 0.5,
  },
  {
    id: 'slave_trade',
    name: 'Slave Trade',
    description: 'Wealth +400% · Drains 2.0 karma/s',
    cost: 300,
    category: 'material',
    wealthMultiplier: 5.0,
    karmaMultiplier: 0.2,
    karmaDrain: 2.0,
  },
  {
    id: 'war_profiteer',
    name: 'War Profiteer',
    description: 'Wealth +700% · Drains 5.0 karma/s',
    cost: 500,
    category: 'material',
    wealthMultiplier: 8.0,
    karmaMultiplier: 0.0,
    karmaDrain: 5.0,
  },
];

export function getSoulUpgradeCost(def: SoulUpgradeDefinition, currentLevel: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}
