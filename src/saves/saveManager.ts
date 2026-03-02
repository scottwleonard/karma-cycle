import type { GameState } from '../state/GameState';
import { createDefaultState } from '../state/createDefaultState';
import { serialize, deserialize } from './serializer';
import { saveToLocal, loadFromLocal, clearLocal } from './localStorage';
import { CONFIG } from '../config';

export class SaveManager {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  load(): GameState {
    const json = loadFromLocal();
    if (!json) return createDefaultState();

    const state = deserialize(json);
    if (!state) return createDefaultState();

    return state;
  }

  save(state: GameState): void {
    state.lastSaveTimestamp = Date.now();
    const json = serialize(state);
    saveToLocal(json);
  }

  startAutoSave(getState: () => GameState): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      this.save(getState());
    }, CONFIG.save.autoSaveIntervalMs);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  reset(): GameState {
    clearLocal();
    return createDefaultState();
  }
}
