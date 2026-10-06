import '@/global.css';

export const Colors = {
  background: '#060A18',
  backgroundDeep: '#02040B',
  surface: '#0F1730',
  surfaceRaised: '#18223F',
  border: '#2A3760',
  text: '#F4F8FF',
  textSecondary: '#A9B5D1',
  floodlight: '#CFE6FF',
  pitch: '#2EE59D',
  sideX: '#3DD6FF',
  sideO: '#FFB020',
  positive: '#2EE59D',
  negative: '#FF5A6E',
  gold: '#FFD166',
  onAccent: '#06101F',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = {
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold',
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
  small: 8,
  medium: 14,
  large: 22,
} as const;

export const Motion = {
  quick: 120,
  base: 220,
  slow: 420,
} as const;

export const MinimumTouchSize = 48;
export const MaxContentWidth = 560;
