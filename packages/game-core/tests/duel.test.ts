import { describe, expect, it } from 'vitest';

import {
  DuelError,
  compareValues,
  createDuel,
  currentQuestion,
  duelWinner,
  handsReady,
  isValidHand,
  pendingSides,
  playCard,
  startPlay,
  submitHand,
  type DuelQuestion,
  type DuelState,
} from '../src/duel';

type Metric = 'goals' | 'older';

const HAND_X = [1, 2, 3, 4, 5, 6, 7];
const HAND_O = [11, 12, 13, 14, 15, 16, 17];
const QUESTIONS: DuelQuestion<Metric>[] = [
  { metric: 'goals', prefer: 'high' },
  { metric: 'older', prefer: 'low' },
  { metric: 'goals', prefer: 'high' },
  { metric: 'goals', prefer: 'high' },
  { metric: 'older', prefer: 'low' },
  { metric: 'goals', prefer: 'high' },
  { metric: 'goals', prefer: 'high' },
];

const valueOf = (footballerId: number, metric: Metric): number | null => {
  if (footballerId === 7) {
    return null;
  }
  return metric === 'goals' ? footballerId * 10 : 2000 - footballerId;
};

function ready(): DuelState<Metric> {
  const picked = submitHand(submitHand(createDuel<Metric>(), 'x', HAND_X), 'o', HAND_O);
  return startPlay(picked, QUESTIONS);
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return error instanceof DuelError ? error.code : 'other';
  }
  return 'none';
}

describe('hands', () => {
  it('accepts seven different footballers and nothing else', () => {
    expect(isValidHand(HAND_X)).toBe(true);
    expect(isValidHand([1, 2, 3, 4, 5, 6])).toBe(false);
    expect(isValidHand([1, 1, 2, 3, 4, 5, 6])).toBe(false);
    expect(isValidHand([1, 2, 3, 4, 5, 6, 0])).toBe(false);
    expect(isValidHand([1, 2, 3, 4, 5, 6, 7.5])).toBe(false);
  });

  it('locks a hand once it is submitted', () => {
    const state = submitHand(createDuel<Metric>(), 'x', HAND_X);
    expect(state.hands.x).toEqual(HAND_X);
    expect(handsReady(state)).toBe(false);
    expect(pendingSides(state)).toEqual(['o']);
    expect(codeOf(() => submitHand(state, 'x', HAND_O))).toBe('hand-locked');
    expect(codeOf(() => submitHand(state, 'o', [1, 2]))).toBe('invalid-hand');
  });

  it('starts play only when both hands are in and there is a question per card', () => {
    const half = submitHand(createDuel<Metric>(), 'x', HAND_X);
    expect(codeOf(() => startPlay(half, QUESTIONS))).toBe('wrong-phase');
    const full = submitHand(half, 'o', HAND_O);
    expect(codeOf(() => startPlay(full, QUESTIONS.slice(0, 3)))).toBe('invalid-hand');
    expect(startPlay(full, QUESTIONS).phase).toBe('playing');
  });
});

describe('rounds', () => {
  it('keeps the first card hidden until the other side has played', () => {
    const state = playCard(ready(), 'x', 3, valueOf);
    expect(state.rounds).toHaveLength(0);
    expect(state.plays).toEqual({ x: 3 });
    expect(pendingSides(state)).toEqual(['o']);
    expect(codeOf(() => playCard(state, 'x', 4, valueOf))).toBe('already-played');
  });

  it('gives the point to the better value and removes both cards', () => {
    const state = playCard(playCard(ready(), 'x', 3, valueOf), 'o', 12, valueOf);
    expect(state.rounds[0]).toEqual({
      question: QUESTIONS[0],
      cards: { x: 3, o: 12 },
      values: { x: 30, o: 120 },
      winner: 'o',
    });
    expect(state.scores).toEqual({ x: 0, o: 1 });
    expect(state.remaining.x).not.toContain(3);
    expect(state.remaining.o).not.toContain(12);
    expect(currentQuestion(state)).toEqual(QUESTIONS[1]);
  });

  it('prefers the lower value when the question asks for it', () => {
    const first = playCard(playCard(ready(), 'x', 1, valueOf), 'o', 11, valueOf);
    const second = playCard(playCard(first, 'o', 12, valueOf), 'x', 2, valueOf);
    expect(second.rounds[1]?.values).toEqual({ x: 1998, o: 1988 });
    expect(second.rounds[1]?.winner).toBe('o');
  });

  it('refuses a card that is not in the hand or was already used', () => {
    const state = playCard(playCard(ready(), 'x', 3, valueOf), 'o', 12, valueOf);
    expect(codeOf(() => playCard(state, 'x', 3, valueOf))).toBe('card-not-in-hand');
    expect(codeOf(() => playCard(state, 'x', 99, valueOf))).toBe('card-not-in-hand');
  });

  it('finishes after seven rounds with the higher score as winner', () => {
    let state = ready();
    HAND_X.forEach((card, index) => {
      state = playCard(playCard(state, 'x', card, valueOf), 'o', HAND_O[index] as number, valueOf);
    });
    expect(state.phase).toBe('finished');
    expect(state.rounds).toHaveLength(7);
    expect(state.scores.x + state.scores.o).toBeLessThanOrEqual(7);
    expect(duelWinner(state)).toBe(state.scores.x > state.scores.o ? 'x' : 'o');
    expect(codeOf(() => playCard(state, 'x', 1, valueOf))).toBe('wrong-phase');
    expect(pendingSides(state)).toEqual([]);
  });
});

describe('compareValues', () => {
  it('awards nobody on equal or unknown values and beats an unknown value with a known one', () => {
    expect(compareValues(5, 5, 'high')).toBe(0);
    expect(compareValues(null, null, 'high')).toBe(0);
    expect(compareValues(5, null, 'high')).toBe(-1);
    expect(compareValues(null, 5, 'low')).toBe(1);
    expect(compareValues(9, 5, 'high')).toBe(-1);
    expect(compareValues(9, 5, 'low')).toBe(1);
  });

  it('reports a draw when the scores are level', () => {
    expect(duelWinner(createDuel())).toBeNull();
  });
});
