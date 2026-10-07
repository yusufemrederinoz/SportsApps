import { GAME_IDS, type GameId, type GameView, type PlayResult } from '@sportapps/protocol';

import { draftCardIds, finishDraftView } from '@/features/draft/online';
import { duelCardIds, finishDuelView } from '@/features/duel/online';
import { finishHigherView, higherCardIds } from '@/features/higher/online';

export const GAMES: readonly GameId[] = GAME_IDS;

export const GAME_LABELS = {
  grid: 'games.grid',
  duel: 'games.duel',
  draft: 'games.draft',
  higher: 'games.higher',
} as const satisfies Record<GameId, string>;

export const GAME_ACCENTS = {
  grid: 'home.titleAccent',
  duel: 'home.titleAccentDuel',
  draft: 'home.titleAccentDraft',
  higher: 'home.titleAccentHigher',
} as const satisfies Record<GameId, string>;

export const GAME_SUBTITLES = {
  grid: 'home.subtitle',
  duel: 'home.subtitleDuel',
  draft: 'home.subtitleDraft',
  higher: 'home.subtitleHigher',
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
  }
}
