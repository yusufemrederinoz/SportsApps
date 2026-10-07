import type { PlayResult, RareView } from '@sportapps/protocol';

export function rareCardIds(view: RareView): number[] {
  return Array.from(
    new Set([
      ...(view.own === null ? [] : [view.own]),
      ...view.rounds.flatMap((round) =>
        [round.answers.x.footballerId, round.answers.o.footballerId].filter((id): id is number => id !== null),
      ),
    ]),
  );
}

export function finishRareView(view: RareView, result: PlayResult): RareView {
  return view.result ? view : { ...view, phase: 'finished', criteria: null, deadlineIn: 0, result };
}
