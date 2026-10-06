import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import correct from '@/assets/sounds/correct.wav';
import impact from '@/assets/sounds/impact.wav';
import tick from '@/assets/sounds/tick.wav';
import whistle from '@/assets/sounds/whistle.wav';
import whoosh from '@/assets/sounds/whoosh.wav';
import win from '@/assets/sounds/win.wav';
import wrong from '@/assets/sounds/wrong.wav';

const SOURCES = { correct, impact, tick, whistle, whoosh, win, wrong } as const;

export type SoundName = keyof typeof SOURCES;

const players = new Map<SoundName, AudioPlayer>();

export function playSound(name: SoundName): void {
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players.set(name, player);
    }
    void player.seekTo(0);
    player.play();
  } catch {
    players.delete(name);
  }
}
