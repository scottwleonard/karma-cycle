import type { GameState } from '../state/GameState';
import { clamp } from '../utils/math';
import { LIFE_UPGRADES } from '../types/upgrades';
import { CONFIG } from '../config';

export type EventSeverity = 'positive' | 'neutral' | 'negative';

export interface LifeEventResult {
  text: string;
  severity: EventSeverity;
  /** Optional stat color to use in the event log instead of severity color */
  color?: number;
}

interface LifeEventDefinition {
  text: string;
  severity: EventSeverity;
  /** Weight relative to other events (higher = more common) */
  weight: number;
  /** Minimum life seconds before this can trigger */
  minLifeTime?: number;
  /** Optional stat color override for event log display */
  color?: number;
  /** Apply effect to state, return display string suffix */
  apply: (state: GameState) => string;
}

const LIFE_EVENTS: LifeEventDefinition[] = [
  // === NEGATIVE — misfortune ===
  {
    text: 'Tripped on a rock and hurt your knee',
    severity: 'negative',
    weight: 8,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 8, 0, 100); return 'Health -8'; },
  },
  {
    text: 'Food went rotten overnight',
    severity: 'negative',
    weight: 7,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger - 12, 0, 100); return 'Hunger -12'; },
  },
  {
    text: 'A storm damaged your shelter',
    severity: 'negative',
    weight: 6,
    color: CONFIG.display.shelterColor,
    apply: (s) => { s.needs.shelter = clamp(s.needs.shelter - 15, 0, 100); return 'Shelter -15'; },
  },
  {
    text: 'Pickpocketed by a street urchin',
    severity: 'negative',
    weight: 6,
    color: CONFIG.display.wealthColor,
    apply: (s) => { const loss = Math.min(s.wealth, Math.max(5, s.wealth * 0.1)); s.wealth -= loss; return `Wealth -${Math.floor(loss)}`; },
  },
  {
    text: 'Caught a nasty cold',
    severity: 'negative',
    weight: 5,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 12, 0, 100); return 'Health -12'; },
  },
  {
    text: 'Bitten by a stray dog',
    severity: 'negative',
    weight: 4,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 6, 0, 100); return 'Health -6'; },
  },
  {
    text: 'Ate something suspicious from the market',
    severity: 'negative',
    weight: 5,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger - 8, 0, 100); s.needs.health = clamp(s.needs.health - 5, 0, 100); return 'Hunger -8, Health -5'; },
  },
  {
    text: 'Roof is leaking again',
    severity: 'negative',
    weight: 5,
    color: CONFIG.display.shelterColor,
    apply: (s) => { s.needs.shelter = clamp(s.needs.shelter - 10, 0, 100); return 'Shelter -10'; },
  },
  {
    text: 'Taxed by the local lord',
    severity: 'negative',
    weight: 4,
    minLifeTime: 30,
    color: CONFIG.display.wealthColor,
    apply: (s) => { const loss = Math.min(s.wealth, Math.max(8, s.wealth * 0.15)); s.wealth -= loss; return `Wealth -${Math.floor(loss)}`; },
  },
  {
    text: 'Got into a fight at the tavern',
    severity: 'negative',
    weight: 3,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 15, 0, 100); return 'Health -15'; },
  },
  {
    text: 'Your livestock escaped',
    severity: 'negative',
    weight: 3,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger - 20, 0, 100); return 'Hunger -20'; },
  },
  {
    text: 'Scammed by a traveling merchant',
    severity: 'negative',
    weight: 3,
    minLifeTime: 60,
    color: CONFIG.display.wealthColor,
    apply: (s) => { const loss = Math.min(s.wealth, Math.max(15, s.wealth * 0.2)); s.wealth -= loss; return `Wealth -${Math.floor(loss)}`; },
  },
  {
    text: 'Twisted your ankle on the stairs',
    severity: 'negative',
    weight: 6,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 5, 0, 100); return 'Health -5'; },
  },
  {
    text: 'Mice got into the grain stores',
    severity: 'negative',
    weight: 5,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger - 10, 0, 100); return 'Hunger -10'; },
  },
  {
    text: 'Fell ill with a fever',
    severity: 'negative',
    weight: 3,
    minLifeTime: 45,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health - 20, 0, 100); return 'Health -20'; },
  },

  // === POSITIVE — good fortune ===
  {
    text: 'Found some wild berries',
    severity: 'positive',
    weight: 6,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger + 10, 0, 100); return 'Hunger +10'; },
  },
  {
    text: 'A stranger shared a meal with you',
    severity: 'positive',
    weight: 5,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger + 15, 0, 100); return 'Hunger +15'; },
  },
  {
    text: 'Found coins on the road',
    severity: 'positive',
    weight: 5,
    color: CONFIG.display.wealthColor,
    apply: (s) => { const gain = 3 + Math.random() * 7; s.wealth += gain; return `Wealth +${Math.floor(gain)}`; },
  },
  {
    text: 'Slept incredibly well last night',
    severity: 'positive',
    weight: 5,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health + 8, 0, 100); return 'Health +8'; },
  },
  {
    text: 'A healer passed through and treated you',
    severity: 'positive',
    weight: 3,
    color: CONFIG.display.healthColor,
    apply: (s) => { s.needs.health = clamp(s.needs.health + 20, 0, 100); return 'Health +20'; },
  },
  {
    text: 'Helped a neighbor and they paid you',
    severity: 'positive',
    weight: 4,
    apply: (s) => { const gain = 5 + Math.random() * 10; s.wealth += gain; s.currentKarma += 2; return `Wealth +${Math.floor(gain)}, Karma +2`; },
  },
  {
    text: 'Beautiful sunrise filled you with peace',
    severity: 'positive',
    weight: 4,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 5; return 'Karma +5'; },
  },
  {
    text: 'A kind merchant gave you a discount',
    severity: 'positive',
    weight: 4,
    color: CONFIG.display.wealthColor,
    apply: (s) => { s.wealth += 5; return 'Wealth +5'; },
  },
  {
    text: 'Your garden produced an abundant harvest',
    severity: 'positive',
    weight: 3,
    minLifeTime: 20,
    color: CONFIG.display.hungerColor,
    apply: (s) => { s.needs.hunger = clamp(s.needs.hunger + 20, 0, 100); return 'Hunger +20'; },
  },
  {
    text: 'Fixed a drafty window, shelter feels solid',
    severity: 'positive',
    weight: 4,
    color: CONFIG.display.shelterColor,
    apply: (s) => { s.needs.shelter = clamp(s.needs.shelter + 12, 0, 100); return 'Shelter +12'; },
  },
  {
    text: 'Meditated under a tree and found clarity',
    severity: 'positive',
    weight: 3,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 8; return 'Karma +8'; },
  },

  // === NEUTRAL — flavor with tiny effects ===
  {
    text: 'Watched clouds drift by',
    severity: 'neutral',
    weight: 6,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 1; return 'Karma +1'; },
  },
  {
    text: 'Heard a rumor about buried treasure',
    severity: 'neutral',
    weight: 5,
    apply: () => 'Nothing happened',
  },
  {
    text: 'A cat followed you around all day',
    severity: 'neutral',
    weight: 5,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 1; return 'Karma +1'; },
  },
  {
    text: 'Had a strange dream about past lives',
    severity: 'neutral',
    weight: 4,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 2; return 'Karma +2'; },
  },
  {
    text: 'It rained all day. Stayed inside.',
    severity: 'neutral',
    weight: 6,
    apply: () => 'Nothing happened',
  },
  {
    text: 'Argued with a neighbor about a fence',
    severity: 'neutral',
    weight: 4,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma = Math.max(0, s.currentKarma - 1); return 'Karma -1'; },
  },
  {
    text: 'Saw a shooting star',
    severity: 'neutral',
    weight: 3,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 3; return 'Karma +3'; },
  },
  {
    text: 'Overheard monks chanting in the distance',
    severity: 'neutral',
    weight: 3,
    color: CONFIG.display.karmaColor,
    apply: (s) => { s.currentKarma += 2; return 'Karma +2'; },
  },
];

