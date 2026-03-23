export interface Needs {
  hunger: number;
  shelter: number;
  health: number;
}

export interface SoulUpgrade {
  id: string;
  level: number;
}

export interface LifeUpgrade {
  id: string;
  purchased: boolean;
}

export interface VictoryStats {
  totalKarma: number;
  totalLives: number;
  totalPlayTime: number;
  finalLifeTime: number;
}

export interface GameState {
  playerName: string;

  karma: number;
  currentKarma: number;
  wealth: number;

  needs: Needs;

  lifeNumber: number;
  lifeTimeElapsed: number;
  isAlive: boolean;

  soulUpgrades: SoulUpgrade[];
  karmaMultiplier: number;

  lifeUpgrades: LifeUpgrade[];

  autoFeedEnabled: boolean;
  autoRepairEnabled: boolean;

  // Karma bank (post-upgrade acceleration)
  bankedKarma: number;

  // Enlightenment progression
  enlightenmentTier: number;
  nirvanaUnlocked: boolean;
  nirvanaChallengeActive: boolean;
  nirvanaChallengeTimer: number;
  nirvanaAchieved: boolean;
  victoryStats: VictoryStats | null;

  totalPlayTime: number;
  lastSaveTimestamp: number;
  version: number;
}
