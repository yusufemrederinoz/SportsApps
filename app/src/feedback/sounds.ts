import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import boing from '@/assets/sounds/boing.wav';
import correct from '@/assets/sounds/correct.wav';
import impactHigh from '@/assets/sounds/impact-3.wav';
import impactLow from '@/assets/sounds/impact-2.wav';
import impact from '@/assets/sounds/impact.wav';
import pop from '@/assets/sounds/pop.wav';
import reward from '@/assets/sounds/reward.wav';
import sad from '@/assets/sounds/sad.wav';
import tick from '@/assets/sounds/tick.wav';
import whistle from '@/assets/sounds/whistle.wav';
import whoosh from '@/assets/sounds/whoosh.wav';
import win from '@/assets/sounds/win.wav';
import wrong from '@/assets/sounds/wrong.wav';

import { configureAudio } from './audio-mode';

const SOURCES = {
  boing: [boing],
  correct: [correct],
  impact: [impact, impactLow, impactHigh],
  pop: [pop],
  reward: [reward],
  sad: [sad],
  tick: [tick],
  whistle: [whistle],
  whoosh: [whoosh],
  win: [win],
  wrong: [wrong],
} as const satisfies Record<string, readonly number[]>;

export type SoundName = keyof typeof SOURCES;

const players = new Map<string, AudioPlayer>();
const lastVariant = new Map<SoundName, number>();

export function pickVariant(count: number, previous: number | undefined, random: () => number = Math.random): number {
  if (count <= 1) {
    return 0;
  }
  if (previous === undefined) {
    return Math.min(count - 1, Math.floor(random() * count));
  }
  const choice = Math.min(count - 2, Math.floor(random() * (count - 1)));
  return choice >= previous ? choice + 1 : choice;
}

export function playSound(name: SoundName): void {
  configureAudio();
  const variants = SOURCES[name];
  const variant = pickVariant(variants.length, lastVariant.get(name));
  const key = `${name}:${variant}`;
  try {
    let player = players.get(key);
    if (!player) {
      player = createAudioPlayer(variants[variant]);
      players.set(key, player);
    }
    lastVariant.set(name, variant);
    void player.seekTo(0);
    player.play();
  } catch {
    players.delete(key);
  }
}
