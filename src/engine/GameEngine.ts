import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { EventBus } from '../types/events';
import * as karmaSystem from '../systems/karmaSystem';
import * as needsSystem from '../systems/needsSystem';
import { getFeedCost, getRepairCost } from '../systems/needsSystem';
import * as wealthSystem from '../systems/wealthSystem';
import * as deathSystem from '../systems/deathSystem';
import * as enlightenmentSystem from '../systems/enlightenmentSystem';
import * as lifeEventsSystem from '../systems/lifeEventsSystem';
import type { LifeEventResult } from '../systems/lifeEventsSystem';
import { getSoulUpgradeLevel } from '../systems/upgradeSystem';

export class GameEngine {
  state: GameState;
  events: EventBus;
  lastLifeEvent: LifeEventResult | null = null;

  constructor(state: GameState) {
    this.state = state;
    this.events = new EventBus();
  }

  update(dtSeconds: number): void {
    if (!this.state.isAlive) return;

    // Clamp delta to prevent spiral-of-death on tab refocus
    const dt = Math.min(dtSeconds, 1);

    this.state.lifeTimeElapsed += dt;
    this.state.totalPlayTime += dt;

    needsSystem.update(dt, this.state);

    // Auto-feed when unlocked and enabled
    if (
      this.state.autoFeedEnabled &&
      getSoulUpgradeLevel(this.state, 'auto_feed') > 0 &&
      this.state.needs.hunger < 50
    ) {
      const cost = getFeedCost(this.state);
      if (this.state.wealth >= cost) {
        this.state.wealth -= cost;
        this.state.needs.hunger = Math.min(
          100,
          this.state.needs.hunger + CONFIG.needs.hunger.feedAmount,
        );
      }
    }

    // Auto-repair when unlocked and enabled
    if (
      this.state.autoRepairEnabled &&
      getSoulUpgradeLevel(this.state, 'auto_repair') > 0 &&
      this.state.needs.shelter < 50
    ) {
      const cost = getRepairCost(this.state);
      if (this.state.wealth >= cost) {
        this.state.wealth -= cost;
        this.state.needs.shelter = Math.min(
          100,
          this.state.needs.shelter + CONFIG.needs.shelter.repairAmount,
        );
      }
    }

    wealthSystem.update(dt, this.state);
    karmaSystem.update(dt, this.state);

    // Enlightenment milestones + nirvana challenge timer
    enlightenmentSystem.update(dt, this.state, this.events);

    // Life events — random occurrences
    this.lastLifeEvent = lifeEventsSystem.update(dt, this.state);

    deathSystem.update(dt, this.state, this.events);
  }
}
