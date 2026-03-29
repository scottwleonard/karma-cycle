import type { GameState } from '../state/GameState';

interface SaveData {
  version: number;
  timestamp: number;
  state: GameState;
}

export const CURRENT_VERSION = 9;

export function serialize(state: GameState): string {
  const saveData: SaveData = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state: { ...state, lastSaveTimestamp: Date.now() },
  };
  return JSON.stringify(saveData);
}

export function deserialize(json: string): GameState | null {
  try {
    const saveData: SaveData = JSON.parse(json);
    if (!saveData || typeof saveData.version !== 'number' || !saveData.state) {
      return null;
    }

    const migrated = migrate(saveData);
    return migrated.state;
  } catch {
    return null;
  }
}

function migrate(saveData: SaveData): SaveData {
  if (saveData.version < 2) {
    // Add auto-feed/repair toggle flags
    if (saveData.state.autoFeedEnabled === undefined) {
      (saveData.state as any).autoFeedEnabled = true;
    }
    if (saveData.state.autoRepairEnabled === undefined) {
      (saveData.state as any).autoRepairEnabled = true;
    }
    saveData.version = 2;
  }

  if (saveData.version < 3) {
    const s = saveData.state as any;
    if (s.enlightenmentTier === undefined) s.enlightenmentTier = 0;
    if (s.nirvanaUnlocked === undefined) s.nirvanaUnlocked = false;
    if (s.nirvanaChallengeActive === undefined) s.nirvanaChallengeActive = false;
    if (s.nirvanaChallengeTimer === undefined) s.nirvanaChallengeTimer = 0;
    if (s.nirvanaAchieved === undefined) s.nirvanaAchieved = false;
    if (s.victoryStats === undefined) s.victoryStats = null;

    // Retroactively compute enlightenment tier from existing karma
    if (s.karma >= 50_000) s.enlightenmentTier = 2;
    else if (s.karma >= 10_000) s.enlightenmentTier = 1;

    saveData.version = 3;
  }

  if (saveData.version < 4) {
    const s = saveData.state as any;
    if (s.bankedKarma === undefined) s.bankedKarma = 0;
    saveData.version = 4;
  }

  if (saveData.version < 5) {
    const s = saveData.state as any;
    if (s.playerName === undefined) s.playerName = '';
    saveData.version = 5;
  }

  if (saveData.version < 6) {
    const s = saveData.state as any;
    if (s.lastCelebratedKarmaMilestone === undefined) s.lastCelebratedKarmaMilestone = 0;
    saveData.version = 6;
  }

  if (saveData.version < 7) {
    const s = saveData.state as any;
    if (s.autoFeedThreshold === undefined) s.autoFeedThreshold = 50;
    if (s.autoRepairThreshold === undefined) s.autoRepairThreshold = 50;
    saveData.version = 7;
  }

  if (saveData.version < 8) {
    const s = saveData.state as any;
    if (s.activeBlessings === undefined) s.activeBlessings = [];
    saveData.version = 8;
  }

  if (saveData.version < 9) {
    const s = saveData.state as any;
    if (s.activeQuest === undefined) s.activeQuest = null;
    saveData.version = 9;
  }

  return saveData;
}
