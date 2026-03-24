const POLL_INTERVAL = 60_000;

export class VersionChecker {
  private currentHash: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onBeforeReload?: () => void;

  constructor(currentHash: string, onBeforeReload?: () => void) {
    this.currentHash = currentHash;
    this.onBeforeReload = onBeforeReload;
  }

  start(): void {
    this.timer = setInterval(() => this.check(), POLL_INTERVAL);
  }

  private async check(): Promise<void> {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { hash: string };
      if (data.hash && data.hash !== this.currentHash) {
        // New version deployed — save state then reload
        this.onBeforeReload?.();
        window.location.reload();
      }
    } catch {
      // Silent fail
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
