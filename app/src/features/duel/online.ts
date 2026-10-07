import type { DuelView, PlayResult } from '@sportapps/protocol';

export function duelCardIds(view: DuelView): number[] {
  return Array.from(
    new Set([
      ...(view.hand ?? []),
      ...view.remaining,
      ...view.rounds.flatMap((round) => [round.cards.x, round.cards.o]),
      ...(view.played === null ? [] : [view.played]),
    ]),
  );
}

export function finishDuelView(view: DuelView, result: PlayResult): DuelView {
  return view.result ? view : { ...view, phase: 'finished', question: null, deadlineIn: 0, result };
}
