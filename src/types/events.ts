import type { VictoryStats } from '../state/GameState';

export type GameEvent =
  | { type: 'rebirth'; karmaEarned: number; lifeNumber: number }
  | { type: 'death'; karmaLost: number }
  | { type: 'upgrade_purchased'; upgradeId: string }
  | { type: 'soul_upgrade_purchased'; upgradeId: string; level: number }
  | { type: 'need_critical'; need: string }
  | { type: 'enlightenment_reached'; tier: number; tierName: string }
  | { type: 'nirvana_challenge_started' }
  | { type: 'nirvana_achieved'; stats: VictoryStats };

export type GameEventHandler = (event: GameEvent) => void;

export class EventBus {
  private handlers: GameEventHandler[] = [];

  on(handler: GameEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  emit(event: GameEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
