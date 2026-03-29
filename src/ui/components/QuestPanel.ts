import { Container, Graphics, Text } from 'pixi.js';
import type { GameState } from '../../state/GameState';
import { QUEST_DEFINITIONS } from '../../types/quests';
import { getAvailableQuests, startQuest, claimQuestReward } from '../../systems/questSystem';
import { formatNumber } from '../../utils/format';
import { formatDuration } from '../../utils/time';

const BG_COLOR = 0x1a1a4e;
const GOLD = 0xffd700;
const PANEL_W = 1000;

export class QuestPanel extends Container {
  private state: GameState;
  private onQuestStart: () => void;

  // Quest list view
  private listContainer!: Container;
  private listRows: Container[] = [];

  // Active quest view
  private activeContainer!: Container;
  private activeTitle!: Text;
  private activeTimer!: Text;
  private activeBar!: Graphics;
  private activeBarFill!: Graphics;
  private claimBtn!: Container;
  private claimBtnBg!: Graphics;
  private claimBtnText!: Text;
  private activeBarMaxWidth = PANEL_W - 80;

  constructor(state: GameState, onQuestStart: () => void) {
    super();
    this.state = state;
    this.onQuestStart = onQuestStart;
    this.buildLayout();
  }

  private buildLayout(): void {
    // Header
    const header = new Text({
      text: '— Quests —',
      style: { fontFamily: 'monospace', fontSize: 28, fill: GOLD, fontWeight: 'bold' },
    });
    header.anchor.set(0.5, 0);
    header.x = PANEL_W / 2;
    header.y = 0;
    this.addChild(header);

    const subHeader = new Text({
      text: 'Higher karma unlocks more valuable quests',
      style: { fontFamily: 'monospace', fontSize: 18, fill: 0xaaaacc },
    });
    subHeader.anchor.set(0.5, 0);
    subHeader.x = PANEL_W / 2;
    subHeader.y = 38;
    this.addChild(subHeader);

    // Quest list container
    this.listContainer = new Container();
    this.listContainer.y = 74;
    this.addChild(this.listContainer);

    // Active quest container
    this.activeContainer = new Container();
    this.activeContainer.y = 74;
    this.activeContainer.visible = false;
    this.buildActiveView();
    this.addChild(this.activeContainer);

    this.rebuildList();
  }

  private buildActiveView(): void {
    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, 220, 10);
    bg.fill({ color: BG_COLOR, alpha: 0.9 });
    bg.roundRect(0, 0, PANEL_W, 220, 10);
    bg.stroke({ color: GOLD, alpha: 0.4, width: 1 });
    this.activeContainer.addChild(bg);

