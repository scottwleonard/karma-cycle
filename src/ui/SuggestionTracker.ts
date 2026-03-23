import type { ToastManager } from './components/Toast';

type Stage = 'submitted' | 'building' | 'preview';

const STORAGE_KEY = 'karma_cycle_suggestion_tracking';
const POLL_INTERVAL = 30_000;

interface TrackedSuggestion {
  issueNumber: number;
  stage: Stage;
}

export class SuggestionTracker {
  private toast: ToastManager;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tracked: TrackedSuggestion | null = null;

  constructor(toast: ToastManager) {
    this.toast = toast;
    this.load();

    // Resume polling if there's an in-progress suggestion
    if (this.tracked && this.tracked.stage !== 'preview') {
      this.startPolling();
    }
  }

  /** Call after a successful suggestion submission */
  trackIssue(issueNumber: number): void {
    this.tracked = { issueNumber, stage: 'submitted' };
    this.save();
    this.toast.show({ message: `Suggestion #${issueNumber} submitted!` });
    this.startPolling();
  }

  private startPolling(): void {
    if (this.timer) return;
    // Poll immediately, then on interval
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (!this.tracked || this.tracked.stage === 'preview') {
      this.stopPolling();
      return;
    }

    try {
      const res = await fetch(
        `/.netlify/functions/suggestion-status?issue=${this.tracked.issueNumber}`,
      );
      if (!res.ok) return;

      const data = (await res.json()) as { stage: Stage; previewUrl?: string };
      const prev = this.tracked.stage;

      if (data.stage === prev) return;

      this.tracked.stage = data.stage;
      this.save();

      if (data.stage === 'building' && prev === 'submitted') {
        this.toast.show({
          message: `Suggestion #${this.tracked.issueNumber} is being built...`,
        });
      }

      if (data.stage === 'preview' && data.previewUrl) {
        this.toast.show({
          message: `Suggestion #${this.tracked.issueNumber} is ready to preview!`,
          linkUrl: data.previewUrl,
          linkText: 'preview',
        });
        this.stopPolling();
      }
    } catch {
      // Network error — skip this poll cycle
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tracked = JSON.parse(raw) as TrackedSuggestion;
      }
    } catch {
      this.tracked = null;
    }
  }

  private save(): void {
    if (this.tracked) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tracked));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
