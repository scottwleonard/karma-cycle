import { CONFIG } from '../config';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_GAP = 128; // gap between sidebar and game canvas
const MIN_SIDEBAR_SPACE = 280; // minimum screen space to show a sidebar

export interface LayoutInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  gameWidth: number;
  gameHeight: number;
  /** Left sidebar position & size (null if not enough room) */
  leftPanel: { x: number; width: number } | null;
  /** Right sidebar position & size (null if not enough room) */
  rightPanel: { x: number; width: number } | null;
}

export function calculateLayout(screenWidth: number, screenHeight: number): LayoutInfo {
  const { referenceWidth, referenceHeight } = CONFIG.display;
  const scale = Math.min(
    screenWidth / referenceWidth,
    screenHeight / referenceHeight,
  );
  const gameWidth = referenceWidth * scale;
  const gameHeight = referenceHeight * scale;

  // Calculate how much space sidebars need
  const spacePerSide = (screenWidth - gameWidth) / 2;
  const showLeft = spacePerSide >= MIN_SIDEBAR_SPACE;
  const showRight = spacePerSide >= MIN_SIDEBAR_SPACE;

  // If sidebars fit, center the whole group (left panel + game + right panel)
  // Otherwise just center the game
  let offsetX: number;
  let leftPanel: LayoutInfo['leftPanel'] = null;
  let rightPanel: LayoutInfo['rightPanel'] = null;

  if (showLeft && showRight) {
    const panelW = Math.min(spacePerSide - SIDEBAR_GAP - 16, SIDEBAR_WIDTH);
    const totalWidth = panelW + SIDEBAR_GAP + gameWidth + SIDEBAR_GAP + panelW;
    const groupLeft = Math.floor((screenWidth - totalWidth) / 2);

    leftPanel = { x: groupLeft, width: panelW };
    offsetX = groupLeft + panelW + SIDEBAR_GAP;
    rightPanel = { x: offsetX + gameWidth + SIDEBAR_GAP, width: panelW };
  } else {
    offsetX = (screenWidth - gameWidth) / 2;
  }

  return {
    scale,
    offsetX,
    offsetY: (screenHeight - gameHeight) / 2,
    width: screenWidth,
    height: screenHeight,
    gameWidth,
    gameHeight,
    leftPanel,
    rightPanel,
  };
}
