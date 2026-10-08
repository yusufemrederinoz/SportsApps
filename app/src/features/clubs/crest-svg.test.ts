/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CREST_PATTERNS, crestSvg, outlineOf, type ClubCrest } from './crest-svg';
import { allCrests, crestOf } from './crests';

const galatasaray: ClubCrest = { code: 'GS', pattern: 'halves', colors: ['#FDB912', '#A90432'] };

describe('crestSvg', () => {
  it('draws the shield in the colours of the club', () => {
    const svg = crestSvg(galatasaray);
    expect(svg).toContain('fill="#FDB912"');
    expect(svg).toContain('fill="#A90432"');
    expect(svg).toContain('stroke="#A90432"');
  });

  it('draws every pattern', () => {
    CREST_PATTERNS.forEach((pattern) => {
      expect(crestSvg({ ...galatasaray, pattern })).toMatch(/^<svg .*<\/svg>$/);
    });
  });

  it('keeps a dark edge visible on the dark screen', () => {
    expect(outlineOf({ ...galatasaray, colors: ['#FFFFFF', '#000000'] })).toBe('#C9CED6');
    expect(outlineOf({ ...galatasaray, trim: '#FEBE10' })).toBe('#FEBE10');
  });
});

describe('club crests', () => {
  it('describes each crest with a short code, two colours and a known pattern', () => {
    allCrests().forEach((crest) => {
      expect(crest.code).toMatch(/^[A-Z0-9]{2,3}$/);
      expect(CREST_PATTERNS).toContain(crest.pattern);
      [...crest.colors, crest.trim ?? '#000000'].forEach((color) => expect(color).toMatch(/^#[0-9A-F]{6}$/));
    });
  });

  it('has a crest for every club in the game', () => {
    const database = new DatabaseSync(fileURLToPath(new URL('../../../assets/data/football.db', import.meta.url)), {
      readOnly: true,
    });
    const clubs = database.prepare('SELECT id FROM clubs').all() as unknown as { id: number }[];
    database.close();
    expect(clubs.length).toBeGreaterThan(200);
    expect(clubs.filter((club) => crestOf(club.id) === null)).toEqual([]);
  });
});
