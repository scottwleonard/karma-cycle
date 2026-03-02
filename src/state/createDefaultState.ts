import type { GameState } from './GameState';

export function createDefaultState(): GameState {
  return {
    karma: 0,
    currentKarma: 0,
    wealth: 0,

    needs: {
      hunger: 100,
      shelter: 100,
      health: 100,
    },

    lifeNumber: 1,
    lifeTimeElapsed: 0,
    isAlive: true,

    soulUpgrades: [],
    karmaMultiplier: 1,

    lifeUpgrades: [],

    autoFeedEnabled: true,
    autoRepairEnabled: true,

    enlightenmentTier: 0,
    nirvanaUnlocked: false,
    nirvanaChallengeActive: false,
    nirvanaChallengeTimer: 0,
    nirvanaAchieved: false,
    victoryStats: null,

    totalPlayTime: 0,
    lastSaveTimestamp: Date.now(),
    version: 1,
  };
}
