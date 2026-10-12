import { Spacing } from '@/constants/theme';

export const BOARD_ROWS = 4;
export const BOARD_PADDING = Spacing.two;
export const ROW_GAP = Spacing.one;
export const HEADER_HEIGHT = 18;
export const NAME_HEIGHT = 13;
export const VALUE_HEIGHT = 15;

const MINIMUM_SLOT_SIZE = 40;
const MAXIMUM_SLOT_SIZE = 60;
const BOARD_CHROME_HEIGHT =
  BOARD_PADDING * 2 + HEADER_HEIGHT + ROW_GAP * BOARD_ROWS + (NAME_HEIGHT + VALUE_HEIGHT) * BOARD_ROWS;

export function boardHeightFor(available: number): number {
  const minimum = BOARD_CHROME_HEIGHT + MINIMUM_SLOT_SIZE * BOARD_ROWS;
  const maximum = BOARD_CHROME_HEIGHT + MAXIMUM_SLOT_SIZE * BOARD_ROWS;
  return Math.max(minimum, Math.min(maximum, Math.floor(available)));
}

export function slotSizeFor(boardHeight: number): number {
  const size = Math.floor((boardHeight - BOARD_CHROME_HEIGHT) / BOARD_ROWS);
  return Math.max(MINIMUM_SLOT_SIZE, Math.min(MAXIMUM_SLOT_SIZE, size));
}
