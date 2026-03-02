import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import type { EventBus } from '../types/events';
import { onNirvanaChallengeDeath, allSoulUpgradesMaxed } from './enlightenmentSystem';

export function update(_dt: number, state: GameState, events: EventBus): void {
  if (!state.isAlive) return;

  if (state.needs.health <= 0) {
    state.isAlive = false;
    const karmaLost = state.currentKarma * CONFIG.karma.deathPenalty;
    const karmaKept = state.currentKarma - karmaLost;
    state.karma += karmaKept;

    // Bank karma for late-game acceleration once all soul upgrades are maxed
    if (allSoulUpgradesMaxed(state)) {
      state.bankedKarma += karmaKept;
    }

    if (state.nirvanaChallengeActive) {
      onNirvanaChallengeDeath(state);
    }

    events.emit({ type: 'death', karmaLost });
  }
}
