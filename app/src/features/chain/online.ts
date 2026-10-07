import type { ChainView, PlayResult } from '@sportapps/protocol';

export function chainCardIds(view: ChainView): number[] {
  const missed = view.miss?.footballerId ?? null;
  return Array.from(new Set([...view.chain.map((link) => link.footballerId), ...(missed === null ? [] : [missed])]));
}

export function chainClubIds(view: ChainView): number[] {
  return Array.from(new Set(view.chain.flatMap((link) => (link.clubId === null ? [] : [link.clubId]))));
}

export function finishChainView(view: ChainView, result: PlayResult): ChainView {
  return view.result ? view : { ...view, phase: 'finished', deadlineIn: 0, result };
}
