import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import type { EventBus } from '../types/events';
import { SOUL_UPGRADES } from '../types/upgrades';
import { getSoulUpgradeLevel } from './upgradeSystem';

const TIER_MILESTONES = [
  { tier: 1, name: 'Awakening', karma: CONFIG.enlightenment.awakeningKarma },
  { tier: 2, name: 'Bodhi', karma: CONFIG.enlightenment.bodhiKarma },
];

export function allSoulUpgradesMaxed(state: GameState): boolean {
  return SOUL_UPGRADES.every(
    (def) => getSoulUpgradeLevel(state, def.id) >= def.maxLevel,
  );
}

export function isNirvanaUnlockable(state: GameState): boolean {
  return (
    !state.nirvanaAchieved &&
    allSoulUpgradesMaxed(state) &&
    state.karma >= CONFIG.enlightenment.nirvanaKarma
  );
}

export function startNirvanaChallenge(state: GameState, events: EventBus): void {
  state.nirvanaChallengeActive = true;
  state.nirvanaChallengeTimer = 0;

  // Reset into a new life (similar to performRebirth but no karma earned)
  state.lifeNumber++;
  state.currentKarma = 0;
  const fortuneLevel = getSoulUpgradeLevel(state, 'worldly_fortune');
  state.wealth = fortuneLevel * 50;
  state.needs.hunger = 100;
  state.needs.shelter = 100;
  state.needs.health = 100;
  state.lifeTimeElapsed = 0;
  state.isAlive = true;
  state.lifeUpgrades = [];

  events.emit({ type: 'nirvana_challenge_started' });
}

export function onNirvanaChallengeDeath(state: GameState): void {
  state.nirvanaChallengeActive = false;
  state.nirvanaChallengeTimer = 0;
}

export function getNirvanaChallengeProgress(state: GameState): number {
  return state.nirvanaChallengeTimer / CONFIG.enlightenment.challengeDuration;
}

export function getNirvanaChallengeRemaining(state: GameState): number {
  return Math.max(0, CONFIG.enlightenment.challengeDuration - state.nirvanaChallengeTimer);
}

export function update(dt: number, state: GameState, events: EventBus): void {
  if (state.nirvanaAchieved) return;

  // Check tier milestones (only advance, never regress)
  for (const milestone of TIER_MILESTONES) {
    if (state.enlightenmentTier < milestone.tier && state.karma >= milestone.karma) {
      state.enlightenmentTier = milestone.tier;
      events.emit({
        type: 'enlightenment_reached',
        tier: milestone.tier,
        tierName: milestone.name,
      });
    }
  }

  // Check Nirvana unlock eligibility
  if (!state.nirvanaUnlocked && isNirvanaUnlockable(state)) {
    state.nirvanaUnlocked = true;
  }

  // Advance Nirvana challenge timer
  if (state.nirvanaChallengeActive && state.isAlive) {
    state.nirvanaChallengeTimer += dt;
    if (state.nirvanaChallengeTimer >= CONFIG.enlightenment.challengeDuration) {
      // Victory!
      state.nirvanaAchieved = true;
      state.nirvanaChallengeActive = false;
      state.enlightenmentTier = 3;
      state.victoryStats = {
        totalKarma: state.karma,
        totalLives: state.lifeNumber,
        totalPlayTime: state.totalPlayTime,
        finalLifeTime: state.lifeTimeElapsed,
      };
      events.emit({ type: 'nirvana_achieved', stats: state.victoryStats });
    }
  }
}
