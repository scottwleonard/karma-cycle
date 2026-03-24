export interface ProfileMenuCallbacks {
  onSuggest: () => void;
  onReset: () => void;
  onSaveLoad: () => void;
  onToggleMute: () => boolean; // returns new muted state
  onChangeName: () => void;
  isMuted: () => boolean;
}

export class ProfileMenu {
  private container: HTMLDivElement;
  private avatar: HTMLButtonElement;
  private dropdown: HTMLDivElement;
  private nameLabel: HTMLSpanElement;
  private muteItem: HTMLDivElement;
  constructor(playerName: string, callbacks: ProfileMenuCallbacks) {

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed; top: 16px; right: 16px; z-index: 500;
      font-family: monospace;
    `;

    // Avatar button
    this.avatar = document.createElement('button');
    this.avatar.style.cssText = `
      width: 48px; height: 48px; border-radius: 50%;
      background: #1a1a4e; border: 2px solid #ffd700;
      color: #ffd700; font-family: monospace; font-size: 20px;
      font-weight: bold; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    `;
    this.avatar.textContent = this.getInitial(playerName);
    this.avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.container.appendChild(this.avatar);

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      display: none; position: absolute; top: 56px; right: 0;
      background: #1a1a4e; border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px; min-width: 200px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Player name header
    const nameHeader = document.createElement('div');
    nameHeader.style.cssText = `
      padding: 16px 16px 12px; border-bottom: 1px solid rgba(255, 215, 0, 0.15);
      display: flex; align-items: center; gap: 8px;
    `;
    this.nameLabel = document.createElement('span');
    this.nameLabel.textContent = playerName;
    this.nameLabel.style.cssText = `
      color: #ffd700; font-size: 16px; font-weight: bold; flex: 1;
    `;
    const editIcon = document.createElement('span');
    editIcon.textContent = '✎';
    editIcon.style.cssText = `
      color: rgba(255, 215, 0, 0.5); font-size: 14px; cursor: pointer;
    `;
    editIcon.addEventListener('click', () => {
      this.close();
      callbacks.onChangeName();
    });
    nameHeader.appendChild(this.nameLabel);
    nameHeader.appendChild(editIcon);
    this.dropdown.appendChild(nameHeader);

    // Menu items
    this.muteItem = this.makeItem(
      callbacks.isMuted() ? '🔇 Unmute' : '🔊 Mute',
      () => {
        const muted = callbacks.onToggleMute();
        this.muteItem.textContent = muted ? '🔇 Unmute' : '🔊 Mute';
      },
    );
    this.dropdown.appendChild(this.muteItem);

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

    // Close on outside click
    document.addEventListener('click', () => this.close());
  }

  private getInitial(name: string): string {
    return (name[0] ?? '?').toUpperCase();
  }

  setPlayerName(name: string): void {
    this.nameLabel.textContent = name;
    this.avatar.textContent = this.getInitial(name);
  }

  private toggle(): void {
    const open = this.dropdown.style.display === 'none';
    this.dropdown.style.display = open ? 'block' : 'none';
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
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(255, 215, 0, 0.08)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return item;
  }

  private makeDivider(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      height: 1px; background: rgba(255, 215, 0, 0.1);
      margin: 4px 0;
    `;
    return div;
  }

  destroy(): void {
    this.container.remove();
  }
}
