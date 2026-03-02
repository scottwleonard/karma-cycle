const SAVE_KEY = 'karma_cycle_save';
const BACKUP_KEY = 'karma_cycle_save_backup';

export function saveToLocal(json: string): void {
  try {
    const existing = localStorage.getItem(SAVE_KEY);
    if (existing) {
      localStorage.setItem(BACKUP_KEY, existing);
    }
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function loadFromLocal(): string | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) return data;
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

export function clearLocal(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // Ignore
  }
}
