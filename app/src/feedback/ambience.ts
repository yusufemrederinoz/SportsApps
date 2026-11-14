import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import stadium from '@/assets/sounds/ambience.m4a';
import { secureStore } from '@/auth/storage';

const KEY = 'ambience-muted';
const MUTED = '1';
const VOLUME = 0.9;
const FADE_IN_MILLISECONDS = 1400;
const FADE_OUT_MILLISECONDS = 600;
const FADE_STEP_MILLISECONDS = 50;

let muted: boolean | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

let player: AudioPlayer | null = null;
let fade: ReturnType<typeof setInterval> | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function loadPreference(): Promise<void> {
  loading ??= secureStore
    .get(KEY)
    .catch(() => null)
    .then((value) => {
      if (muted === null) {
        muted = value === MUTED;
        notify();
      }
    });
  return loading;
}

export function useAmbienceMuted(): boolean | null {
  useEffect(() => {
    void loadPreference();
  }, []);
  return useSyncExternalStore(subscribe, () => muted);
}

export async function setAmbienceMuted(value: boolean): Promise<void> {
  muted = value;
  notify();
  if (value) {
    stopAmbience(true);
  }
  await (value ? secureStore.set(KEY, MUTED) : secureStore.remove(KEY));
}

function clearFade(): void {
  if (fade) {
    clearInterval(fade);
    fade = null;
  }
}

function rampTo(target: number, milliseconds: number, done?: () => void): void {
  const current = player;
  if (!current) {
    return;
  }
  clearFade();
  const start = current.volume;
  const steps = Math.max(1, Math.round(milliseconds / FADE_STEP_MILLISECONDS));
  let step = 0;
  fade = setInterval(() => {
    step += 1;
    try {
      current.volume = start + ((target - start) * step) / steps;
    } catch {
      step = steps;
    }
    if (step >= steps) {
      clearFade();
      done?.();
    }
  }, FADE_STEP_MILLISECONDS);
}

export function startAmbience(): void {
  if (muted !== false) {
    return;
  }
  try {
    if (!player) {
      player = createAudioPlayer(stadium);
      player.loop = true;
      player.volume = 0;
    }
    player.play();
    rampTo(VOLUME, FADE_IN_MILLISECONDS);
  } catch {
    player = null;
  }
}

export function stopAmbience(immediately = false): void {
  const current = player;
  if (!current) {
    return;
  }
  const pause = () => {
    try {
      current.pause();
    } catch {
      player = null;
    }
  };
  if (immediately) {
    clearFade();
    pause();
    return;
  }
  rampTo(0, FADE_OUT_MILLISECONDS, pause);
}

export function useMatchAmbience(active: boolean): void {
  const isMuted = useAmbienceMuted();

  useEffect(() => {
    if (!active || isMuted !== false) {
      return undefined;
    }
    startAmbience();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startAmbience();
      } else {
        stopAmbience(true);
      }
    });
    return () => {
      subscription.remove();
      stopAmbience();
    };
  }, [active, isMuted]);
}
