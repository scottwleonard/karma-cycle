import type { GameState } from '../state/GameState';

const BLESSING_DURATION = 60; // seconds

export const BLESSING_INFO = {
  nourish: { label: 'Nourish', desc: 'Hunger & shelter drain paused', cost: 50 },
  inspire: { label: 'Inspire', desc: '2x karma generation', cost: 100 },
  protect: { label: 'Protect', desc: 'Health can\'t drop below 50', cost: 75 },
} as const;

export type BlessingType = keyof typeof BLESSING_INFO;

/** Add a new blessing to the player's active list */
export function applyBlessing(state: GameState, type: BlessingType, fromName: string): void {
  // Replace existing blessing of same type (don't stack)
  state.activeBlessings = state.activeBlessings.filter((b) => b.type !== type);
  state.activeBlessings.push({ type, fromName, remaining: BLESSING_DURATION });
}

/** Tick down active blessing durations, remove expired */
export function update(dt: number, state: GameState): void {
  for (let i = state.activeBlessings.length - 1; i >= 0; i--) {
    state.activeBlessings[i].remaining -= dt;
    if (state.activeBlessings[i].remaining <= 0) {
      state.activeBlessings.splice(i, 1);
    }
  }
}

/** Check if player has an active blessing of a given type */
export function hasBlessing(state: GameState, type: BlessingType): boolean {
  return state.activeBlessings.some((b) => b.type === type);
}

/** Get the karma multiplier from active blessings (1.0 if no inspire) */
export function getKarmaMultiplier(state: GameState): number {
  return hasBlessing(state, 'inspire') ? 2.0 : 1.0;
}

/** Get the need drain multiplier from active blessings (0 if nourish active) */
export function getNeedDrainMultiplier(state: GameState): number {
  return hasBlessing(state, 'nourish') ? 0 : 1;
}

/** Get the minimum health floor from active blessings (50 if protect, 0 otherwise) */
export function getHealthFloor(state: GameState): number {
  return hasBlessing(state, 'protect') ? 50 : 0;
}
