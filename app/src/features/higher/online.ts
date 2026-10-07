import type { HigherView, PlayResult } from '@sportapps/protocol';

export function higherCardIds(view: HigherView): number[] {
  return Array.from(new Set([...(view.question?.cards ?? []), ...(view.last?.question.cards ?? [])]));
}

export function finishHigherView(view: HigherView, result: PlayResult): HigherView {
  return view.result ? view : { ...view, phase: 'finished', question: null, deadlineIn: 0, result };
}
