/**
 * HTML overlay that asks the player for their name on first load.
 * Resolves with the chosen name when submitted.
 */
export function showNamePrompt(): Promise<string> {
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
    title.textContent = 'Welcome, Seeker';
    title.style.cssText = `
      color: #ffd700; font-size: 28px; font-weight: bold; margin-bottom: 8px;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'What shall we call you?';
    subtitle.style.cssText = `color: #cccccc; font-size: 16px; margin-bottom: 24px;`;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Enter your name...';
    input.style.cssText = `
      width: 100%; box-sizing: border-box;
      background: #0a0a2e; border: 2px solid #ffd700; border-radius: 8px;
      color: #ffffff; font-family: monospace; font-size: 18px;
      padding: 12px; outline: none; text-align: center;
      margin-bottom: 24px;
    `;

    const btn = document.createElement('button');
    btn.textContent = 'Begin';
    btn.disabled = true;
    btn.style.cssText = `
      background: #886622; border: none; border-radius: 8px;
      color: #ffffff; font-family: monospace; font-size: 18px; font-weight: bold;
      padding: 12px 40px; cursor: pointer; opacity: 0.5;
    `;

    input.addEventListener('input', () => {
      const valid = input.value.trim().length >= 1;
      btn.disabled = !valid;
      btn.style.opacity = valid ? '1' : '0.5';
      btn.style.cursor = valid ? 'pointer' : 'default';
    });

    const submit = () => {
      const name = input.value.trim();
      if (name.length < 1) return;
      overlay.remove();
      resolve(name);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(input);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  });
}
