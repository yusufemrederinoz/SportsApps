import pathlib
import wave

import numpy as np

RATE = 44100
PEAK_DBFS = -3.0
LOUDNESS_DBFS = -15.0
FADE_SECONDS = 0.012
OUTPUT = pathlib.Path(__file__).resolve().parents[2] / "app" / "assets" / "sounds"


def timeline(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def phase_of(frequency):
    return 2 * np.pi * np.cumsum(frequency) / RATE


def lowpass(signal, cutoff):
    cutoff = np.broadcast_to(cutoff, signal.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    output = np.zeros_like(signal)
    state = 0.0
    for index, sample in enumerate(signal):
        state += alpha[index] * (sample - state)
        output[index] = state
    return output


def pop():
    t = timeline(0.16)
    frequency = 420 + 1100 * (1 - np.exp(-t * 38))
    body = np.sin(phase_of(frequency)) * np.exp(-t * 30)
    rng = np.random.default_rng(7)
    click = rng.standard_normal(t.size) * np.exp(-t * 900) * 0.35
    return body + click


def boing():
    t = timeline(0.62)
    wobble = 1 + 0.42 * np.exp(-t * 5.5) * np.sin(2 * np.pi * 13 * t)
    frequency = (150 + 120 * t) * wobble
    phase = phase_of(frequency)
    tone = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.12 * np.sin(3 * phase)
    attack = np.minimum(1, t / 0.008)
    return tone * attack * np.exp(-t * 4.2)


def sad():
    notes = [(311.1, 0.22), (293.7, 0.22), (277.2, 0.33)]
    parts = []
    for index, (pitch, seconds) in enumerate(notes):
        t = timeline(seconds)
        last = index == len(notes) - 1
        glide = pitch * (1 - 0.06 * t / seconds) if last else np.full(t.size, pitch)
        vibrato = 1 + (0.018 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.12) if last else 0)
        phase = phase_of(glide * vibrato)
        saw = 2 * ((phase / (2 * np.pi)) % 1) - 1
        wah = 500 + 1900 * np.sin(np.pi * np.minimum(1, t / (seconds * 0.85))) ** 1.5
        voice = lowpass(saw, wah)
        envelope = np.minimum(1, t / 0.025) * np.minimum(1, (seconds - t) / 0.05)
        parts.append(voice * envelope)
    return np.concatenate(parts)


def finish(signal):
    fade = int(RATE * FADE_SECONDS)
    signal = signal.copy()
    signal[-fade:] *= np.linspace(1, 0, fade)
    gain = min(10 ** (PEAK_DBFS / 20) / np.abs(signal).max(), 10 ** (LOUDNESS_DBFS / 20) / np.sqrt(np.mean(signal**2)))
    scaled = signal * gain
    return (scaled * 32767).astype(np.int16)


def write(name, signal):
    path = OUTPUT / f"{name}.wav"
    with wave.open(str(path), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(finish(signal).tobytes())
    print(path.name, round(len(signal) / RATE, 3), "s")


if __name__ == "__main__":
    write("pop", pop())
    write("boing", boing())
    write("sad", sad())
