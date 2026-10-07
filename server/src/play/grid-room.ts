import { countCells } from '@sportapps/game-core';

import type { FootballLibrary } from '../football/library';
import { DEFAULT_BOT_TIMING, botLevelFor, createBotPlayer, type BotTiming } from './bot';
import { NO_JOKER, SIDES, type LiveRoom, type RoomFactory } from './live-room';
import { createMatchRoom } from './room';

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
      useJoker: NO_JOKER,
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
