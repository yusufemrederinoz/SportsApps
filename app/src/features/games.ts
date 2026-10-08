import { ACTIVE_GAME_IDS, type GameId, type GameView, type PlayResult } from '@sportapps/protocol';

import { auctionCardIds, finishAuctionView } from '@/features/auction/online';
import { careerCardIds, finishCareerView } from '@/features/career/online';
import { chainCardIds, finishChainView } from '@/features/chain/online';
import { draftCardIds, finishDraftView } from '@/features/draft/online';
import { duelCardIds, finishDuelView } from '@/features/duel/online';
import { finishHigherView, higherCardIds } from '@/features/higher/online';
import { finishRareView, rareCardIds } from '@/features/rare/online';
import { finishTopTenView, topTenCardIds } from '@/features/top-ten/online';

export const GAMES: readonly GameId[] = ACTIVE_GAME_IDS;

export const GAME_LABELS = {
  grid: 'games.grid',
  duel: 'games.duel',
  draft: 'games.draft',
  higher: 'games.higher',
  chain: 'games.chain',
  rare: 'games.rare',
  auction: 'games.auction',
  'top-ten': 'games.top-ten',
  career: 'games.career',
} as const satisfies Record<GameId, string>;

export const GAME_ACCENTS = {
  grid: 'home.titleAccent',
  duel: 'home.titleAccentDuel',
  draft: 'home.titleAccentDraft',
  higher: 'home.titleAccentHigher',
  chain: 'home.titleAccentChain',
  rare: 'home.titleAccentRare',
  auction: 'home.titleAccentAuction',
  'top-ten': 'home.titleAccentTopTen',
  career: 'home.titleAccentCareer',
} as const satisfies Record<GameId, string>;

export const GAME_SUBTITLES = {
  grid: 'home.subtitle',
  duel: 'home.subtitleDuel',
  draft: 'home.subtitleDraft',
  higher: 'home.subtitleHigher',
  chain: 'home.subtitleChain',
  rare: 'home.subtitleRare',
  auction: 'home.subtitleAuction',
  'top-ten': 'home.subtitleTopTen',
  career: 'home.subtitleCareer',
} as const satisfies Record<GameId, string>;

export function parseGame(value: string | undefined): GameId {
  return GAMES.find((game) => game === value) ?? 'grid';
}

export function gameCardIds(state: GameView): number[] {
  switch (state.game) {
    case 'duel':
      return duelCardIds(state.view);
    case 'draft':
      return draftCardIds(state.view);
    case 'higher':
      return higherCardIds(state.view);
    case 'chain':
      return chainCardIds(state.view);
    case 'rare':
      return rareCardIds(state.view);
    case 'auction':
      return auctionCardIds(state.view);
    case 'top-ten':
      return topTenCardIds(state.view);
    case 'career':
      return careerCardIds(state.view);
  }
}

export function finishGameView(state: GameView, result: PlayResult): GameView {
  switch (state.game) {
    case 'duel':
      return { game: 'duel', view: finishDuelView(state.view, result) };
    case 'draft':
      return { game: 'draft', view: finishDraftView(state.view, result) };
    case 'higher':
      return { game: 'higher', view: finishHigherView(state.view, result) };
    case 'chain':
      return { game: 'chain', view: finishChainView(state.view, result) };
    case 'rare':
      return { game: 'rare', view: finishRareView(state.view, result) };
    case 'auction':
      return { game: 'auction', view: finishAuctionView(state.view, result) };
    case 'top-ten':
      return { game: 'top-ten', view: finishTopTenView(state.view, result) };
    case 'career':
      return { game: 'career', view: finishCareerView(state.view, result) };
  }
}
