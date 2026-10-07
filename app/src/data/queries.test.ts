/// <reference types="node" />
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { emptyCells, createMatch, type Header } from '@sportapps/game-core';
import { afterAll, describe, expect, it } from 'vitest';

import {
  isCorrectAnswer,
  loadBotOptions,
  loadClubLabel,
  loadConceptLabel,
  loadFootballer,
  loadGrid,
  loadMinimumFame,
  pickGridId,
  resolveMarket,
  searchConceptFootballers,
  searchDraftFootballers,
  searchFootballers,
} from './queries';
import type { Difficulty, QueryRunner } from './types';

const databasePath = fileURLToPath(new URL('../../assets/data/football.db', import.meta.url));
const available = existsSync(databasePath);
const database = available ? new DatabaseSync(databasePath, { readOnly: true }) : null;

const runner: QueryRunner = {
  getAllAsync: async <T>(source: string, params: (string | number)[]) =>
    database!.prepare(source).all(...params) as T[],
  getFirstAsync: async <T>(source: string, params: (string | number)[]) =>
    (database!.prepare(source).get(...params) ?? null) as T | null,
};

const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const country = (referenceId: number): Header => ({ kind: 'country', referenceId });

const GALATASARAY = club(141);
const REAL_MADRID = club(418);
const MILAN = club(5);
const TURKEY = country(43);
const GERMANY = country(183);
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

async function footballerId(name: string): Promise<number> {
  const [first] = await searchFootballers(runner, 'tr', name, 1);
  if (!first) {
    throw new Error(`no footballer found for ${name}`);
  }
  return first.id;
}

afterAll(() => database?.close());

