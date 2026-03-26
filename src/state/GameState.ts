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

export interface ActiveBlessing {
  type: 'nourish' | 'inspire' | 'protect';
  fromName: string;
  remaining: number; // seconds left
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
  autoFeedThreshold: number;
  autoRepairThreshold: number;

  // Karma bank (post-upgrade acceleration)
  bankedKarma: number;

  // Enlightenment progression
  enlightenmentTier: number;
  nirvanaUnlocked: boolean;
  nirvanaChallengeActive: boolean;
  nirvanaChallengeTimer: number;
  nirvanaAchieved: boolean;
  victoryStats: VictoryStats | null;

  // Karma milestone celebration tracking
  lastCelebratedKarmaMilestone: number;

  // Active blessings (temporary buffs from other players)
  activeBlessings: ActiveBlessing[];

  // Focus mode: true = wealth focus (material upgrades fully active),
  // false = karma focus (material upgrade karma penalties suspended, wealth bonuses also suspended)
  wealthFocusMode: boolean;

  totalPlayTime: number;
  lastSaveTimestamp: number;
  version: number;
}
