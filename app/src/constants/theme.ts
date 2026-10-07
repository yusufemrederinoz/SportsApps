import '@/global.css';

import type { Side } from '@sportapps/game-core';

export const Colors = {
  ink: '#05070A',
  background: '#0A0D12',
  panel: '#121821',
  panelRaised: '#1B2430',
  stroke: '#2B3644',
  strokeBright: '#5B6B80',
  text: '#F6F8FB',
  textSecondary: '#9BA8BA',
  volt: '#C8FF2E',
  voltDeep: '#86C400',
  gold: '#F3C653',
  blue: '#5B9BFF',
  positive: '#3BEA8B',
  negative: '#FF4D6A',
  onAccent: '#0A0D12',
} as const;

export type ThemeColor = keyof typeof Colors;

export interface Finish {
  light: string;
  base: string;
  deep: string;
  ink: string;
}

export const Finishes: Readonly<Record<Side, Finish>> = {
  x: { light: '#FFF1C2', base: '#F3C653', deep: '#A8741A', ink: '#2E1E04' },
  o: { light: '#E3EEFF', base: '#5B9BFF', deep: '#1D3FAF', ink: '#06153F' },
};

export const AccentFinishes = {
  volt: { light: '#F4FFCF', base: '#C8FF2E', deep: '#6FA500', ink: '#162200' },
  steel: { light: '#F4F7FB', base: '#B4C0CF', deep: '#586576', ink: '#0E141B' },
} as const satisfies Record<string, Finish>;

export const Fonts = {
  display: 'BarlowCondensed_800ExtraBold_Italic',
  heading: 'BarlowCondensed_700Bold',
  label: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 6,
  medium: 12,
  large: 20,
} as const;

export const Motion = {
  quick: 120,
  base: 220,
  slow: 420,
  cinematic: 700,
} as const;

export const MinimumTouchSize = 48;
export const MaxContentWidth = 560;
