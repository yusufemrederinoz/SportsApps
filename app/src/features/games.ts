import { GAME_IDS, type GameId, type GameView, type PlayResult } from '@sportapps/protocol';

import { draftCardIds, finishDraftView } from '@/features/draft/online';
import { duelCardIds, finishDuelView } from '@/features/duel/online';

export const GAMES: readonly GameId[] = GAME_IDS;

export const GAME_LABELS = {
  grid: 'games.grid',
  duel: 'games.duel',
  draft: 'games.draft',
} as const satisfies Record<GameId, string>;

export const GAME_ACCENTS = {
  grid: 'home.titleAccent',
  duel: 'home.titleAccentDuel',
  draft: 'home.titleAccentDraft',
} as const satisfies Record<GameId, string>;

export const GAME_SUBTITLES = {
  grid: 'home.subtitle',
  duel: 'home.subtitleDuel',
  draft: 'home.subtitleDraft',
} as const satisfies Record<GameId, string>;

export function parseGame(value: string | undefined): GameId {
  return GAMES.find((game) => game === value) ?? 'grid';
}

export function gameCardIds(state: GameView): number[] {
  return state.game === 'duel' ? duelCardIds(state.view) : draftCardIds(state.view);
}

export function finishGameView(state: GameView, result: PlayResult): GameView {
  return state.game === 'duel'
    ? { game: 'duel', view: finishDuelView(state.view, result) }
    : { game: 'draft', view: finishDraftView(state.view, result) };
}