describe.skipIf(!available)('queries against the bundled database', () => {
  it('resolves the market by language and falls back to the first one', async () => {
    expect(await resolveMarket(runner, 'tr')).toEqual({ code: 'tr', language: 'tr' });
    expect((await resolveMarket(runner, 'de'))?.code).toBe('tr');
  });

  it('picks a grid for every difficulty and loads its headers with names', async () => {
    for (const difficulty of DIFFICULTIES) {
      const first = await pickGridId(runner, 'tr', difficulty, () => 0);
      const last = await pickGridId(runner, 'tr', difficulty, () => 0.999999);
      expect(first).not.toBeNull();
      expect(last).not.toBe(first);
      const view = await loadGrid(runner, first as number, 'tr');
      expect(view?.rows).toHaveLength(3);
      expect(view?.columns).toHaveLength(3);
      for (const header of [...(view?.rows ?? []), ...(view?.columns ?? [])]) {
        expect(header.name.length).toBeGreaterThan(0);
        expect(header.countryCode === null).toBe(header.kind === 'club');
      }
    }
    expect(await pickGridId(runner, 'unknown', 1)).toBeNull();
    expect(await loadGrid(runner, -1, 'tr')).toBeNull();
  });

  it('falls back to English names for an unsupported language', async () => {
    const gridId = (await pickGridId(runner, 'tr', 1, () => 0)) as number;
    const english = await loadGrid(runner, gridId, 'en');
    const unsupported = await loadGrid(runner, gridId, 'de');
    expect(unsupported?.rows.map((header) => header.name)).toEqual(english?.rows.map((header) => header.name));
  });

  it('searches footballers by partial names without diacritics', async () => {
    const results = await searchFootballers(runner, 'tr', 'calhan');
    expect(results[0]?.name).toBe('Hakan Çalhanoğlu');
    expect(results[0]?.countryCode).toBe('TR');
    expect(results[0]?.role).toBe('MF');
    expect(await loadFootballer(runner, results[0]?.id ?? -1)).toEqual(results[0]);
    expect(await loadFootballer(runner, -1)).toBeNull();
    expect((await searchFootballers(runner, 'tr', 'mau ica'))[0]?.name).toBe('Mauro Icardi');
    expect(await searchFootballers(runner, 'tr', 'ş')).toEqual([]);
    expect(await searchFootballers(runner, 'tr', '  ')).toEqual([]);
    expect((await searchFootballers(runner, 'tr', 'me', 5)).length).toBe(5);
  });

  it('checks answers against clubs and primary nationality', async () => {
    const hagi = await footballerId('gheorghe hagi');
    const calhanoglu = await footballerId('hakan calhanoglu');
    expect(await isCorrectAnswer(runner, hagi, GALATASARAY, REAL_MADRID)).toBe(true);
    expect(await isCorrectAnswer(runner, hagi, GALATASARAY, TURKEY)).toBe(false);
    expect(await isCorrectAnswer(runner, calhanoglu, MILAN, TURKEY)).toBe(true);
    expect(await isCorrectAnswer(runner, calhanoglu, MILAN, GERMANY)).toBe(false);
    expect(await isCorrectAnswer(runner, calhanoglu, GALATASARAY, TURKEY)).toBe(false);
  });

  it('searches only among the footballers of a duel concept', async () => {
    const names = async (concept: Parameters<typeof searchConceptFootballers>[2], text: string) =>
      (await searchConceptFootballers(runner, 'tr', concept, text)).map((footballer) => footballer.name);

    expect(await names({ kind: 'club', clubId: GALATASARAY.referenceId }, 'icardi')).toContain('Mauro Icardi');
    expect(await names({ kind: 'club', clubId: REAL_MADRID.referenceId }, 'icardi')).toEqual([]);
    expect(await names({ kind: 'home-league-foreigners' }, 'icardi')).toContain('Mauro Icardi');
    expect(await names({ kind: 'home-league-foreigners' }, 'calhanoglu')).toEqual([]);
    expect(await names({ kind: 'home-nationals-abroad' }, 'calhanoglu')).toContain('Hakan Çalhanoğlu');
    expect(await names({ kind: 'country', countryId: TURKEY.referenceId }, 'icardi')).toEqual([]);
    expect(await names({ kind: 'league', leagueCode: 'IT1' }, 'calhanoglu')).toContain('Hakan Çalhanoğlu');
    expect(await names({ kind: 'league', leagueCode: 'IT1' }, 'c')).toEqual([]);
  });

  it('searches only the club footballers that fit an open slot and are not taken', async () => {
    const names = async (positions: string[], excluded: number[], text: string) =>
      (await searchDraftFootballers(runner, 'tr', GALATASARAY.referenceId, positions, excluded, text)).map(
        (footballer) => footballer.name,
      );
    const icardi = await footballerId('mauro icardi');

    expect(await names(['FW'], [], 'icardi')).toContain('Mauro Icardi');
    expect(await names(['GK', 'DF'], [], 'icardi')).toEqual([]);
    expect(await names(['FW'], [icardi], 'icardi')).toEqual([]);
    expect(await names([], [], 'icardi')).toEqual([]);
    expect((await searchDraftFootballers(runner, 'tr', REAL_MADRID.referenceId, ['FW'], [], 'icardi')).length).toBe(0);
  });

  it('names a club in the language of the player and knows whether it is local', async () => {
    expect(await loadClubLabel(runner, GALATASARAY.referenceId, 'tr', 'tr')).toEqual({
      id: GALATASARAY.referenceId,
      name: 'Galatasaray',
      local: true,
    });
    expect((await loadClubLabel(runner, REAL_MADRID.referenceId, 'tr', 'tr')).local).toBe(false);
  });

  it('describes a duel concept with names in the language of the player', async () => {
    expect(await loadConceptLabel(runner, { kind: 'club', clubId: GALATASARAY.referenceId }, 'tr', 'tr')).toEqual({
      name: 'Galatasaray',
      leagueCode: null,
      local: true,
    });
    expect((await loadConceptLabel(runner, { kind: 'club', clubId: REAL_MADRID.referenceId }, 'tr', 'tr')).local).toBe(false);
    expect((await loadConceptLabel(runner, { kind: 'country', countryId: GERMANY.referenceId }, 'tr', 'tr')).name).toBe('Almanya');
    expect((await loadConceptLabel(runner, { kind: 'country', countryId: GERMANY.referenceId }, 'tr', 'de')).name).toBe('Germany');
    expect(await loadConceptLabel(runner, { kind: 'home-league-foreigners' }, 'tr', 'tr')).toEqual({
      name: null,
      leagueCode: 'TR1',
      local: true,
    });
    expect(await loadConceptLabel(runner, { kind: 'league', leagueCode: 'GB1' }, 'tr', 'tr')).toEqual({
      name: null,
      leagueCode: 'GB1',
      local: false,
    });
    expect((await loadConceptLabel(runner, { kind: 'league', leagueCode: 'TR1' }, 'tr', 'tr')).local).toBe(true);
  });

  it('gives the bot enough known answers for every cell of a generated grid', async () => {
    for (const difficulty of DIFFICULTIES) {
      const gridId = (await pickGridId(runner, 'tr', difficulty, () => 0.5)) as number;
      const view = await loadGrid(runner, gridId, 'tr');
      const state = createMatch(view!.grid, 'x');
      const minimumFame = await loadMinimumFame(runner, difficulty);
      const options = await loadBotOptions(runner, 'tr', view!.grid, emptyCells(state), minimumFame);
      expect(options).toHaveLength(9);
      for (const option of options) {
        expect(option.footballerIds.length).toBeGreaterThanOrEqual(3);
        for (const id of option.footballerIds.slice(0, 2)) {
          const row = view!.grid.rows[option.position.row] as Header;
          const column = view!.grid.columns[option.position.column] as Header;
          expect(await isCorrectAnswer(runner, id, row, column)).toBe(true);
        }
      }
    }
  });
});
