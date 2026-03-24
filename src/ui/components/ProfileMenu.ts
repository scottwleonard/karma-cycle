import { pickAvatar, saveAvatarLocal, loadAvatarLocal } from '../avatarUtils';
import { AccessibilityManager } from '../../accessibility/AccessibilityManager';

export interface ProfileMenuCallbacks {
  onSuggest: () => void;
  onReset: () => void;
  onSaveLoad: () => void;
  onToggleMute: () => boolean;
  onChangeName: () => void;
  onAvatarChange: (dataUrl: string) => void;
  isMuted: () => boolean;
}

export class ProfileMenu {
  private container: HTMLDivElement;
  private avatarBtn: HTMLButtonElement;
  private dropdown: HTMLDivElement;
  private nameLabel: HTMLSpanElement;
  private muteItem: HTMLDivElement;
  private dropdownAvatar: HTMLDivElement;

  constructor(playerName: string, callbacks: ProfileMenuCallbacks) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed; top: 16px; right: 16px; z-index: 500;
      font-family: monospace;
    `;

    // Avatar button (top-right circle)
    this.avatarBtn = document.createElement('button');
    this.avatarBtn.style.cssText = `
      width: 48px; height: 48px; border-radius: 50%;
      background: #1a1a4e; border: 2px solid #ffd700;
      color: #ffd700; font-family: monospace; font-size: 20px;
      font-weight: bold; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; padding: 0;
    `;
    this.setAvatarDisplay(this.avatarBtn, loadAvatarLocal(), playerName);
    this.avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.container.appendChild(this.avatarBtn);

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      display: none; position: absolute; top: 56px; right: 0;
      background: #1a1a4e; border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px; min-width: 220px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Profile header with avatar + name
    const profileHeader = document.createElement('div');
    profileHeader.style.cssText = `
      padding: 16px; border-bottom: 1px solid rgba(255, 215, 0, 0.15);
      display: flex; align-items: center; gap: 12px;
    `;

    // Dropdown avatar (larger, clickable to upload)
    this.dropdownAvatar = document.createElement('div');
    this.dropdownAvatar.style.cssText = `
      width: 48px; height: 48px; border-radius: 50%;
      background: #0a0a2e; border: 2px solid rgba(255, 215, 0, 0.4);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; cursor: pointer; flex-shrink: 0;
      position: relative;
    `;
    this.setAvatarDisplay(this.dropdownAvatar, loadAvatarLocal(), playerName);

    // Upload overlay hint
    const uploadHint = document.createElement('div');
    uploadHint.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s; border-radius: 50%;
      font-size: 16px; color: #ffd700;
    `;
    uploadHint.textContent = '📷';
    this.dropdownAvatar.appendChild(uploadHint);
    this.dropdownAvatar.addEventListener('mouseenter', () => { uploadHint.style.opacity = '1'; });
    this.dropdownAvatar.addEventListener('mouseleave', () => { uploadHint.style.opacity = '0'; });
    this.dropdownAvatar.addEventListener('click', async (e) => {
      e.stopPropagation();
      const dataUrl = await pickAvatar();
      if (dataUrl) {
        saveAvatarLocal(dataUrl);
        this.setAvatarDisplay(this.avatarBtn, dataUrl, this.nameLabel.textContent || '');
        this.setAvatarDisplay(this.dropdownAvatar, dataUrl, this.nameLabel.textContent || '');
        // Re-add the upload hint since setAvatarDisplay clears children
        this.dropdownAvatar.appendChild(uploadHint);
        callbacks.onAvatarChange(dataUrl);
      }
    });

    const nameCol = document.createElement('div');
    nameCol.style.cssText = `flex: 1; min-width: 0;`;

    this.nameLabel = document.createElement('div');
    this.nameLabel.textContent = playerName;
    this.nameLabel.style.cssText = `
      color: #ffd700; font-size: 16px; font-weight: bold;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    `;

