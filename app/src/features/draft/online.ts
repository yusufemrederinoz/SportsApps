import type { DraftView, PlayResult } from '@sportapps/protocol';

export function draftCardIds(view: DraftView): number[] {
  return [...view.lineups.x, ...view.lineups.o].flatMap((slot) => (slot.footballerId === null ? [] : [slot.footballerId]));
}

export function finishDraftView(view: DraftView, result: PlayResult): DraftView {
  return view.result ? view : { ...view, phase: 'finished', deadlineIn: 0, result };
}
