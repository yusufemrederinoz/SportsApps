import type { CareerView, PlayResult } from '@sportapps/protocol';

export function careerCardIds(view: CareerView): number[] {
  return Array.from(
    new Set([
      ...(view.lastGuess?.footballerId == null ? [] : [view.lastGuess.footballerId]),
      ...(view.answer === null ? [] : [view.answer]),
    ]),
  );
}

export function finishCareerView(view: CareerView, result: PlayResult): CareerView {
  return view.result ? view : { ...view, phase: 'finished', deadlineIn: 0, result };
}
