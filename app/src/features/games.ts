import { GAME_IDS, type GameId } from '@sportapps/protocol';

export const GAMES: readonly GameId[] = GAME_IDS;

export const GAME_LABELS = {
  grid: 'games.grid',
  duel: 'games.duel',
} as const satisfies Record<GameId, string>;

export function parseGame(value: string | undefined): GameId {
  return GAMES.find((game) => game === value) ?? 'grid';
}