    const editLink = document.createElement('div');
    editLink.textContent = 'Change name';
    editLink.style.cssText = `
      color: rgba(255, 215, 0, 0.4); font-size: 11px; cursor: pointer;
      margin-top: 2px;
    `;
    editLink.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      callbacks.onChangeName();
    });

    nameCol.appendChild(this.nameLabel);
    nameCol.appendChild(editLink);
    profileHeader.appendChild(this.dropdownAvatar);
    profileHeader.appendChild(nameCol);
    this.dropdown.appendChild(profileHeader);

    // Menu items
    this.muteItem = this.makeItem(
      callbacks.isMuted() ? '🔇 Unmute' : '🔊 Mute',
      () => {
        const muted = callbacks.onToggleMute();
        this.muteItem.textContent = muted ? '🔇 Unmute' : '🔊 Mute';
      },
    );
    this.dropdown.appendChild(this.muteItem);

    const accessibilityItem = this.makeItem(
      AccessibilityManager.isEnabled() ? '♿ Accessibility: ON' : '♿ Accessibility: OFF',
      () => {
        const enabled = AccessibilityManager.toggle();
        accessibilityItem.textContent = enabled ? '♿ Accessibility: ON' : '♿ Accessibility: OFF';
        accessibilityItem.style.color = enabled ? '#ffd700' : '#cccccc';
      },
      AccessibilityManager.isEnabled() ? '#ffd700' : '#cccccc',
    );
    this.dropdown.appendChild(accessibilityItem);

    this.dropdown.appendChild(this.makeItem('💾 Save / Load', () => {
      this.close();
      callbacks.onSaveLoad();
    }));

    this.dropdown.appendChild(this.makeItem('💡 Suggest', () => {
      this.close();
      callbacks.onSuggest();
    }));

    this.dropdown.appendChild(this.makeDivider());

    this.dropdown.appendChild(this.makeItem('🔄 Reset Game', () => {
      this.close();
      callbacks.onReset();
    }, '#cc6666'));

    this.container.appendChild(this.dropdown);
    document.body.appendChild(this.container);

    document.addEventListener('click', () => this.close());
  }

  private setAvatarDisplay(el: HTMLElement, dataUrl: string | null, name: string): void {
    // Clear existing content except overlay hints
    const hints = Array.from(el.querySelectorAll('[data-hint]'));
    el.innerHTML = '';
    hints.forEach((h) => el.appendChild(h));

    if (dataUrl) {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = `width: 100%; height: 100%; object-fit: cover; border-radius: 50%;`;
      el.insertBefore(img, el.firstChild);
    } else {
      const initial = document.createElement('span');
      initial.textContent = (name[0] ?? '?').toUpperCase();
      initial.style.cssText = `color: #ffd700; font-size: 20px; font-weight: bold;`;
      el.insertBefore(initial, el.firstChild);
    }
  }

  setPlayerName(name: string): void {
    this.nameLabel.textContent = name;
    if (!loadAvatarLocal()) {
      this.setAvatarDisplay(this.avatarBtn, null, name);
      this.setAvatarDisplay(this.dropdownAvatar, null, name);
    }
  }

  private toggle(): void {
    this.dropdown.style.display = this.dropdown.style.display === 'none' ? 'block' : 'none';
  }

  private close(): void {
    this.dropdown.style.display = 'none';
  }

  private makeItem(label: string, onClick: () => void, color = '#cccccc'): HTMLDivElement {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.cssText = `
      padding: 12px 16px; cursor: pointer;
      color: ${color}; font-size: 14px;
      transition: background 0.1s;
    `;
    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255, 215, 0, 0.08)'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
    item.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return item;
  }

  private makeDivider(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `height: 1px; background: rgba(255, 215, 0, 0.1); margin: 4px 0;`;
    return div;
  }

  destroy(): void {
    this.container.remove();
  }
}
