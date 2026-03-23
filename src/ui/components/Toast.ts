const TOAST_DURATION = 6000;
const FADE_DURATION = 500;

interface ToastOptions {
  message: string;
  /** If provided, the word "preview" in the message becomes a link */
  linkUrl?: string;
  linkText?: string;
}

export class ToastManager {
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(options: ToastOptions): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: #1e2058;
      border: 1px solid #ffd700;
      border-radius: 8px;
      padding: 12px 20px;
      font-family: monospace;
      font-size: 14px;
      color: #ffd700;
      pointer-events: auto;
      opacity: 0;
      transition: opacity ${FADE_DURATION}ms ease;
      max-width: 90vw;
      text-align: center;
    `;

    if (options.linkUrl && options.linkText) {
      // Replace the linkText in the message with an anchor tag
      const escaped = options.linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = options.message.split(new RegExp(`(${escaped})`, 'i'));
      toast.innerHTML = '';
      for (const part of parts) {
        if (part.toLowerCase() === options.linkText.toLowerCase()) {
          const link = document.createElement('a');
          link.href = options.linkUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = part;
          link.style.cssText = `color: #88ccff; text-decoration: underline; pointer-events: auto;`;
          toast.appendChild(link);
        } else {
          toast.appendChild(document.createTextNode(part));
        }
      }
    } else {
      toast.textContent = options.message;
    }

    this.container.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    // Auto dismiss
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, FADE_DURATION);
    }, TOAST_DURATION);
  }

  destroy(): void {
    this.container.remove();
  }
}
