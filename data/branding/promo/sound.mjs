import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const RATE = 44100;
const PEAK = 0.7;
const CHANNELS = 2;
const BYTES = 2;
const LEVELS = { impact: 0.6, whoosh: 0.5, tick: 0.35, correct: 0.6, win: 0.8, whistle: 0.35, wrong: 0.5 };
const DEFAULT_LEVEL = 0.5;

function readWave(path) {
  const buffer = readFileSync(path);
  let offset = 12;
  let format = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = { channels: buffer.readUInt16LE(body + 2), rate: buffer.readUInt32LE(body + 4), bits: buffer.readUInt16LE(body + 14) };
    }
    if (id === 'data') {
      if (!format || format.rate !== RATE || format.bits !== 16) throw new Error(`unsupported wave file ${path}`);
      const frames = Math.floor(size / (format.channels * BYTES));
      const samples = new Float32Array(frames);
      for (let frame = 0; frame < frames; frame += 1) {
        let sum = 0;
        for (let channel = 0; channel < format.channels; channel += 1) {
          sum += buffer.readInt16LE(body + (frame * format.channels + channel) * BYTES);
        }
        samples[frame] = sum / format.channels / 32768;
      }
      return samples;
    }
    offset = body + size + (size % 2);
  }
  throw new Error(`no audio data in ${path}`);
}

function levelled(name, samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0 ? (LEVELS[name] ?? DEFAULT_LEVEL) / peak : 1;
  return samples.map((value) => value * scale);
}

export function loadSounds(directory) {
  return Object.fromEntries(
    readdirSync(directory)
      .filter((file) => file.endsWith('.wav'))
      .map((file) => [basename(file, '.wav'), levelled(basename(file, '.wav'), readWave(join(directory, file)))]),
  );
}

export function mix(cues, duration, sounds) {
  const track = new Float32Array(Math.ceil(duration * RATE));
  for (const { time, sound, gain = 1, rate = 1 } of cues) {
    const samples = sounds[sound];
    if (!samples) throw new Error(`unknown sound ${sound}`);
    const start = Math.round(time * RATE);
    const length = Math.floor((samples.length - 1) / rate);
    for (let index = 0; index < length; index += 1) {
      const target = start + index;
      if (target < 0 || target >= track.length) continue;
      const position = index * rate;
      const whole = Math.floor(position);
      const share = position - whole;
      track[target] += (samples[whole] * (1 - share) + samples[whole + 1] * share) * gain;
    }
  }
  let peak = 0;
  for (const value of track) peak = Math.max(peak, Math.abs(value));
  const scale = peak > PEAK ? PEAK / peak : 1;
  return track.map((value) => value * scale);
}

export function writeWave(path, track) {
  const data = Buffer.alloc(track.length * CHANNELS * BYTES);
  track.forEach((value, index) => {
    const sample = Math.round(Math.max(-1, Math.min(1, value)) * 32767);
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      data.writeInt16LE(sample, (index * CHANNELS + channel) * BYTES);
    }
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * CHANNELS * BYTES, 28);
  header.writeUInt16LE(CHANNELS * BYTES, 32);
  header.writeUInt16LE(BYTES * 8, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}
