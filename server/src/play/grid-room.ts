import { BOARD_SIZE, cellIndex, countCells, usedFootballerIds } from '@sportapps/game-core';
import { EXTRA_TIME_SECONDS } from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { DEFAULT_BOT_TIMING, botLevelFor, createBotPlayer, type BotTiming } from './bot';
import { NO_JOKER, SIDES, type LiveRoom, type RoomFactory } from './live-room';
import { createMatchRoom } from './room';

const SECOND = 1000;

export function createGridRoomFactory(library: FootballLibrary, timing: BotTiming = DEFAULT_BOT_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const grid = library.pickGrid(market, difficulty, random);
    if (!grid) {
      return null;
    }

    const room = createMatchRoom({
      id,
      kind,
      market,
      difficulty,
      grid,
      seats,
      startingSide: random() < 0.5 ? 'x' : 'o',
      library,
      now,
      onMove: (inner, move) => {
        SIDES.forEach((side) =>
          context.send(side, { type: 'move', matchId: id, move, turnEndsIn: inner.turnEndsIn() }),
        );
        bots.forEach((bot) => bot.takeTurn());
      },
      onFinished: (_, result) => {
        bots.forEach((bot) => bot.stop());
        context.onFinished(live, result);
      },
    });

    const bots = SIDES.filter((side) => seats[side].userId === null).map((side) =>
      createBotPlayer({
        room,
        side,
        level: botLevelFor(difficulty, context.rivalOutcomes),
        library,
        random,
        timing,
      }),
    );

    const live: LiveRoom = {
      id,
      kind,
      game: 'grid',
      seats,
      sideOf: room.sideOf,
      start() {
        room.start();
        bots.forEach((bot) => bot.takeTurn());
      },
      greeting: (side, opponentConnected) => ({ type: 'match', match: room.snapshot(side, opponentConnected) }),
      handle(side, message) {
        if (message.type !== 'answer') {
          return 'invalid-message';
        }
        return room.answer(side, message.turnNumber, message.cell, message.footballerId);
      },
      forfeit: room.forfeit,
      useJoker(side, joker, target) {
        const state = room.state();
        if (state.result || state.turn !== side) {
          return { error: 'invalid-action' };
        }
        if (joker === 'extra-time') {
          const seconds = EXTRA_TIME_SECONDS.grid ?? 0;
          room.extendTurn(seconds * SECOND);
          return { reveal: { kind: 'time', seconds } };
        }
        if (joker === 'hint') {
          const cell = target.cell;
          if (
            !cell ||
            cell.row < 0 ||
            cell.row >= BOARD_SIZE ||
            cell.column < 0 ||
            cell.column >= BOARD_SIZE ||
            state.cells[cellIndex(cell)] !== null
          ) {
            return { error: 'invalid-action' };
          }
          const used = usedFootballerIds(state);
          const [option] = library.knownAnswers(market, grid, [cell], library.minimumFame(difficulty));
          const open = (option?.footballerIds ?? []).filter((footballerId) => !used.includes(footballerId));
          return open.length > 0
            ? { reveal: { kind: 'initials', footballerId: open[Math.floor(random() * open.length)] as number, birthYear: true } }
            : { error: 'invalid-action' };
        }
        return NO_JOKER();
      },
      finishedAt: room.finishedAt,
      record: () => ({
        game: 'grid',
        market,
        difficulty,
        gridId: grid.id,
        scores: { x: countCells(room.state(), 'x'), o: countCells(room.state(), 'o') },
        moveCount: room.moves().length,
        startedAt: room.startedAt,
      }),
      dispose() {
        bots.forEach((bot) => bot.stop());
        room.dispose();
      },
    };
    return live;
  };
}
