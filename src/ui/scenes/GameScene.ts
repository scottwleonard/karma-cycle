import { Container, Text, Graphics } from 'pixi.js';
import type { GameEngine } from '../../engine/GameEngine';
import type { LayoutInfo } from '../layout';
import { CONFIG } from '../../config';
import { formatNumber } from '../../utils/format';
import { formatDuration } from '../../utils/time';
import { ResourceCounter } from '../components/ResourceCounter';
import { NeedBar } from '../components/NeedBar';
import { ActionButton } from '../components/ActionButton';
import { Mandala } from '../components/Mandala';
import { ParticleField } from '../components/ParticleField';
import { NumberPopManager } from '../components/NumberPop';
import { EventLog } from '../components/EventLog';
import type { AudioManager } from '../../audio/AudioManager';
import { SuggestOverlay } from '../components/SuggestOverlay';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { SaveExportImportOverlay } from '../components/SaveExportImportOverlay';
import { ToastManager } from '../components/Toast';
import { ActivityLog } from '../components/ActivityLog';
import { showNamePrompt } from '../components/NamePrompt';
import { ProfileMenu } from '../components/ProfileMenu';
import { SuggestionTracker } from '../SuggestionTracker';
import { getNetKarmaPerSecond, getKarmaDrainPerSecond } from '../../systems/karmaSystem';
import { QuestPanel } from '../components/QuestPanel';
import { reset as resetLifeEvents } from '../../systems/lifeEventsSystem';
import { getWealthPerSecond } from '../../systems/wealthSystem';
import { getFeedCost, getRepairCost } from '../../systems/needsSystem';
import { performRebirth, getRebirthKarma } from '../../systems/rebirthSystem';
import { performDeathRebirth } from '../../systems/rebirthSystem';
import {
  startNirvanaChallenge,
  getNirvanaChallengeRemaining,
} from '../../systems/enlightenmentSystem';
import {
  SOUL_UPGRADES,
  LIFE_UPGRADES,
  getSoulUpgradeCost,
} from '../../types/upgrades';
import type { LifeUpgradeDefinition } from '../../types/upgrades';
import type { VictoryStats } from '../../state/GameState';
import {
  buySoulUpgrade,
  buyLifeUpgrade,
  canBuySoulUpgrade,
  canBuyLifeUpgrade,
  getSoulUpgradeLevel,
} from '../../systems/upgradeSystem';

type TabName = 'game' | 'soul' | 'quests';

// Compact upgrade row shown inline on the game screen
interface UpgradeRow {
  def: LifeUpgradeDefinition;
  container: Container;
  bg: Graphics;
  nameText: Text;
  costText: Text;
}

export class GameScene extends Container {
  private engine: GameEngine;
  private layout!: LayoutInfo;

  // Header
  private headerText!: Text;
  private headerRightText!: Text;

  // Mandala area
  private mandala!: Mandala;
  private particles!: ParticleField;
  private numberPops!: NumberPopManager;

  // Resources
  private karmaCounter!: ResourceCounter;
  private wealthCounter!: ResourceCounter;
  private lifetimeKarmaText!: Text;

  // Needs
  private hungerBar!: NeedBar;
  private shelterBar!: NeedBar;
  private healthBar!: NeedBar;

  // Buttons
  private feedButton!: ActionButton;
  private repairButton!: ActionButton;
  private rebirthButton!: ActionButton;
  private continueButton: ActionButton | null = null;

  // Tabs — Game, Soul, Quests
  private currentTab: TabName = 'game';
  private tabContainer!: Container;
  private gameView!: Container;
  private soulView!: Container;
  private questsView!: Container;
  private questPanel!: QuestPanel;
  private tabButtons: ActionButton[] = [];

  // Death overlay
  private deathOverlay!: Container;
  private deathSubtext!: Text;

  // Auto toggles
  private autoFeedToggle!: Container;
  private autoRepairToggle!: Container;
  private autoFeedThresholdControl!: Container;
  private autoRepairThresholdControl!: Container;

  // Inline upgrade rows (game view)
  private upgradeRows: UpgradeRow[] = [];
  private upgradeContainer!: Container;
  private upgradeHeader!: Text;
  private upgradeScrollY = 0;
  private upgradeScrollMax = 0;
  private upgradeContainerBaseY = 0;
  private readonly UPGRADE_AREA_H = 480;
  private upgradeScrollTrack!: Graphics;
  private upgradeScrollThumb!: Graphics;

  // Event log
  private eventLog!: EventLog;

  // Rebirth preview

  // Karma bank display
  private bankedKarmaText!: Text;

  // Karma pop tracking
  private karmaPopAccum = 0;

  // Nirvana challenge timer display
  private nirvanaTimerText!: Text;

  // Seek Nirvana button on soul tab
  private seekNirvanaButton!: ActionButton;

  // Milestone popup
  private milestoneOverlay!: Container;
  private milestoneTitle!: Text;
  private milestoneSubtext!: Text;
  private milestoneTimer = 0;

  // Victory screen
  private victoryOverlay!: Container;

  // Audio
  private audioManager: AudioManager;
  private profileMenu!: ProfileMenu;

  // Community suggest
  private suggestOverlay!: SuggestOverlay;
  private saveExportImportOverlay!: SaveExportImportOverlay;
  private loadTime = Date.now();
  private toastManager!: ToastManager;
  private suggestionTracker!: SuggestionTracker;

  // Reset confirmation
  private resetOverlay!: Container;

  // Activity log sidebar
  private activityLog!: ActivityLog;

  // Tutorial overlay
  private tutorialOverlay!: TutorialOverlay;

  // Background rect for theme changes
  private bgRect!: Graphics;
  private lastEnlightenmentTier = -1;

  constructor(engine: GameEngine, layout: LayoutInfo, audioManager: AudioManager) {
    super();
    this.engine = engine;
    this.layout = layout;
    this.audioManager = audioManager;
    this.buildUI();
    this.setupEvents();

    // Init audio immediately — AudioContext may start suspended due to
    // browser autoplay policy, but will auto-resume on first user gesture.
    // We also listen for pointerdown as a fallback to ensure it resumes.
    this.audioManager.init();
    const resumeAudioOnce = () => {
      this.audioManager.resumeContext();
      document.removeEventListener('pointerdown', resumeAudioOnce);
    };
    document.addEventListener('pointerdown', resumeAudioOnce);

    // Restore enlightenment visuals from saved state
    this.mandala.setEnlightenmentTier(engine.state.enlightenmentTier);

    // Show victory screen if already achieved
    if (engine.state.nirvanaAchieved && engine.state.victoryStats) {
      this.showVictoryScreen(engine.state.victoryStats);
    }

    // Show tutorial on first load
    this.tutorialOverlay.showIfNeeded();
  }

