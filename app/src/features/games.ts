import { GAME_IDS, type GameId, type GameView, type PlayResult } from '@sportapps/protocol';

import { chainCardIds, finishChainView } from '@/features/chain/online';
import { draftCardIds, finishDraftView } from '@/features/draft/online';
import { duelCardIds, finishDuelView } from '@/features/duel/online';
import { finishHigherView, higherCardIds } from '@/features/higher/online';
import { finishRareView, rareCardIds } from '@/features/rare/online';

export const GAMES: readonly GameId[] = GAME_IDS;

export const GAME_LABELS = {
  grid: 'games.grid',
  duel: 'games.duel',
  draft: 'games.draft',
  higher: 'games.higher',
  chain: 'games.chain',
  rare: 'games.rare',
} as const satisfies Record<GameId, string>;

export const GAME_ACCENTS = {
  grid: 'home.titleAccent',
  duel: 'home.titleAccentDuel',
  draft: 'home.titleAccentDraft',
  higher: 'home.titleAccentHigher',
  chain: 'home.titleAccentChain',
  rare: 'home.titleAccentRare',
} as const satisfies Record<GameId, string>;

export const GAME_SUBTITLES = {
  grid: 'home.subtitle',
  duel: 'home.subtitleDuel',
  draft: 'home.subtitleDraft',
  higher: 'home.subtitleHigher',
  chain: 'home.subtitleChain',
  rare: 'home.subtitleRare',
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
  }
}
