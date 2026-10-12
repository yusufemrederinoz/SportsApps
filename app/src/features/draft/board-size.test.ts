import { describe, expect, it } from 'vitest';

import { fitSize } from '@/components/fit';

import { boardHeightFor, slotSizeFor } from './board-size';

describe('lineup board size', () => {
  it('gives the slots whatever the board has left, within limits', () => {
    expect(slotSizeFor(boardHeightFor(346))).toBe(46);
    expect(slotSizeFor(boardHeightFor(1000))).toBe(60);
    expect(slotSizeFor(boardHeightFor(100))).toBe(40);
  });

  it('never makes the board shorter than its smallest slots need', () => {
    expect(boardHeightFor(0)).toBe(boardHeightFor(-50));
    expect(slotSizeFor(boardHeightFor(0))).toBe(40);
  });
});

describe('fitSize', () => {
  it('keeps the preferred size until the screen has been measured', () => {
    expect(fitSize(170, 112, 0, 0)).toBe(170);
  });

  it('shrinks to what is left and stops at the minimum', () => {
    expect(fitSize(170, 112, 780, 640)).toBe(140);
    expect(fitSize(170, 112, 780, 700)).toBe(112);
  });

  it('does not grow past the preferred size', () => {
    expect(fitSize(170, 112, 900, 640)).toBe(170);
  });
});