    this.activeTitle = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 26, fill: GOLD, fontWeight: 'bold' },
    });
    this.activeTitle.x = 24;
    this.activeTitle.y = 20;
    this.activeContainer.addChild(this.activeTitle);

    this.activeTimer = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 22, fill: 0xddddff },
    });
    this.activeTimer.x = 24;
    this.activeTimer.y = 56;
    this.activeContainer.addChild(this.activeTimer);

    // Progress bar track
    this.activeBar = new Graphics();
    this.activeBar.roundRect(24, 96, this.activeBarMaxWidth, 20, 4);
    this.activeBar.fill({ color: 0x333366, alpha: 0.9 });
    this.activeContainer.addChild(this.activeBar);

    // Progress bar fill
    this.activeBarFill = new Graphics();
    this.activeContainer.addChild(this.activeBarFill);

    // Claim button
    this.claimBtn = new Container();
    this.claimBtn.x = PANEL_W / 2 - 160;
    this.claimBtn.y = 140;
    this.claimBtn.eventMode = 'static';
    this.claimBtn.cursor = 'pointer';

    this.claimBtnBg = new Graphics();
    this.claimBtnBg.roundRect(0, 0, 320, 60, 8);
    this.claimBtnBg.fill({ color: 0x336633, alpha: 0.9 });
    this.claimBtn.addChild(this.claimBtnBg);

    this.claimBtnText = new Text({
      text: 'Claim Reward',
      style: { fontFamily: 'monospace', fontSize: 24, fill: 0x88ff88, fontWeight: 'bold' },
    });
    this.claimBtnText.anchor.set(0.5, 0.5);
    this.claimBtnText.x = 160;
    this.claimBtnText.y = 30;
    this.claimBtn.addChild(this.claimBtnText);

    this.claimBtn.on('pointertap', () => {
      claimQuestReward(this.state);
      this.rebuildList();
    });
    this.activeContainer.addChild(this.claimBtn);
  }

  rebuildList(): void {
    this.listContainer.removeChildren();
    this.listRows = [];

    const available = getAvailableQuests(this.state);

    if (available.length === 0) {
      const none = new Text({
        text: 'No quests available yet.\nAccumulate more karma to unlock quests.',
        style: { fontFamily: 'monospace', fontSize: 22, fill: 0x888899, align: 'center', lineHeight: 32 },
      });
      none.anchor.set(0.5, 0);
      none.x = PANEL_W / 2;
      none.y = 20;
      this.listContainer.addChild(none);
      return;
    }

    available.forEach((def, i) => {
      const cost = def.costFn(this.state.karma);
      const reward = def.rewardFn(this.state.karma);
      const profit = reward - cost;
      const canAfford = this.state.wealth >= cost;

      const row = new Container();
      row.y = i * 110;

      const rowBg = new Graphics();
      rowBg.roundRect(0, 0, PANEL_W, 100, 8);
      rowBg.fill({ color: BG_COLOR, alpha: canAfford ? 0.9 : 0.5 });
      rowBg.roundRect(0, 0, PANEL_W, 100, 8);
      rowBg.stroke({ color: canAfford ? GOLD : 0x444466, alpha: canAfford ? 0.4 : 0.2, width: 1 });
      row.addChild(rowBg);

      const nameText = new Text({
        text: def.name,
        style: { fontFamily: 'monospace', fontSize: 22, fill: canAfford ? GOLD : 0x666688, fontWeight: 'bold' },
      });
      nameText.x = 16;
      nameText.y = 12;
      row.addChild(nameText);

      const descText = new Text({
        text: def.description,
        style: { fontFamily: 'monospace', fontSize: 16, fill: 0xaaaacc },
      });
      descText.x = 16;
      descText.y = 42;
      row.addChild(descText);

      const statsText = new Text({
        text: `Cost: ${formatNumber(cost)} wealth  |  Reward: ${formatNumber(reward)} wealth  (+${formatNumber(profit)})  |  ${formatDuration(def.durationSeconds)}`,
        style: { fontFamily: 'monospace', fontSize: 17, fill: canAfford ? 0x88ff88 : 0x556655 },
      });
      statsText.x = 16;
      statsText.y = 72;
      row.addChild(statsText);

      // Start button
      const startBtn = new Container();
      startBtn.x = PANEL_W - 150;
      startBtn.y = 20;
      startBtn.eventMode = 'static';
      if (canAfford) {
        startBtn.cursor = 'pointer';
        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, 130, 60, 8);
        btnBg.fill({ color: 0x2a2a88, alpha: 0.9 });
        btnBg.roundRect(0, 0, 130, 60, 8);
        btnBg.stroke({ color: GOLD, alpha: 0.6, width: 1 });
        startBtn.addChild(btnBg);

        const btnLabel = new Text({
          text: 'Begin',
          style: { fontFamily: 'monospace', fontSize: 22, fill: GOLD, fontWeight: 'bold' },
        });
        btnLabel.anchor.set(0.5, 0.5);
        btnLabel.x = 65;
        btnLabel.y = 30;
        startBtn.addChild(btnLabel);

        const questId = def.id;
        startBtn.on('pointertap', () => {
          if (startQuest(this.state, questId)) {
            this.onQuestStart();
          }
        });
      } else {
        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, 130, 60, 8);
        btnBg.fill({ color: 0x1a1a2a, alpha: 0.5 });
        startBtn.addChild(btnBg);

        const btnLabel = new Text({
          text: 'Too poor',
          style: { fontFamily: 'monospace', fontSize: 18, fill: 0x555566 },
        });
        btnLabel.anchor.set(0.5, 0.5);
        btnLabel.x = 65;
        btnLabel.y = 30;
        startBtn.addChild(btnLabel);
      }
      row.addChild(startBtn);

      this.listContainer.addChild(row);
      this.listRows.push(row);
    });

    // Show locked previews for quests not yet at karma threshold
    const locked = QUEST_DEFINITIONS.filter((q) => this.state.karma < q.minKarma);
    const startY = available.length * 110 + 16;

    if (locked.length > 0) {
      const lockedHeader = new Text({
        text: '— Locked Quests —',
        style: { fontFamily: 'monospace', fontSize: 18, fill: 0x555577 },
      });
      lockedHeader.anchor.set(0.5, 0);
      lockedHeader.x = PANEL_W / 2;
      lockedHeader.y = startY;
      this.listContainer.addChild(lockedHeader);

      locked.forEach((def, i) => {
        const row = new Container();
        row.y = startY + 32 + i * 70;

        const rowBg = new Graphics();
        rowBg.roundRect(0, 0, PANEL_W, 60, 8);
        rowBg.fill({ color: 0x0f0f25, alpha: 0.6 });
        row.addChild(rowBg);

        const lockText = new Text({
          text: `🔒 ${def.name}  —  requires ${formatNumber(def.minKarma)} karma`,
          style: { fontFamily: 'monospace', fontSize: 18, fill: 0x444455 },
        });
        lockText.x = 16;
        lockText.y = 18;
        row.addChild(lockText);

        this.listContainer.addChild(row);
      });
    }
  }

  /** Call each frame to update the active quest display */
  tick(): void {
    const q = this.state.activeQuest;
    const hasActive = q !== null;

    this.listContainer.visible = !hasActive;
    this.activeContainer.visible = hasActive;

    if (!hasActive) return;

    this.activeTitle.text = q.name;

    const def = QUEST_DEFINITIONS.find((d) => d.id === q.defId);
    if (!def) return;

    if (q.isComplete) {
      this.activeTimer.text = `Complete! Reward: ${formatNumber(q.wealthReward)} wealth`;
      this.activeTimer.style.fill = 0x88ff88;
      this.claimBtn.visible = true;

      // Full bar
      this.activeBarFill.clear();
      this.activeBarFill.roundRect(24, 96, this.activeBarMaxWidth, 20, 4);
      this.activeBarFill.fill({ color: 0x44cc44 });
    } else {
      const total = def.durationSeconds;
      const elapsed = total - q.timeRemaining;
      const pct = Math.min(1, elapsed / total);
      const fillW = Math.floor(this.activeBarMaxWidth * pct);

      this.activeTimer.text = `Time remaining: ${formatDuration(q.timeRemaining)}  —  Reward: ${formatNumber(q.wealthReward)} wealth`;
      this.activeTimer.style.fill = 0xddddff;
      this.claimBtn.visible = false;

      this.activeBarFill.clear();
      if (fillW > 0) {
        this.activeBarFill.roundRect(24, 96, fillW, 20, 4);
        this.activeBarFill.fill({ color: GOLD });
      }
    }
  }
}
