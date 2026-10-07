import type { AuctionView, PlayResult } from '@sportapps/protocol';

export function auctionCardIds(view: AuctionView): number[] {
  return Array.from(new Set([...view.named, ...view.missed]));
}

export function finishAuctionView(view: AuctionView, result: PlayResult): AuctionView {
  return view.result ? view : { ...view, phase: 'finished', deadlineIn: 0, result };
}
