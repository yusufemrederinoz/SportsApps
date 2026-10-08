import type { FinishReason } from '@sportapps/game-core';

const DETAIL_KEYS = {
  line: 'match.byLine',
  cells: 'match.byCells',
  misses: 'match.byFewerMisses',
  second: 'match.bySecondMove',
  forfeit: 'match.byCells',
} as const satisfies Record<FinishReason, string>;

export function resultDetailKey(reason: FinishReason | undefined) {
  return DETAIL_KEYS[reason ?? 'cells'];
}
