import { describe, expect, it } from 'vitest';

import { BOT_PROFILES, chooseBotMove, createMatch, emptyCells, submitAnswer } from '../src';
import type { BotOption, BotProfile, Grid, MatchState, Side } from '../src';

const grid: Grid = {
  id: 1,
  rows: [
    { kind: 'club', referenceId: 10 },
    { kind: 'club', referenceId: 11 },
    { kind: 'club', referenceId: 12 },
  ],
  columns: [
    { kind: 'club', referenceId: 20 },
    { kind: 'club', referenceId: 21 },
    { kind: 'country', referenceId: 30 },
  ],
};

const certain: BotProfile = { accuracy: 1, answerPool: 3 };

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function play(moves: [Side, number, number, number][], startingSide: Side = 'x'): MatchState {
  return moves.reduce(
    (state, [side, row, column, footballerId]) =>
      submitAnswer(state, side, { row, column }, footballerId, () => true).state,
    createMatch(grid, startingSide),
  );
}

function optionsFor(state: MatchState, footballerIds: number[]): BotOption[] {
  return emptyCells(state).map((position) => ({ position, footballerIds }));
}

describe('chooseBotMove', () => {
  it('skips when the accuracy roll fails', () => {
    const state = createMatch(grid, 'o');
    const move = chooseBotMove(state, 'o', optionsFor(state, [1, 2]), { accuracy: 0.5, answerPool: 3 }, sequence(0.9));
    expect(move).toEqual({ kind: 'skip' });
  });

  it('skips when it knows no answer for any empty cell', () => {
    const state = createMatch(grid, 'o');
    expect(chooseBotMove(state, 'o', optionsFor(state, []), certain, sequence(0))).toEqual({ kind: 'skip' });
    expect(chooseBotMove(state, 'o', [], certain, sequence(0))).toEqual({ kind: 'skip' });
  });

  it('completes its own line when it can', () => {
    const state = play([
      ['o', 0, 0, 1],
      ['x', 1, 0, 2],
      ['o', 0, 1, 3],
      ['x', 1, 1, 4],
    ], 'o');
    const move = chooseBotMove(state, 'o', optionsFor(state, [50, 51]), certain, sequence(0));
    expect(move).toMatchObject({ kind: 'answer', position: { row: 0, column: 2 } });
  });

  it('blocks the opponent when it cannot win', () => {
    const state = play([
      ['x', 1, 0, 1],
      ['o', 0, 0, 2],
      ['x', 1, 1, 3],
    ]);
    const move = chooseBotMove(state, 'o', optionsFor(state, [50, 51]), certain, sequence(0));
    expect(move).toMatchObject({ kind: 'answer', position: { row: 1, column: 2 } });
  });

  it('prefers the centre on an open board', () => {
    const state = createMatch(grid, 'o');
    const move = chooseBotMove(state, 'o', optionsFor(state, [50]), certain, sequence(0));
    expect(move).toEqual({ kind: 'answer', position: { row: 1, column: 1 }, footballerId: 50 });
  });

  it('never repeats a footballer that is already on the board', () => {
    const state = play([['x', 0, 0, 50]]);
    const move = chooseBotMove(state, 'o', optionsFor(state, [50, 51]), certain, sequence(0));
    expect(move).toMatchObject({ kind: 'answer', footballerId: 51 });
  });

  it('only considers the best known answers allowed by its profile', () => {
    const state = createMatch(grid, 'o');
    const profile: BotProfile = { accuracy: 1, answerPool: 2 };
    const move = chooseBotMove(state, 'o', optionsFor(state, [50, 51, 52, 53]), profile, sequence(0, 0, 0.99));
    expect(move).toMatchObject({ kind: 'answer', footballerId: 51 });
  });

  it('gets stronger with each level', () => {
    expect(BOT_PROFILES[1].accuracy).toBeLessThan(BOT_PROFILES[2].accuracy);
    expect(BOT_PROFILES[2].accuracy).toBeLessThan(BOT_PROFILES[3].accuracy);
  });
});