  private buildUI(): void {
    const gw = CONFIG.display.referenceWidth;
    const gh = CONFIG.display.referenceHeight;
    const MARGIN = 40;

    // Position the game container
    this.x = this.layout.offsetX;
    this.y = this.layout.offsetY;
    this.scale.set(this.layout.scale);

    // === BACKGROUND (themed per enlightenment tier) ===
    this.bgRect = new Graphics();
    this.bgRect.rect(0, 0, gw, gh);
    this.bgRect.fill({ color: CONFIG.display.bgColor });
    this.addChild(this.bgRect);

    // === PROFILE MENU (HTML dropdown, top-right) ===
    this.profileMenu = new ProfileMenu(this.engine.state.playerName, {
      onSuggest: () => this.suggestOverlay.show(this.layout),
      onReset: () => { this.resetOverlay.visible = true; },
      onSaveLoad: () => this.saveExportImportOverlay.show(),
      onToggleMute: () => {
        const muted = !this.audioManager.isMuted;
        this.audioManager.setMuted(muted);
        return muted;
      },
      onChangeName: () => this.promptNameChange(),
      onAvatarChange: () => { /* Avatar saved to localStorage, picked up on next score submit */ },
      isMuted: () => this.audioManager.isMuted,
    });

    // === HEADER (Life info — below top area) ===
    const contentStartY = 64;

    this.headerText = new Text({
      text: 'Life #1',
      style: {
        fontFamily: 'monospace',
        fontSize: 36,
        fill: 0xffffff,
      },
    });
    this.headerText.x = MARGIN;
    this.headerText.y = contentStartY;
    this.addChild(this.headerText);

    this.headerRightText = new Text({
      text: '0:00',
      style: {
        fontFamily: 'monospace',
        fontSize: 36,
        fill: 0xffffff,
      },
    });
    this.headerRightText.anchor.set(1, 0);
    this.headerRightText.x = gw - MARGIN;
    this.headerRightText.y = contentStartY;
    this.addChild(this.headerRightText);

    // === NIRVANA CHALLENGE TIMER ===
    this.nirvanaTimerText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0xcc88ff,
        fontWeight: 'bold',
      },
    });
    this.nirvanaTimerText.anchor.set(0.5, 0);
    this.nirvanaTimerText.x = gw / 2;
    this.nirvanaTimerText.y = contentStartY + 44;
    this.nirvanaTimerText.visible = false;
    this.addChild(this.nirvanaTimerText);

    // === MANDALA AREA ===
    const mandalaY = contentStartY + 180;
    this.mandala = new Mandala(180);
    this.mandala.x = gw / 2;
    this.mandala.y = mandalaY;
    this.addChild(this.mandala);

    this.particles = new ParticleField(gw, 400);
    this.particles.x = gw / 2;
    this.particles.y = mandalaY;
    this.addChild(this.particles);

    this.numberPops = new NumberPopManager();
    this.numberPops.x = gw / 2;
    this.numberPops.y = mandalaY - 100;
    this.addChild(this.numberPops);

    // === RESOURCE COUNTERS (symmetric left/right of mandala) ===
    this.karmaCounter = new ResourceCounter('Karma', CONFIG.display.karmaColor, 44);
    this.karmaCounter.x = MARGIN;
    this.karmaCounter.y = mandalaY - 60;
    this.addChild(this.karmaCounter);

    this.wealthCounter = new ResourceCounter('Wealth', CONFIG.display.wealthColor, 36);
    this.wealthCounter.x = gw - 280;
    this.wealthCounter.y = mandalaY - 60;
    this.addChild(this.wealthCounter);

    this.lifetimeKarmaText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xddbb44,
      },
    });
    this.lifetimeKarmaText.x = MARGIN;
    this.lifetimeKarmaText.y = mandalaY + 200 + 64;
    this.addChild(this.lifetimeKarmaText);

    this.bankedKarmaText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xffdd55,
      },
    });
    this.bankedKarmaText.x = MARGIN;
    this.bankedKarmaText.y = mandalaY + 200 + 64;
    this.bankedKarmaText.visible = false;
    this.addChild(this.bankedKarmaText);

    // === TAB CONTENT AREAS ===
    this.tabContainer = new Container();
    this.tabContainer.y = mandalaY + 200 + 64 + 32 + 32;
    this.addChild(this.tabContainer);

    this.buildGameView(gw);
    this.buildSoulView(gw);
    this.buildQuestsView(gw);

    this.tabContainer.addChild(this.gameView);

    // === TAB BUTTONS (3: Game, Soul, Quests) ===
    const tabY = 1800;
    const tabWidth = (gw - 80) / 3;
    const tabNames: TabName[] = ['game', 'soul', 'quests'];
    const tabLabels = ['Game', 'Soul', 'Quests'];
    const tabColors = [0x404488, 0x884444, 0x336644];

    for (let i = 0; i < 3; i++) {
      const tab = tabNames[i];
      const btn = new ActionButton(tabLabels[i], tabWidth - 10, 60, tabColors[i], () => {
        this.switchTab(tab);
      });
      btn.x = 30 + i * tabWidth;
      btn.y = tabY;
      this.addChild(btn);
      this.tabButtons.push(btn);
    }

    // === DEATH OVERLAY ===
    this.deathOverlay = new Container();
    this.deathOverlay.visible = false;
    const deathBg = new Graphics();
    deathBg.rect(0, 0, gw, CONFIG.display.referenceHeight);
    deathBg.fill({ color: 0x000000, alpha: 0.85 });
    this.deathOverlay.addChild(deathBg);

    const deathTitle = new Text({
      text: 'You have perished',
      style: {
        fontFamily: 'monospace',
        fontSize: 52,
        fill: 0xff3344,
        fontWeight: 'bold',
      },
    });
    deathTitle.anchor.set(0.5);
    deathTitle.x = gw / 2;
    deathTitle.y = 600;
    this.deathOverlay.addChild(deathTitle);

    this.deathSubtext = new Text({
      text: '75% of this life\'s karma was lost.',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xcccccc,
      },
    });
    this.deathSubtext.anchor.set(0.5);
    this.deathSubtext.x = gw / 2;
    this.deathSubtext.y = 700;
    this.deathOverlay.addChild(this.deathSubtext);

    this.continueButton = new ActionButton('Begin New Life', 400, 80, 0x996633, () => {
      performDeathRebirth(this.engine.state, this.engine.events);
      this.deathOverlay.visible = false;
      resetLifeEvents();
      this.eventLog.clear();
    });
    this.continueButton.x = gw / 2 - 200;
    this.continueButton.y = 850;
    this.deathOverlay.addChild(this.continueButton);

    this.addChild(this.deathOverlay);

    // === MILESTONE POPUP OVERLAY ===
    this.milestoneOverlay = new Container();
    this.milestoneOverlay.visible = false;
    const milestoneBg = new Graphics();
    milestoneBg.rect(0, 0, gw, CONFIG.display.referenceHeight);
    milestoneBg.fill({ color: 0x000011, alpha: 0.8 });
    this.milestoneOverlay.addChild(milestoneBg);
    this.milestoneOverlay.eventMode = 'static';
    this.milestoneOverlay.on('pointertap', () => {
      this.milestoneOverlay.visible = false;
      this.milestoneTimer = 0;
    });

    this.milestoneTitle = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 56,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    this.milestoneTitle.anchor.set(0.5);
    this.milestoneTitle.x = gw / 2;
    this.milestoneTitle.y = 700;
    this.milestoneOverlay.addChild(this.milestoneTitle);

    this.milestoneSubtext = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xcccccc,
      },
    });
    this.milestoneSubtext.anchor.set(0.5);
    this.milestoneSubtext.x = gw / 2;
    this.milestoneSubtext.y = 800;
    this.milestoneOverlay.addChild(this.milestoneSubtext);

    this.addChild(this.milestoneOverlay);

    // === VICTORY OVERLAY (built but hidden) ===
    this.victoryOverlay = new Container();
    this.victoryOverlay.visible = false;
    this.addChild(this.victoryOverlay);

    // === RESET CONFIRMATION OVERLAY ===
    this.resetOverlay = new Container();
    this.resetOverlay.visible = false;
    const resetBg = new Graphics();
    resetBg.rect(0, 0, gw, CONFIG.display.referenceHeight);
    resetBg.fill({ color: 0x000000, alpha: 0.9 });
    resetBg.eventMode = 'static';
    this.resetOverlay.addChild(resetBg);

    const resetTitle = new Text({
      text: 'Reset Game?',
      style: { fontFamily: 'monospace', fontSize: 52, fill: 0xff3344, fontWeight: 'bold' },
    });
    resetTitle.anchor.set(0.5);
    resetTitle.x = gw / 2;
    resetTitle.y = 650;
    this.resetOverlay.addChild(resetTitle);

    const resetWarning = new Text({
      text: 'This will erase:\n\n- All karma and wealth\n- Soul upgrades and life upgrades\n- Karma Bank balance\n- Enlightenment progress\n- Life count and history\n\nThis cannot be undone.',
      style: { fontFamily: 'monospace', fontSize: 24, fill: 0xcccccc, align: 'center', lineHeight: 34 },
    });
    resetWarning.anchor.set(0.5);
    resetWarning.x = gw / 2;
    resetWarning.y = 750;
    this.resetOverlay.addChild(resetWarning);

    const confirmResetBtn = new ActionButton('Yes, Reset Everything', 450, 80, 0xaa2222, () => {
      // Set a flag so main.ts clears save data on reload
      // (beforeunload would otherwise re-save the current state)
      sessionStorage.setItem('karma_cycle_reset', '1');
      window.location.reload();
    });
    confirmResetBtn.x = gw / 2 - 225;
    confirmResetBtn.y = 1000;
    this.resetOverlay.addChild(confirmResetBtn);

    const cancelResetBtn = new ActionButton('Cancel', 250, 70, 0x3a3a6e, () => {
      this.resetOverlay.visible = false;
    });
    cancelResetBtn.x = gw / 2 - 125;
    cancelResetBtn.y = 1100;
    this.resetOverlay.addChild(cancelResetBtn);

    this.addChild(this.resetOverlay);

    // === TOAST & SUGGESTION TRACKING ===
    this.toastManager = new ToastManager();
    this.suggestionTracker = new SuggestionTracker(this.toastManager);

    // === ACTIVITY LOG (right-column sidebar) ===
    this.activityLog = new ActivityLog(__BUILD_HASH__);
    this.activityLog.setPlayerName(this.engine.state.playerName);

    // === SUGGEST OVERLAY ===
    this.suggestOverlay = new SuggestOverlay(gw, this.loadTime, (issueNumber) => {
      this.suggestionTracker.trackIssue(issueNumber);
    });
    this.addChild(this.suggestOverlay);

    // === TUTORIAL OVERLAY ===
    this.tutorialOverlay = new TutorialOverlay();
    this.addChild(this.tutorialOverlay);

    // === SAVE EXPORT/IMPORT OVERLAY ===
    this.saveExportImportOverlay = new SaveExportImportOverlay(gw);
    this.saveExportImportOverlay.setGetState(() => this.engine.state);
    this.addChild(this.saveExportImportOverlay);
  }



  private buildGameView(gw: number): void {
    this.gameView = new Container();

    // Consistent margin for all game view elements
    const GM = 40;
    const contentW = gw - GM * 2;

    // Need bars — 32px tall, 8px gap between each
    const barH = 32;
    const barGap = 8;
    let curY = 32;

    this.hungerBar = new NeedBar('Hunger', contentW, barH, CONFIG.display.hungerColor);
    this.hungerBar.x = GM;
    this.hungerBar.y = curY;
    this.gameView.addChild(this.hungerBar);
    curY += barH + barGap;

    this.shelterBar = new NeedBar('Shelter', contentW, barH, CONFIG.display.shelterColor);
    this.shelterBar.x = GM;
    this.shelterBar.y = curY;
    this.gameView.addChild(this.shelterBar);
    curY += barH + barGap;

    this.healthBar = new NeedBar('Health', contentW, barH, CONFIG.display.healthColor);
    this.healthBar.x = GM;
    this.healthBar.y = curY;
    this.gameView.addChild(this.healthBar);
    curY += barH + 32; // 32px gap before buttons

    // Action buttons — evenly spaced within content area
    const btnY = curY;
    const btnGap = 12;
    const btnW = (contentW - btnGap * 2) / 3;

    this.feedButton = new ActionButton('Feed', btnW, 80, CONFIG.display.hungerColor, () => {
      const cost = getFeedCost(this.engine.state);
      if (this.engine.state.wealth >= cost) {
        this.engine.state.wealth -= cost;
        this.engine.state.needs.hunger = Math.min(
          100,
          this.engine.state.needs.hunger + CONFIG.needs.hunger.feedAmount,
        );
        this.mandala.pulse(0.3);
        this.particles.burst(5, 0xff8c00);
      }
    });
    this.feedButton.x = GM;
    this.feedButton.y = btnY;
    this.gameView.addChild(this.feedButton);

    this.repairButton = new ActionButton('Repair', btnW, 80, CONFIG.display.shelterColor, () => {
      const cost = getRepairCost(this.engine.state);
      if (this.engine.state.wealth >= cost) {
        this.engine.state.wealth -= cost;
        this.engine.state.needs.shelter = Math.min(
          100,
          this.engine.state.needs.shelter + CONFIG.needs.shelter.repairAmount,
        );
        this.mandala.pulse(0.3);
        this.particles.burst(5, 0x20b2aa);
      }
    });
    this.repairButton.x = GM + btnW + btnGap;
    this.repairButton.y = btnY;
    this.gameView.addChild(this.repairButton);

    this.rebirthButton = new ActionButton('Rebirth', btnW, 80, 0x7b4fba, () => {
      performRebirth(this.engine.state, this.engine.events);
      this.karmaPopAccum = 0;
      resetLifeEvents();
      this.eventLog.clear();
      this.mandala.pulse(2);
      this.particles.burst(30, 0xbb88ff);
    });
    this.rebirthButton.x = GM + (btnW + btnGap) * 2;
    this.rebirthButton.y = btnY;
    this.gameView.addChild(this.rebirthButton);


    // Auto toggles (hidden until soul upgrade purchased)
    const toggleY = btnY + 80 + 8; // button height + xs gap
    this.autoFeedToggle = this.buildToggle('Auto Feed', CONFIG.display.hungerColor, () => {
      this.engine.state.autoFeedEnabled = !this.engine.state.autoFeedEnabled;
    });
    this.autoFeedToggle.x = GM;
    this.autoFeedToggle.y = toggleY;
    this.autoFeedToggle.visible = false;
    this.gameView.addChild(this.autoFeedToggle);

    this.autoRepairToggle = this.buildToggle('Auto Repair', CONFIG.display.shelterColor, () => {
      this.engine.state.autoRepairEnabled = !this.engine.state.autoRepairEnabled;
    });
    this.autoRepairToggle.x = GM + btnW + btnGap;
    this.autoRepairToggle.y = toggleY;
    this.autoRepairToggle.visible = false;
    this.gameView.addChild(this.autoRepairToggle);

    // Threshold steppers (hidden until soul upgrade purchased)
    const thresholdY = toggleY + 36 + 8;
    this.autoFeedThresholdControl = this.buildThresholdStepper(
      CONFIG.display.hungerColor,
      () => {
        this.engine.state.autoFeedThreshold = Math.max(
          20,
          this.engine.state.autoFeedThreshold - 10,
        );
      },
      () => {
        this.engine.state.autoFeedThreshold = Math.min(
          80,
          this.engine.state.autoFeedThreshold + 10,
        );
      },
    );
    this.autoFeedThresholdControl.x = GM;
    this.autoFeedThresholdControl.y = thresholdY;
    this.autoFeedThresholdControl.visible = false;
    this.gameView.addChild(this.autoFeedThresholdControl);

    this.autoRepairThresholdControl = this.buildThresholdStepper(
      CONFIG.display.shelterColor,
      () => {
        this.engine.state.autoRepairThreshold = Math.max(
          20,
          this.engine.state.autoRepairThreshold - 10,
        );
      },
      () => {
        this.engine.state.autoRepairThreshold = Math.min(
          80,
          this.engine.state.autoRepairThreshold + 10,
        );
      },
    );
    this.autoRepairThresholdControl.x = GM + btnW + btnGap;
    this.autoRepairThresholdControl.y = thresholdY;
    this.autoRepairThresholdControl.visible = false;
    this.gameView.addChild(this.autoRepairThresholdControl);

    // === INLINE UPGRADE SHOP — only unpurchased upgrades shown ===
    const shopY = thresholdY + 36 + 28; // threshold row height + gap

    this.upgradeHeader = new Text({
      text: '— Upgrades —',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xbbccaa,
        fontWeight: 'bold',
      },
    });
    this.upgradeHeader.anchor.set(0.5, 0);
    this.upgradeHeader.x = gw / 2;
    this.upgradeHeader.y = shopY;
    this.gameView.addChild(this.upgradeHeader);

    this.upgradeContainerBaseY = shopY + 32;
    this.upgradeContainer = new Container();
    this.upgradeContainer.x = GM;
    this.upgradeContainer.y = this.upgradeContainerBaseY;
    this.gameView.addChild(this.upgradeContainer);

    // Mask to clip upgrade rows to fixed-height area
    const upgradeMask = new Graphics();
    upgradeMask.rect(GM, this.upgradeContainerBaseY, contentW, this.UPGRADE_AREA_H);
    upgradeMask.fill({ color: 0xffffff });
    this.gameView.addChild(upgradeMask);
    this.upgradeContainer.mask = upgradeMask;

    // Build a row for every life upgrade — we'll show/hide dynamically
    LIFE_UPGRADES.forEach((def) => {
      const container = new Container();
      // eventMode left as default — tap handled by scroll overlay below

      const bg = new Graphics();
      container.addChild(bg);

      const categoryTints: Record<string, number> = {
        survival: 0x66cc66,
        spiritual: 0x7799ff,
        material: 0xff9955,
      };
      const tint = categoryTints[def.category] || 0xaaaaaa;

      // Upgrade name
      const nameText = new Text({
        text: def.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 22,
          fill: tint,
          fontWeight: 'bold',
        },
      });
      nameText.x = 14;
      nameText.y = 6;
      container.addChild(nameText);

      // Cost + description
      const costText = new Text({
        text: `${def.cost}w · ${def.description}`,
        style: {
          fontFamily: 'monospace',
          fontSize: 18,
          fill: 0xccccbb,
        },
      });
      costText.x = 14;
      costText.y = 30;
      container.addChild(costText);

      this.upgradeRows.push({ def, container, bg, nameText, costText });
      // Don't add to upgradeContainer yet — layoutUpgrades will handle it
    });

    // Interactive overlay for scroll + tap on upgrade area
    const upgradeOverlay = new Graphics();
    upgradeOverlay.rect(0, 0, contentW, this.UPGRADE_AREA_H);
    upgradeOverlay.fill({ color: 0xffffff, alpha: 0 });
    upgradeOverlay.x = GM;
    upgradeOverlay.y = this.upgradeContainerBaseY;
    upgradeOverlay.eventMode = 'static';
    upgradeOverlay.cursor = 'pointer';
    this.gameView.addChild(upgradeOverlay);

    let pointerStartY = 0;
    let scrollAtStart = 0;
    let dragMoved = false;

    upgradeOverlay.on('pointerdown', (e) => {
      pointerStartY = e.global.y;
      scrollAtStart = this.upgradeScrollY;
      dragMoved = false;
    });

    upgradeOverlay.on('pointermove', (e) => {
      if (!(e.buttons & 1)) return;
      const dy = (e.global.y - pointerStartY) / this.layout.scale;
      if (Math.abs(dy) > 8) {
        dragMoved = true;
        this.upgradeScrollY = Math.max(0, Math.min(this.upgradeScrollMax, scrollAtStart - dy));
        this.upgradeContainer.y = this.upgradeContainerBaseY - this.upgradeScrollY;
        this.updateScrollbar();
      }
    });

    upgradeOverlay.on('pointertap', (e) => {
      if (dragMoved) { dragMoved = false; return; }
      // Find which row was tapped based on position
      const local = e.getLocalPosition(this.upgradeContainer);
      for (const row of this.upgradeRows) {
        if (!row.container.parent) continue; // not visible
        const ry = row.container.y;
        if (local.y >= ry && local.y <= ry + 56) {
          if (buyLifeUpgrade(this.engine.state, row.def)) {
            this.engine.events.emit({ type: 'upgrade_purchased', upgradeId: row.def.id });
          }
          break;
        }
      }
    });

    // Mouse wheel scroll support
    upgradeOverlay.on('wheel', (e) => {
      this.upgradeScrollY = Math.max(0, Math.min(this.upgradeScrollMax, this.upgradeScrollY + e.deltaY / this.layout.scale));
      this.upgradeContainer.y = this.upgradeContainerBaseY - this.upgradeScrollY;
      this.updateScrollbar();
    });

    // Scrollbar track (right edge of upgrade area)
    const scrollbarX = gw - GM + 2;
    this.upgradeScrollTrack = new Graphics();
    this.upgradeScrollTrack.rect(0, 0, 8, this.UPGRADE_AREA_H);
    this.upgradeScrollTrack.fill({ color: 0x2a2a5e });
    this.upgradeScrollTrack.x = scrollbarX;
    this.upgradeScrollTrack.y = this.upgradeContainerBaseY;
    this.upgradeScrollTrack.visible = false;
    this.gameView.addChild(this.upgradeScrollTrack);

    // Scrollbar thumb
    this.upgradeScrollThumb = new Graphics();
    this.upgradeScrollThumb.rect(0, 0, 8, 40);
    this.upgradeScrollThumb.fill({ color: 0xffd700, alpha: 0.6 });
    this.upgradeScrollThumb.x = scrollbarX;
    this.upgradeScrollThumb.y = this.upgradeContainerBaseY;
    this.upgradeScrollThumb.visible = false;
    this.gameView.addChild(this.upgradeScrollThumb);

    // Event log — fixed position below upgrade area, aligned to content area
    this.eventLog = new EventLog(contentW, 200);
    this.eventLog.x = GM;
    this.eventLog.y = this.upgradeContainerBaseY + this.UPGRADE_AREA_H + 32;
    this.gameView.addChild(this.eventLog);
  }

  /** Rebuild visible upgrade rows — only show unpurchased ones */
  private layoutUpgrades(): void {
    const gw = CONFIG.display.referenceWidth;
    const rowW = gw - 80;
    const rowH = 56;
    const gap = 8;
    const state = this.engine.state;

    // Remove all children first
    this.upgradeContainer.removeChildren();

    let y = 0;
    let visibleCount = 0;

    for (const row of this.upgradeRows) {
      const owned = state.lifeUpgrades.some((u) => u.id === row.def.id && u.purchased);
      if (owned) continue; // hide purchased

      // Hide material upgrades during Nirvana challenge
      if (state.nirvanaChallengeActive && row.def.category === 'material') continue;

      const affordable = canBuyLifeUpgrade(state, row.def);

      // Redraw background
      row.bg.clear();
      if (affordable) {
        row.bg.roundRect(0, 0, rowW, rowH, 8);
        row.bg.fill({ color: 0x1a2e20 });
        row.bg.roundRect(0, 0, rowW, rowH, 8);
        row.bg.stroke({ color: 0x66cc77, alpha: 0.6, width: 1 });
        row.container.alpha = 1;
        row.container.cursor = 'pointer';
        row.costText.style.fill = 0xeeeedd;
      } else {
        row.bg.roundRect(0, 0, rowW, rowH, 8);
        row.bg.fill({ color: 0x161830 });
        row.bg.roundRect(0, 0, rowW, rowH, 8);
        row.bg.stroke({ color: 0x555577, alpha: 0.3, width: 1 });
        row.container.alpha = 0.55;
        row.container.cursor = 'default';
        row.costText.style.fill = 0x888899;
      }

      row.container.y = y;
      this.upgradeContainer.addChild(row.container);
      y += rowH + gap;
      visibleCount++;
    }

    // Show/hide header
    this.upgradeHeader.visible = visibleCount > 0;

    // Update scroll bounds and clamp current scroll
    this.upgradeScrollMax = Math.max(0, y - this.UPGRADE_AREA_H);
    this.upgradeScrollY = Math.max(0, Math.min(this.upgradeScrollMax, this.upgradeScrollY));
    this.upgradeContainer.y = this.upgradeContainerBaseY - this.upgradeScrollY;
    this.updateScrollbar();
  }

  /** Update scrollbar thumb position and visibility */
  private updateScrollbar(): void {
    const hasScroll = this.upgradeScrollMax > 0;
    this.upgradeScrollTrack.visible = hasScroll;
    this.upgradeScrollThumb.visible = hasScroll;
    if (!hasScroll) return;

    const totalContentH = this.upgradeScrollMax + this.UPGRADE_AREA_H;
    const thumbH = Math.max(30, (this.UPGRADE_AREA_H / totalContentH) * this.UPGRADE_AREA_H);
    const thumbRange = this.UPGRADE_AREA_H - thumbH;
    const thumbY = this.upgradeContainerBaseY + (this.upgradeScrollMax > 0 ? (this.upgradeScrollY / this.upgradeScrollMax) * thumbRange : 0);

    this.upgradeScrollThumb.clear();
    this.upgradeScrollThumb.roundRect(0, 0, 8, thumbH, 4);
    this.upgradeScrollThumb.fill({ color: 0xffd700, alpha: 0.6 });
    this.upgradeScrollThumb.y = thumbY;
  }

  private buildToggle(labelText: string, color: number, onClick: () => void): Container {
    const toggle = new Container();
    toggle.eventMode = 'static';
    toggle.cursor = 'pointer';

    const width = 230;
    const height = 36;

    const bg = new Graphics();
    bg.roundRect(0, 0, width, height, 6);
    bg.fill({ color, alpha: 0.25 });
    bg.roundRect(0, 0, width, height, 6);
    bg.stroke({ color, alpha: 0.5, width: 1 });
    toggle.addChild(bg);

    // Switch indicator
    const indicator = new Graphics();
    indicator.circle(height / 2, height / 2, 10);
    indicator.fill({ color: 0x44ff44 });
    toggle.addChild(indicator);
    (toggle as any)._indicator = indicator;
    (toggle as any)._bg = bg;
    (toggle as any)._baseColor = color;

    const label = new Text({
      text: labelText,
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xeeeeee,
      },
    });
    label.x = height + 8;
    label.y = (height - 20) / 2;
    toggle.addChild(label);

    toggle.on('pointertap', onClick);

    return toggle;
  }

  private updateToggle(toggle: Container, enabled: boolean): void {
    const indicator = (toggle as any)._indicator as Graphics;
    const bg = (toggle as any)._bg as Graphics;
    const baseColor = (toggle as any)._baseColor as number;

    const width = 230;
    const height = 36;

    indicator.clear();
    indicator.circle(height / 2, height / 2, 10);
    indicator.fill({ color: enabled ? 0x44ff44 : 0x555555 });

    bg.clear();
    bg.roundRect(0, 0, width, height, 6);
    bg.fill({ color: baseColor, alpha: enabled ? 0.25 : 0.08 });
    bg.roundRect(0, 0, width, height, 6);
    bg.stroke({ color: baseColor, alpha: enabled ? 0.5 : 0.15, width: 1 });
  }

  private buildThresholdStepper(
    color: number,
    onDecrement: () => void,
    onIncrement: () => void,
  ): Container {
    const stepper = new Container();
    const width = 230;
    const height = 32;

    const bg = new Graphics();
    bg.roundRect(0, 0, width, height, 6);
    bg.fill({ color, alpha: 0.15 });
    bg.roundRect(0, 0, width, height, 6);
    bg.stroke({ color, alpha: 0.3, width: 1 });
    stepper.addChild(bg);

    // Decrement button
    const decBtn = new Container();
    decBtn.eventMode = 'static';
    decBtn.cursor = 'pointer';
    const decBg = new Graphics();
    decBg.roundRect(0, 0, 36, height, 6);
    decBg.fill({ color, alpha: 0.2 });
    decBtn.addChild(decBg);
    const decLabel = new Text({
      text: '−',
      style: { fontFamily: 'monospace', fontSize: 22, fill: 0xeeeeee },
    });
    decLabel.x = 10;
    decLabel.y = 3;
    decBtn.addChild(decLabel);
    decBtn.on('pointertap', onDecrement);
    stepper.addChild(decBtn);

    // Increment button
    const incBtn = new Container();
    incBtn.eventMode = 'static';
    incBtn.cursor = 'pointer';
    const incBg = new Graphics();
    incBg.roundRect(0, 0, 36, height, 6);
    incBg.fill({ color, alpha: 0.2 });
    incBtn.addChild(incBg);
    const incLabel = new Text({
      text: '+',
      style: { fontFamily: 'monospace', fontSize: 22, fill: 0xeeeeee },
    });
    incLabel.x = 9;
    incLabel.y = 3;
    incBtn.addChild(incLabel);
    incBtn.x = width - 36;
    incBtn.on('pointertap', onIncrement);
    stepper.addChild(incBtn);

    // Value text (centered)
    const valueText = new Text({
      text: 'below 50%',
      style: { fontFamily: 'monospace', fontSize: 16, fill: 0xdddddd },
    });
    valueText.x = 38;
    valueText.y = (height - 16) / 2;
    stepper.addChild(valueText);
    (stepper as any)._valueText = valueText;

    return stepper;
  }

  private updateThresholdStepper(stepper: Container, threshold: number): void {
    const valueText = (stepper as any)._valueText as Text;
    valueText.text = `below ${threshold}%`;
  }

  private buildSoulView(gw: number): void {
    this.soulView = new Container();

    const title = new Text({
      text: 'Soul Upgrades (permanent)',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xffccee,
        fontWeight: 'bold',
      },
    });
    title.x = 40;
    title.y = 10;
    this.soulView.addChild(title);

    SOUL_UPGRADES.forEach((def, i) => {
      const btn = new ActionButton(def.name, gw - 80, 70, 0x5a2a55, () => {
        if (buySoulUpgrade(this.engine.state, def)) {
          this.engine.events.emit({
            type: 'soul_upgrade_purchased',
            upgradeId: def.id,
            level: getSoulUpgradeLevel(this.engine.state, def.id),
          });
        }
      });
      btn.x = 40;
      btn.y = 60 + i * 85;
      this.soulView.addChild(btn);
    });

    // Seek Nirvana button — below soul upgrades
    this.seekNirvanaButton = new ActionButton('Seek Nirvana', gw - 80, 80, 0x8844cc, () => {
      startNirvanaChallenge(this.engine.state, this.engine.events);
      resetLifeEvents();
      this.eventLog.clear();
      this.karmaPopAccum = 0;
      this.switchTab('game');
    });
    this.seekNirvanaButton.x = 40;
    this.seekNirvanaButton.y = 60 + SOUL_UPGRADES.length * 85 + 20;
    this.seekNirvanaButton.visible = false;
    this.soulView.addChild(this.seekNirvanaButton);

  }

  private buildQuestsView(gw: number): void {
    this.questsView = new Container();
    this.questsView.x = 40;
    this.questsView.y = 20;

    this.questPanel = new QuestPanel(this.engine.state, () => {
      // Quest started — switch to quests tab to show the timer
      this.switchTab('quests');
    });
    this.questsView.addChild(this.questPanel);

    // Clip the view to avoid overflow beyond tab area
    const mask = new Graphics();
    mask.rect(-40, -20, gw, 1700);
    mask.fill({ color: 0xffffff });
    this.questsView.addChild(mask);
    this.questsView.mask = mask;
  }

  private switchTab(tab: TabName): void {
    this.currentTab = tab;
    this.tabContainer.removeChildren();
    switch (tab) {
      case 'game':
        this.tabContainer.addChild(this.gameView);
        break;
      case 'soul':
        this.tabContainer.addChild(this.soulView);
        break;
      case 'quests':
        this.questPanel.rebuildList();
        this.tabContainer.addChild(this.questsView);
        break;
    }
  }

  private setupEvents(): void {
    this.engine.events.on((event) => {
      switch (event.type) {
        case 'death':
          this.showDeath();
          this.activityLog.addGameEvent('death', `Died — lost ${formatNumber(event.karmaLost)} karma`);
          break;
        case 'rebirth':
          // Rebirth burst
          this.mandala.pulse(2);
          this.particles.burst(30, 0xbb88ff);
          this.activityLog.addGameEvent('rebirth', `Reborn (Life #${event.lifeNumber}) +${formatNumber(event.karmaEarned)} karma`);
          break;
        case 'upgrade_purchased': {
          // Visual punch on life upgrade purchase
          this.mandala.pulse(0.8);
          this.particles.burst(15, 0xc0c0c0);
          const lifeDef = LIFE_UPGRADES.find((u) => u.id === event.upgradeId);
          this.activityLog.addGameEvent('upgrade_purchased', `Upgrade: ${lifeDef?.name ?? event.upgradeId}`);
          break;
        }
        case 'soul_upgrade_purchased': {
          // Bigger punch for soul upgrades
          this.mandala.pulse(1.5);
          this.particles.burst(25, 0xff88aa);
          const soulDef = SOUL_UPGRADES.find((u) => u.id === event.upgradeId);
          this.activityLog.addGameEvent('soul_upgrade_purchased', `Soul Upgrade: ${soulDef?.name ?? event.upgradeId} Lv${event.level}`);
          break;
        }
        case 'enlightenment_reached':
          this.mandala.setEnlightenmentTier(event.tier);
          this.mandala.pulse(3);
          const tierColors = [0, 0x88ccff, 0xcc88ff, 0xffffff];
          this.particles.burst(40, tierColors[event.tier]);
          this.showMilestonePopup(event.tierName, event.tier);
          this.activityLog.addGameEvent('enlightenment_reached', `${event.tierName} reached`);
          break;
        case 'nirvana_challenge_started':
          this.mandala.pulse(1.5);
          this.particles.burst(20, 0xcc88ff);
          this.activityLog.addGameEvent('nirvana_challenge_started', 'Nirvana trial begun');
          break;
        case 'nirvana_achieved':
          this.showVictoryScreen(event.stats);
          this.activityLog.addGameEvent('nirvana_achieved', 'NIRVANA achieved!');
          break;
      }
    });
  }

  private showDeath(): void {
    const state = this.engine.state;
    // Different message for Nirvana challenge failure
    if (state.nirvanaChallengeTimer > 0 || state.nirvanaChallengeActive) {
      this.deathSubtext.text = 'Your Nirvana trial has ended. Prepare and try again.';
    } else {
      this.deathSubtext.text = '75% of this life\'s karma was lost.';
    }
    this.deathOverlay.visible = true;
  }

  private showMilestonePopup(tierName: string, tier: number): void {
    const flavorTexts: Record<number, string> = {
      1: 'Your soul begins to stir. The cycle reveals its pattern.',
      2: 'Wisdom deepens. The path to liberation grows clearer.',
    };

    this.milestoneTitle.text = tierName;
    this.milestoneTitle.style.fill = tier === 1 ? 0x88ccff : 0xcc88ff;
    this.milestoneSubtext.text = flavorTexts[tier] || '';
    this.milestoneTimer = 3;
    this.milestoneOverlay.visible = true;
  }

  private showVictoryScreen(stats: VictoryStats): void {
    const gw = CONFIG.display.referenceWidth;

    // Clear and rebuild
    this.victoryOverlay.removeChildren();

    const bg = new Graphics();
    bg.rect(0, 0, gw, CONFIG.display.referenceHeight);
    bg.fill({ color: 0x000011, alpha: 0.92 });
    this.victoryOverlay.addChild(bg);

    const titleText = new Text({
      text: 'NIRVANA',
      style: {
        fontFamily: 'monospace',
        fontSize: 72,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    titleText.anchor.set(0.5);
    titleText.x = gw / 2;
    titleText.y = 400;
    this.victoryOverlay.addChild(titleText);

    const subtitle = new Text({
      text: 'You have transcended the cycle of rebirth',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xffd700,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.x = gw / 2;
    subtitle.y = 500;
    this.victoryOverlay.addChild(subtitle);

    const statLines = [
      `Total Karma:    ${formatNumber(stats.totalKarma)}`,
      `Lives Lived:    ${stats.totalLives}`,
      `Total Time:     ${formatDuration(stats.totalPlayTime)}`,
      `Final Trial:    ${formatDuration(stats.finalLifeTime)}`,
    ];

    statLines.forEach((line, i) => {
      const text = new Text({
        text: line,
        style: {
          fontFamily: 'monospace',
          fontSize: 26,
          fill: 0xcccccc,
        },
      });
      text.anchor.set(0.5);
      text.x = gw / 2;
      text.y = 650 + i * 50;
      this.victoryOverlay.addChild(text);
    });

    const continueBtn = new ActionButton('Continue Playing', 400, 80, 0x446644, () => {
      this.victoryOverlay.visible = false;
      // If the player is dead (died during/after nirvana), revive them
      if (!this.engine.state.isAlive) {
        performDeathRebirth(this.engine.state, this.engine.events);
        this.deathOverlay.visible = false;
        resetLifeEvents();
        this.eventLog.clear();
      }
    });
    continueBtn.x = gw / 2 - 200;
    continueBtn.y = 950;
    this.victoryOverlay.addChild(continueBtn);

    this.victoryOverlay.visible = true;
  }

  /** Register a callback for when the player changes their name */
  onNameChange?: (newName: string) => void;

  private async promptNameChange(): Promise<void> {
    const currentName = this.engine.state.playerName;
    const newName = await showNamePrompt({
      title: 'Change Name',
      subtitle: 'Choose a new name (must be unique)',
      buttonText: 'Change',
      currentName,
    });
    if (newName && newName !== currentName) {
      this.engine.state.playerName = newName;
      this.profileMenu.setPlayerName(newName);
      this.activityLog.setPlayerName(newName);
      this.onNameChange?.(newName);
    }
  }

  private applyEnlightenmentTheme(tier: number): void {
    const theme = CONFIG.enlightenmentThemes[Math.min(tier, CONFIG.enlightenmentThemes.length - 1)];
    this.bgRect.clear();
    this.bgRect.rect(0, 0, CONFIG.display.referenceWidth, CONFIG.display.referenceHeight);
    this.bgRect.fill({ color: theme.bgColor });
    this.particles.setColorPalette(theme.particleColors);
    this.mandala.setThemeColor(theme.mandalaColor);
  }

  showToast(message: string): void {
    this.toastManager.show({ message });
  }

  updateActivityLogLayout(layout: import('../layout').LayoutInfo): void {
    this.activityLog.updatePosition(layout);
  }

  update(dt: number): void {
    const state = this.engine.state;
    const netKarmaRate = getNetKarmaPerSecond(state);
    const wealthRate = getWealthPerSecond(state);
    const karmaDrain = getKarmaDrainPerSecond(state);

    // Apply visual theme when enlightenment tier changes
    if (state.enlightenmentTier !== this.lastEnlightenmentTier) {
      this.lastEnlightenmentTier = state.enlightenmentTier;
      this.applyEnlightenmentTheme(state.enlightenmentTier);
    }

    // Audio — responds to game state intensity
    this.audioManager.update(state, netKarmaRate);

    // Header — life number on left, time/multiplier on right
    this.headerText.text = `Life #${state.lifeNumber}`;
    let rightStr = `${formatDuration(state.lifeTimeElapsed)}  |  x${state.karmaMultiplier.toFixed(2)}`;
    if (state.nirvanaChallengeActive) {
      rightStr += '  |  TRIAL';
    }
    this.headerRightText.text = rightStr;

    // Nirvana challenge timer
    if (state.nirvanaChallengeActive) {
      const remaining = getNirvanaChallengeRemaining(state);
      this.nirvanaTimerText.text = `NIRVANA TRIAL: ${formatDuration(remaining)}`;
      this.nirvanaTimerText.visible = true;
      // Pulse the timer text alpha
      this.nirvanaTimerText.alpha = 0.7 + Math.sin(state.lifeTimeElapsed * 3) * 0.3;
    } else {
      this.nirvanaTimerText.visible = false;
    }

    // Resource counters — show net rate (can be negative with material upgrades)
    this.karmaCounter.updateValue(state.currentKarma, netKarmaRate);
    this.wealthCounter.updateValue(state.wealth, wealthRate);

    // Karma bank display — replaces lifetime karma during gameplay
    this.lifetimeKarmaText.visible = false;

    let bankInfo = `Karma Bank: ${formatNumber(state.karma)}`;
    if (state.bankedKarma > 0) {
      const bankMult = 1 + Math.sqrt(state.bankedKarma) * CONFIG.karmaBank.coefficient;
      bankInfo += `  (x${bankMult.toFixed(2)})`;
    }
    if (karmaDrain > 0) {
      bankInfo += `  |  Drain: -${formatNumber(karmaDrain)}/s`;
    }
    this.bankedKarmaText.text = bankInfo;
    this.bankedKarmaText.visible = true;

    // Need bars
    this.hungerBar.updateValue(state.needs.hunger);
    this.shelterBar.updateValue(state.needs.shelter);
    this.healthBar.updateValue(state.needs.health);

    // Button costs + urgent highlight when needs are low
    const feedCost = getFeedCost(state);
    this.feedButton.setCost(`${feedCost} wealth`);
    this.feedButton.setEnabled(state.wealth >= feedCost && state.isAlive);
    this.feedButton.setUrgent(state.isAlive && state.needs.hunger < 60);
    this.feedButton.updateUrgentGlow();

    const repairCost = getRepairCost(state);
    this.repairButton.setCost(`${repairCost} wealth`);
    this.repairButton.setEnabled(state.wealth >= repairCost && state.isAlive);
    this.repairButton.setUrgent(state.isAlive && state.needs.shelter < 60);
    this.repairButton.updateUrgentGlow();

    // Rebirth button — disabled during Nirvana challenge
    const rebirthKarma = getRebirthKarma(state);
    this.rebirthButton.setCost(`+${formatNumber(rebirthKarma)} karma`);
    this.rebirthButton.setEnabled(state.isAlive && !state.nirvanaChallengeActive);

    // Auto toggles — only visible when unlocked
    const hasAutoFeed = getSoulUpgradeLevel(state, 'auto_feed') > 0;
    const hasAutoRepair = getSoulUpgradeLevel(state, 'auto_repair') > 0;
    this.autoFeedToggle.visible = hasAutoFeed;
    this.autoRepairToggle.visible = hasAutoRepair;
    this.autoFeedThresholdControl.visible = hasAutoFeed;
    this.autoRepairThresholdControl.visible = hasAutoRepair;
    if (hasAutoFeed) {
      this.updateToggle(this.autoFeedToggle, state.autoFeedEnabled);
      this.updateThresholdStepper(this.autoFeedThresholdControl, state.autoFeedThreshold);
    }
    if (hasAutoRepair) {
      this.updateToggle(this.autoRepairToggle, state.autoRepairEnabled);
      this.updateThresholdStepper(this.autoRepairThresholdControl, state.autoRepairThreshold);
    }

    // Quest panel tick (always, to update active quest timer display)
    if (this.currentTab === 'quests') {
      this.questPanel.tick();
    }

    // Inline upgrade shop — rebuild layout (only unpurchased shown)
    if (this.currentTab === 'game') {
      this.layoutUpgrades();
    }

    // Soul tab upgrades
    if (this.currentTab === 'soul') {
      const btns = this.soulView.children.filter((c) => c instanceof ActionButton) as ActionButton[];
      SOUL_UPGRADES.forEach((def, i) => {
        if (btns[i]) {
          const level = getSoulUpgradeLevel(state, def.id);
          const cost = getSoulUpgradeCost(def, level);
          if (level >= def.maxLevel) {
            btns[i].setButtonState('purchased');
            btns[i].setCost(`MAX · ${def.effectLabel(level)}`);
          } else if (canBuySoulUpgrade(state, def)) {
            btns[i].setButtonState('available');
            btns[i].setCost(`Lv${level}/${def.maxLevel} · ${formatNumber(cost)} karma`);
          } else {
            btns[i].setButtonState('disabled');
            btns[i].setCost(`Lv${level}/${def.maxLevel} · ${formatNumber(cost)} karma`);
          }
        }
      });

      // Seek Nirvana button visibility
      this.seekNirvanaButton.visible = state.nirvanaUnlocked && !state.nirvanaAchieved && !state.nirvanaChallengeActive;
    }

    // Milestone popup auto-dismiss
    if (this.milestoneTimer > 0) {
      this.milestoneTimer -= dt;
      if (this.milestoneTimer <= 0) {
        this.milestoneOverlay.visible = false;
      }
    }

    // Life events log
    const lifeEvent = this.engine.lastLifeEvent;
    if (lifeEvent) {
      this.eventLog.addEntry(lifeEvent.text, lifeEvent.severity, lifeEvent.color);
      this.activityLog.addLifeEvent(lifeEvent.text, lifeEvent.severity);
      this.engine.lastLifeEvent = null;
    }
    this.eventLog.animate(dt);

    // Mandala animation — slows down or stops when karma is draining
    const visualKarmaRate = Math.max(0, netKarmaRate);
    this.mandala.setSpeed(visualKarmaRate);
    this.mandala.animate(dt);

    // Particles — fewer/none when karma rate is low or negative
    this.particles.setSpawnRate(visualKarmaRate);
    this.particles.animate(dt);

    // Karma milestone burst celebrations
    this.checkKarmaMilestones(state);

    // Number pops — spawn more frequently, pop threshold based on rate
    const popThreshold = Math.max(0.3, 1 / (1 + Math.abs(netKarmaRate) * 0.2));
    if (netKarmaRate > 0) {
      this.karmaPopAccum += netKarmaRate * dt;
      if (this.karmaPopAccum >= popThreshold) {
        const amount = Math.floor(this.karmaPopAccum);
        if (amount >= 1) {
          this.numberPops.spawn(amount);
          this.karmaPopAccum -= amount;
        }
      }
    } else if (netKarmaRate < 0) {
      // Show red drain pops when karma is being consumed
      this.karmaPopAccum += Math.abs(netKarmaRate) * dt;
      if (this.karmaPopAccum >= popThreshold) {
        const amount = Math.floor(this.karmaPopAccum);
        if (amount >= 1) {
          this.numberPops.spawn(-amount, 0xdc143c);
          this.karmaPopAccum -= amount;
        }
      }
    }
    this.numberPops.animate(dt);
  }

  private readonly KARMA_MILESTONES = [1_000, 5_000, 10_000, 50_000, 100_000, 200_000];

  private checkKarmaMilestones(state: import('../../state/GameState').GameState): void {
    const totalKarma = state.karma;
    for (let i = this.KARMA_MILESTONES.length - 1; i >= 0; i--) {
      const milestone = this.KARMA_MILESTONES[i];
      if (totalKarma >= milestone && state.lastCelebratedKarmaMilestone < milestone) {
        state.lastCelebratedKarmaMilestone = milestone;
        this.particles.burst(60, 0xffd700);
        break;
      }
    }
  }
}
