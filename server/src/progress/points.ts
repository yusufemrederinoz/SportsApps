import type { MatchOutcome, PlayDifficulty } from '@sportapps/protocol';

export const DEFAULT_TIME_ZONE = 'Europe/Istanbul';
export const RATING_SCALE = 400;
export const RATING_FACTOR = 40;
export const WIN_BONUS = 5;
export const MINIMUM_WIN = 10;
export const DIFFICULTY_GAIN: Record<PlayDifficulty, number> = { 1: 1, 2: 1.2, 3: 1.4 };
const DAY = 24 * 60 * 60 * 1000;

export function expectedScore(own: number, rival: number): number {
  return 1 / (1 + 10 ** ((rival - own) / RATING_SCALE));
}

export function pointsChange(own: number, rival: number, outcome: MatchOutcome, difficulty: PlayDifficulty): number {
  const expected = expectedScore(own, rival);
  const gain = DIFFICULTY_GAIN[difficulty];
  if (outcome === 'win') {
    return Math.round(Math.max(MINIMUM_WIN, RATING_FACTOR * (1 - expected) + WIN_BONUS) * gain);
  }
  if (outcome === 'loss') {
    return 0 - Math.min(own, Math.round(RATING_FACTOR * expected));
  }
  const shift = RATING_FACTOR * (0.5 - expected);
  return shift > 0 ? Math.round(shift * gain) : 0 - Math.min(own, Math.round(-shift));
}

export function localDay(time: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
}

export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function previousDay(day: string): string {
  return shiftDay(day, -1);
}

function timeZoneOffset(time: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(time)
      .map((part) => [part.type, Number(part.value)]),
  );
  const local = Date.UTC(parts.year ?? 0, (parts.month ?? 1) - 1, parts.day ?? 1, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0);
  return local - Math.floor(time / 1000) * 1000;
}

export function startOfDay(day: string, timeZone: string): number {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  return midnight - timeZoneOffset(midnight, timeZone);
}

export function weekStart(time: number, timeZone: string): number {
  const today = localDay(time, timeZone);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return startOfDay(shiftDay(today, -((weekday + 6) % 7)), timeZone);
}

export function nextWeekStart(time: number, timeZone: string): number {
  return startOfDay(shiftDay(localDay(weekStart(time, timeZone), timeZone), 7), timeZone);
}
