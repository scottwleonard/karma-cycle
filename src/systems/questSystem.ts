import type { GameState } from '../state/GameState';
import { QUEST_DEFINITIONS } from '../types/quests';

/** Return quest definitions available at the player's current karma level */
export function getAvailableQuests(state: GameState) {
  return QUEST_DEFINITIONS.filter((q) => state.karma >= q.minKarma);
}

/** Start a quest by id. Deducts wealth cost. Returns false if insufficient wealth or quest already active. */
export function startQuest(state: GameState, questId: string): boolean {
  if (state.activeQuest) return false;

  const def = QUEST_DEFINITIONS.find((q) => q.id === questId);
  if (!def) return false;
  if (state.karma < def.minKarma) return false;

  const cost = def.costFn(state.karma);
  if (state.wealth < cost) return false;

  state.wealth -= cost;
  state.activeQuest = {
    defId: questId,
    name: def.name,
    timeRemaining: def.durationSeconds,
    wealthReward: def.rewardFn(state.karma),
    isComplete: false,
  };
  return true;
}

/** Claim the reward from a completed quest. Returns the wealth gained, or 0 if not complete. */
export function claimQuestReward(state: GameState): number {
  if (!state.activeQuest || !state.activeQuest.isComplete) return 0;
  const reward = state.activeQuest.wealthReward;
  state.wealth += reward;
  state.activeQuest = null;
  return reward;
}

/** Tick the active quest timer. Call every game update. */
export function update(dt: number, state: GameState): void {
  if (!state.activeQuest || state.activeQuest.isComplete) return;
  state.activeQuest.timeRemaining = Math.max(0, state.activeQuest.timeRemaining - dt);
  if (state.activeQuest.timeRemaining === 0) {
    state.activeQuest.isComplete = true;
  }
}
