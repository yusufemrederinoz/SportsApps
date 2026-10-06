import {
  BOT_PROFILES,
  chooseBotMove,
  emptyCells,
  headersAt,
  type CellPosition,
  type Side,
} from '@sportapps/game-core';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isCorrectAnswer,
  loadBotOptions,
  loadFootballer,
  loadGrid,
  loadMinimumFame,
  pickGridId,
  resolveMarket,
} from '@/data/queries';
import type { Difficulty, FootballerSummary, GridView, Market } from '@/data/types';

import { reduceSession, secondsLeft, startSession, type MatchSession } from './session';

export type MatchMode = 'local' | 'bot';

export const BOT_SIDE: Side = 'o';

const TICK_MILLISECONDS = 250;
const BOT_MINIMUM_DELAY = 1500;
const BOT_DELAY_SPREAD = 2500;

interface MatchSetup {
  market: Market;
  gridView: GridView;
  minimumFame: number;
}

export function useMatch(mode: MatchMode, difficulty: Difficulty) {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [round, setRound] = useState(0);
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [session, setSession] = useState<MatchSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const prepare = async () => {
      const market = await resolveMarket(database, language);
      const gridId = market ? await pickGridId(database, market.code, difficulty) : null;
      const gridView = gridId === null ? null : await loadGrid(database, gridId, language);
      const minimumFame = await loadMinimumFame(database, difficulty);
      if (cancelled) {
        return;
      }
      if (!market || !gridView) {
        setUnavailable(true);
        return;
      }
      const startedAt = Date.now();
      setSetup({ market, gridView, minimumFame });
      setNow(startedAt);
      setSession(startSession(gridView.grid, Math.random() < 0.5 ? 'x' : 'o', startedAt));
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [database, difficulty, language, round]);

  const active = session !== null && session.match.result === null;

  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = setInterval(() => {
      const time = Date.now();
      setNow(time);
      setSession((current) =>
        current && time >= current.turnEndsAt
          ? reduceSession(current, {
              type: 'skip',
              turnNumber: current.match.turnNumber,
              reason: 'timeout',
              now: time,
            })
          : current,
      );
    }, TICK_MILLISECONDS);
    return () => clearInterval(interval);
  }, [active]);

  const botToMove = mode === 'bot' && active && session.match.turn === BOT_SIDE;

  useEffect(() => {
    if (!botToMove || !session || !setup) {
      return;
    }
    let cancelled = false;
    const { match } = session;
    const play = async () => {
      const options = await loadBotOptions(
        database,
        setup.market.code,
        match.grid,
        emptyCells(match),
        setup.minimumFame,
      );
      const move = chooseBotMove(match, BOT_SIDE, options, BOT_PROFILES[difficulty]);
      const footballer = move.kind === 'answer' ? await loadFootballer(database, move.footballerId) : null;
      if (cancelled) {
        return;
      }
      setSession((current) =>
        current &&
        reduceSession(
          current,
          move.kind === 'answer' && footballer !== null
            ? {
                type: 'answer',
                turnNumber: match.turnNumber,
                position: move.position,
                footballer,
                correct: true,
                now: Date.now(),
              }
            : { type: 'skip', turnNumber: match.turnNumber, reason: 'bot-passed', now: Date.now() },
        ),
      );
    };
    const timer = setTimeout(() => void play(), BOT_MINIMUM_DELAY + Math.random() * BOT_DELAY_SPREAD);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [botToMove, session, setup, database, difficulty]);

  const answer = async (position: CellPosition, footballer: FootballerSummary) => {
    if (!session || session.match.result || checking) {
      return;
    }
    const { match } = session;
    const { row, column } = headersAt(match.grid, position);
    setChecking(true);
    try {
      const correct = await isCorrectAnswer(database, footballer.id, row, column);
      setSession((current) =>
        current &&
        reduceSession(current, {
          type: 'answer',
          turnNumber: match.turnNumber,
          position,
          footballer,
          correct,
          now: Date.now(),
        }),
      );
    } finally {
      setChecking(false);
    }
  };

  const restart = () => {
    setSession(null);
    setSetup(null);
    setUnavailable(false);
    setRound((current) => current + 1);
  };

  return {
    unavailable,
    setup,
    session,
    secondsLeft: session ? secondsLeft(session, now) : 0,
    canPlay: active && !checking && !botToMove,
    answer,
    restart,
  };
}
