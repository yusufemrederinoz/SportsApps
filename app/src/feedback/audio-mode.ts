import { setAudioModeAsync } from 'expo-audio';

let configured: Promise<void> | null = null;

export function configureAudio(): void {
  try {
    configured ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  } catch {
    configured = Promise.resolve();
  }
}
