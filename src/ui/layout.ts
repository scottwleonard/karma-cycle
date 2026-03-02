import { CONFIG } from '../config';

export interface LayoutInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  gameWidth: number;
  gameHeight: number;
}

export function calculateLayout(screenWidth: number, screenHeight: number): LayoutInfo {
  const { referenceWidth, referenceHeight } = CONFIG.display;
  const scale = Math.min(
    screenWidth / referenceWidth,
    screenHeight / referenceHeight,
  );
  const gameWidth = referenceWidth * scale;
  const gameHeight = referenceHeight * scale;
  return {
    scale,
    offsetX: (screenWidth - gameWidth) / 2,
    offsetY: (screenHeight - gameHeight) / 2,
    width: screenWidth,
    height: screenHeight,
    gameWidth,
    gameHeight,
  };
}
