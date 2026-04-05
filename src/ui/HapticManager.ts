const STORAGE_KEY = 'karma_cycle_haptic_enabled';

export class HapticManager {
  private _enabled: boolean;
  private readonly supported: boolean;

  constructor() {
    this.supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    const stored = localStorage.getItem(STORAGE_KEY);
    this._enabled = stored !== null ? stored === 'true' : true;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(val: boolean): void {
    this._enabled = val;
    localStorage.setItem(STORAGE_KEY, String(val));
  }

  toggle(): boolean {
    this.setEnabled(!this._enabled);
    return this._enabled;
  }

  private vibrate(pattern: number | number[]): void {
    if (this.supported && this._enabled) {
      navigator.vibrate(pattern);
    }
  }

  feed(): void { this.vibrate(50); }
  repair(): void { this.vibrate(50); }
  rebirth(): void { this.vibrate([60, 40, 60]); }
  death(): void { this.vibrate([80, 50, 80]); }
  milestone(): void { this.vibrate([50, 30, 50]); }
}
