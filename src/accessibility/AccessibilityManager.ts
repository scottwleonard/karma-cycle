const STORAGE_KEY = 'karma_cycle_accessibility';

/** Karma generation multiplier when accessibility mode is enabled. */
const KARMA_BOOST = 5;

/**
 * Manages the accessibility mode setting, stored in localStorage independently
 * of the game save so it persists across resets.
 *
 * When enabled:
 * - Karma generates 5× faster
 * - Auto-feed and auto-repair activate without requiring soul upgrades
 */
export class AccessibilityManager {
  private static _enabled = false;

  /** Call once on startup to read the persisted setting. */
  static load(): void {
    this._enabled = localStorage.getItem(STORAGE_KEY) === 'true';
  }

  static isEnabled(): boolean {
    return this._enabled;
  }

  static toggle(): boolean {
    this._enabled = !this._enabled;
    localStorage.setItem(STORAGE_KEY, String(this._enabled));
    return this._enabled;
  }

  /** Returns the karma rate multiplier to apply (1 normally, 5 in accessibility mode). */
  static getKarmaMultiplier(): number {
    return this._enabled ? KARMA_BOOST : 1;
  }
}