/**
 * Returns the combined negative event weight multiplier from purchased life upgrades.
 */
function getNegativeEventMultiplier(state: GameState): number {
  let multiplier = 1;
  for (const def of LIFE_UPGRADES) {
    if (
      def.negativeEventWeightMultiplier !== undefined &&
      state.lifeUpgrades.some((u) => u.id === def.id && u.purchased)
    ) {
      multiplier *= def.negativeEventWeightMultiplier;
    }
  }
  return multiplier;
}

/**
 * Picks a weighted random event from the pool, filtered by min life time.
 * Negative events have their weights scaled down by any purchased protection upgrades.
 */
function pickEvent(state: GameState): LifeEventDefinition {
  const negMult = getNegativeEventMultiplier(state);
  const eligible = LIFE_EVENTS.filter(
    (e) => !e.minLifeTime || state.lifeTimeElapsed >= e.minLifeTime,
  );
  const weights = eligible.map((e) => e.severity === 'negative' ? e.weight * negMult : e.weight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

// --- System state (not saved — ephemeral per session) ---
let eventTimer = 0;
let nextEventDelay = 2 + Math.random() * 3; // 2-5 seconds between events

/**
 * Call each tick. Returns a LifeEventResult when an event fires, null otherwise.
 */
export function update(dt: number, state: GameState): LifeEventResult | null {
  if (!state.isAlive) return null;

  eventTimer += dt;
  if (eventTimer < nextEventDelay) return null;

  // Fire event
  eventTimer = 0;
  nextEventDelay = 2 + Math.random() * 3;

  const event = pickEvent(state);
  const effectText = event.apply(state);

  return {
    text: `${event.text}  (${effectText})`,
    severity: event.severity,
    color: event.color,
  };
}

/**
 * Reset timer (call on rebirth / death rebirth).
 */
export function reset(): void {
  eventTimer = 0;
  nextEventDelay = 2 + Math.random() * 3;
}
