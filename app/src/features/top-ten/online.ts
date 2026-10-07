import type { PlayResult, TopTenView } from '@sportapps/protocol';

export function topTenCardIds(view: TopTenView): number[] {
  const guessed = view.lastGuess?.footballerId ?? null;
  return Array.from(
    new Set([
      ...view.entries.flatMap((entry) => (entry.footballerId === null ? [] : [entry.footballerId])),
      ...(guessed === null ? [] : [guessed]),
    ]),
  );
}

export function finishTopTenView(view: TopTenView, result: PlayResult): TopTenView {
  return view.result ? view : { ...view, phase: 'finished', deadlineIn: 0, result };
}
