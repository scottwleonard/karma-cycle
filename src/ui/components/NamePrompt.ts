interface NamePromptOptions {
  /** Title shown at top of the card */
  title?: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Button label */
  buttonText?: string;
  /** Pre-fill the input with this value */
  currentName?: string;
}

async function checkNameAvailable(name: string): Promise<boolean> {
  try {
    const res = await fetch(`/.netlify/functions/leaderboard?check=${encodeURIComponent(name)}`);
    if (!res.ok) return true; // assume available on error
    const data = (await res.json()) as { available: boolean };
    return data.available;
  } catch {
    return true;
  }
}

/**
 * HTML overlay that asks the player for their name.
 * Checks availability against the leaderboard before accepting.
 * Resolves with the chosen name, or null if cancelled.
 */
export function showNamePrompt(options?: NamePromptOptions): Promise<string | null> {
  const titleText = options?.title ?? 'Welcome, Seeker';
  const subtitleText = options?.subtitle ?? 'What shall we call you?';
  const buttonLabel = options?.buttonText ?? 'Begin';
  const canCancel = !!options?.currentName;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 3000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10, 10, 46, 0.95);
      font-family: monospace;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1a4e;
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      max-width: 400px;
      width: 90%;
    `;

    const title = document.createElement('div');
    title.textContent = titleText;
    title.style.cssText = `
      color: #ffd700; font-size: 28px; font-weight: bold; margin-bottom: 8px;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = subtitleText;
    subtitle.style.cssText = `color: #cccccc; font-size: 16px; margin-bottom: 24px;`;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Enter your name...';
    input.value = options?.currentName ?? '';
    input.style.cssText = `
      width: 100%; box-sizing: border-box;
      background: #0a0a2e; border: 2px solid #ffd700; border-radius: 8px;
      color: #ffffff; font-family: monospace; font-size: 18px;
      padding: 12px; outline: none; text-align: center;
      margin-bottom: 8px;
    `;

    const status = document.createElement('div');
    status.style.cssText = `
      font-size: 14px; margin-bottom: 24px; height: 20px;
    `;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display: flex; gap: 12px; justify-content: center;`;

    const btn = document.createElement('button');
    btn.textContent = buttonLabel;
    btn.disabled = !options?.currentName;
    btn.style.cssText = `
      background: #886622; border: none; border-radius: 8px;
      color: #ffffff; font-family: monospace; font-size: 18px; font-weight: bold;
      padding: 12px 32px; cursor: pointer; opacity: ${options?.currentName ? '1' : '0.5'};
    `;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastChecked = '';
    let nameAvailable = false;

    const updateButton = (enabled: boolean) => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.cursor = enabled ? 'pointer' : 'default';
    };

    input.addEventListener('input', () => {
      const name = input.value.trim();
      if (name.length < 1) {
        status.textContent = '';
        status.style.color = '';
        updateButton(false);
        return;
      }
      if (name.toLowerCase() === (options?.currentName ?? '').toLowerCase()) {
        status.textContent = 'That\'s your current name';
        status.style.color = '#888';
        updateButton(false);
        return;
      }
      status.textContent = 'Checking...';
      status.style.color = '#888';
      updateButton(false);

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (name !== input.value.trim()) return;
        const available = await checkNameAvailable(name);
        if (name !== input.value.trim()) return;
        lastChecked = name;
        nameAvailable = available;
        if (available) {
          status.textContent = 'Name available!';
          status.style.color = '#88ff88';
          updateButton(true);
        } else {
          status.textContent = 'Name already taken';
          status.style.color = '#ff6644';
          updateButton(false);
        }
      }, 400);
    });

    const submit = async () => {
      const name = input.value.trim();
      if (name.length < 1) return;
      // If we haven't checked this exact name yet, check now
      if (name !== lastChecked) {
        updateButton(false);
        status.textContent = 'Checking...';
        status.style.color = '#888';
        const available = await checkNameAvailable(name);
        if (!available) {
          status.textContent = 'Name already taken';
          status.style.color = '#ff6644';
          return;
        }
      } else if (!nameAvailable) {
        return;
      }
      overlay.remove();
      resolve(name);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) submit();
    });

    btnRow.appendChild(btn);

    if (canCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        background: #3a3a6e; border: none; border-radius: 8px;
        color: #cccccc; font-family: monospace; font-size: 18px;
        padding: 12px 32px; cursor: pointer;
      `;
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      btnRow.appendChild(cancelBtn);
    }

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(input);
    card.appendChild(status);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  });
}
