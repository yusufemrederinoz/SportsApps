import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
  type SkPath,
  type SkPathBuilder,
  type Transforms3d,
} from '@shopify/react-native-skia';
import type { ReactionId } from '@sportapps/protocol';
import { useEffect, useMemo, type ComponentType, type ReactNode } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import type { SoundName } from '@/feedback/sounds';

const UNIT = 100;
const PERFORMANCE_MILLISECONDS = 1800;
const TAU = Math.PI * 2;
const INK = '#10161F';
const PATCH = '#1B2330';
const SEAM = '#9AA6B5';
const MOUTH = '#3A0F1A';
const TONGUE = '#FF6B86';
const TONGUE_DEEP = '#D9435F';
const TEAR = '#8FD8FF';
const TEAR_LIGHT = '#DDF5FF';
const TEAR_EDGE = '#2E7FB8';
const BLUSH = 'rgba(255, 128, 150, 0.55)';
const GLOVE = '#F7FAFD';
const SLEEVE = '#1E2631';
const CARD_RED = '#FF2E44';
const FLAG_RED = '#FF3B4E';
const FLAG_YELLOW = '#FFD23F';
const STEAM = '#E9EEF4';
const VEIN = '#FF2D4A';
const BALL_X = 50;
const BALL_Y = 56;
const BALL_RADIUS = 29;
const GROUND = 85;

export const REACTION_SOUNDS: Readonly<Record<ReactionId, SoundName>> = {
  laugh: 'boing',
  tease: 'pop',
  cool: 'whoosh',
  shock: 'impact',
  sweat: 'tick',
  cry: 'sad',
  angry: 'wrong',
  clap: 'correct',
  'red-card': 'whistle',
  var: 'whistle',
  offside: 'whistle',
  save: 'whoosh',
};

type Clock = SharedValue<number>;
type Motion = DerivedValue<Transforms3d>;

interface ArtProps {
  clock: Clock;
}

function ramp(t: number, from: number, to: number) {
  'worklet';
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
}

function easeOut(progress: number) {
  'worklet';
  return 1 - (1 - progress) ** 3;
}

function easeInOut(progress: number) {
  'worklet';
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function overshoot(progress: number) {
  'worklet';
  const tension = 1.70158;
  const rest = progress - 1;
  return progress <= 0 ? 0 : 1 + (tension + 1) * rest ** 3 + tension * rest ** 2;
}

function lerp(from: number, to: number, progress: number) {
  'worklet';
  return from + (to - from) * progress;
}

function fract(value: number) {
  'worklet';
  return value - Math.floor(value);
}

function bump(t: number, from: number, to: number) {
  'worklet';
  return Math.sin(Math.PI * ramp(t, from, to));
}

function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function draw(build: (path: SkPathBuilder) => void): SkPath {
  const path = Skia.PathBuilder.Make();
  build(path);
  return path.build();
}

function polygon(path: SkPathBuilder, x: number, y: number, radius: number, sides: number, rotation: number) {
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * TAU;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) {
      path.moveTo(pointX, pointY);
    } else {
      path.lineTo(pointX, pointY);
    }
  }
  path.close();
}

function star(path: SkPathBuilder, x: number, y: number, outer: number, inner: number, points: number) {
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index / (points * 2)) * TAU;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) {
      path.moveTo(pointX, pointY);
    } else {
      path.lineTo(pointX, pointY);
    }
  }
  path.close();
}

function teardrop(path: SkPathBuilder) {
  path.moveTo(0, -6);
  path.cubicTo(2.6, -1.6, 4.4, 1, 4.4, 3.4);
  path.cubicTo(4.4, 5.9, 2.4, 7.6, 0, 7.6);
  path.cubicTo(-2.4, 7.6, -4.4, 5.9, -4.4, 3.4);
  path.cubicTo(-4.4, 1, -2.6, -1.6, 0, -6);
  path.close();
}

function Stroke({ path, width = 2.6, color = INK }: { path: SkPath; width?: number; color?: string }) {
  return <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" strokeJoin="round" color={color} />;
}

interface PieceProps {
  x: number;
  y: number;
  width: number;
  height: number;
  r: number;
  color: string;
}

function Piece({ x, y, width, height, r, color }: PieceProps) {
  return (
    <>
      <RoundedRect x={x} y={y} width={width} height={height} r={r} color={color} />
      <RoundedRect x={x} y={y} width={width} height={height} r={r} style="stroke" strokeWidth={1.3} color={INK} />
    </>
  );
}

function Backdrop({ clock, color }: { clock: Clock; color: string }) {
  const opacity = useDerivedValue(() => ramp(clock.get(), 0, 0.1));
  return (
    <Circle cx={50} cy={52} r={50} opacity={opacity}>
      <RadialGradient c={vec(50, 52)} r={50} colors={[withAlpha(color, 0.34), withAlpha(color, 0)]} />
    </Circle>
  );
}

function Drop() {
  const shape = useMemo(() => draw(teardrop), []);
  return (
    <>
      <Path path={shape}>
        <LinearGradient start={vec(0, -6)} end={vec(0, 7.6)} colors={[TEAR_LIGHT, TEAR]} />
      </Path>
      <Path path={shape} style="stroke" strokeWidth={1} color={TEAR_EDGE} />
      <Oval x={-2.7} y={1.4} width={1.8} height={3.2} color="rgba(255, 255, 255, 0.9)" />
    </>
  );
}

function Sparkle({ color = Colors.gold }: { color?: string }) {
  const shape = useMemo(() => draw((path) => star(path, 0, 0, 5, 1.3, 4)), []);
  return (
    <>
      <Path path={shape} color={color} opacity={0.7}>
        <BlurMask blur={2} style="normal" />
      </Path>
      <Path path={shape} color="#FFFFFF" />
    </>
  );
}

interface ArcProps {
  clock: Clock;
  start: number;
  rate: number;
  offset: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity?: number;
  scale?: number;
  grow?: number;
  children: ReactNode;
}

function Arc({ clock, start, rate, offset, x, y, vx, vy, gravity = 0, scale = 1, grow = 0, children }: ArcProps) {
  const transform = useDerivedValue<Transforms3d>(() => {
    const phase = fract(Math.max(0, (clock.get() - start) * rate - offset));
    return [
      { translateX: x + vx * phase },
      { translateY: y + vy * phase + gravity * phase * phase },
      { scale: scale * (1 + grow * phase) },
    ];
  });
  const opacity = useDerivedValue(() => {
    const raw = (clock.get() - start) * rate - offset;
    const phase = fract(Math.max(0, raw));
    return raw < 0 ? 0 : ramp(phase, 0, 0.08) * (1 - ramp(phase, 0.7, 1));
  });
  return (
    <Group transform={transform} opacity={opacity}>
      {children}
    </Group>
  );
}

interface TwinkleProps {
  clock: Clock;
  x: number;
  y: number;
  size: number;
  at: number;
  color?: string;
}

function Twinkle({ clock, x, y, size, at, color }: TwinkleProps) {
  const transform = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [
      { translateX: x },
      { translateY: y },
      { scale: size * overshoot(ramp(t, at, at + 0.1)) * (0.8 + 0.2 * Math.sin(TAU * 3 * t + x)) },
      { rotate: 0.6 * t },
    ];
  });
  return (
    <Group transform={transform}>
      <Sparkle color={color} />
    </Group>
  );
}

function Ball() {
  const art = useMemo(
    () => ({
      clip: draw((path) => {
        path.addCircle(BALL_X, BALL_Y, BALL_RADIUS);
      }),
      patches: draw((path) => {
        polygon(path, 50, 29.5, 7.4, 5, -Math.PI / 2);
        polygon(path, 20.5, 57, 8.4, 5, 0);
        polygon(path, 79.5, 57, 8.4, 5, Math.PI);
        polygon(path, 33, 82.5, 7, 5, -Math.PI / 2 + 0.3);
        polygon(path, 67, 82.5, 7, 5, -Math.PI / 2 - 0.3);
      }),
      seams: draw((path) => {
        [
          [-90, 9],
          [-18, 10],
          [198, 10],
          [54, 4.5],
          [126, 4.5],
        ].forEach(([degrees, reach]) => {
          const angle = (degrees * Math.PI) / 180;
          const x = 50 + Math.cos(angle) * 7.4;
          const y = 29.5 + Math.sin(angle) * 7.4;
          path.moveTo(x, y);
          path.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
        });
      }),
    }),
    [],
  );

  return (
    <>
      <Circle cx={BALL_X} cy={BALL_Y} r={BALL_RADIUS + 1.7} color={INK} />
      <Circle cx={BALL_X} cy={BALL_Y} r={BALL_RADIUS}>
        <RadialGradient c={vec(41, 43)} r={38} colors={['#FFFFFF', '#EEF2F7', '#B7C2D0']} positions={[0, 0.5, 1]} />
      </Circle>
      <Group clip={art.clip}>
        <Path path={art.seams} style="stroke" strokeWidth={0.9} strokeCap="round" color={SEAM} />
        <Path path={art.patches} color={PATCH} />
        <Circle cx={BALL_X + 3} cy={BALL_Y + 4} r={BALL_RADIUS + 2} style="stroke" strokeWidth={6} color="rgba(16, 22, 31, 0.12)">
          <BlurMask blur={3} style="normal" />
        </Circle>
      </Group>
      <Oval x={29} y={36} width={10} height={5.5} color="rgba(255, 255, 255, 0.9)" origin={vec(34, 38.75)} transform={[{ rotate: -0.7 }]}>
        <BlurMask blur={0.8} style="normal" />
      </Oval>
    </>
  );
}

interface MascotProps {
  clock: Clock;
  body: Motion;
  lift?: DerivedValue<number>;
  tint?: string;
  tintAmount?: DerivedValue<number>;
  ground?: ReactNode;
  children: ReactNode;
}

function Mascot({ clock, body, lift, tint, tintAmount, ground, children }: MascotProps) {
  const entrance = useDerivedValue<Transforms3d>(() => [{ scale: overshoot(ramp(clock.get(), 0, 0.14)) }]);
  const shadow = useDerivedValue<Transforms3d>(() => [{ scaleX: 1 - (lift ? lift.get() : 0) / 36 }]);
  const shadowOpacity = useDerivedValue(() => ramp(clock.get(), 0, 0.08) * (1 - (lift ? lift.get() : 0) / 40));

  return (
    <>
      <Group origin={vec(BALL_X, GROUND + 4)} transform={shadow} opacity={shadowOpacity}>
        <Oval x={29} y={86.5} width={42} height={5.5} color="rgba(0, 0, 0, 0.5)">
          <BlurMask blur={1.8} style="normal" />
        </Oval>
      </Group>
      {ground}
      <Group origin={vec(BALL_X, GROUND)} transform={entrance}>
        <Group origin={vec(BALL_X, GROUND)} transform={body}>
          <Ball />
          {tint && tintAmount ? (
            <Circle cx={BALL_X} cy={BALL_Y} r={BALL_RADIUS} color={tint} opacity={tintAmount} blendMode="multiply" />
          ) : null}
          {children}
        </Group>
      </Group>
    </>
  );
}

function Cheeks() {
  return (
    <>
      <Oval x={27} y={60} width={10} height={5.5} color={BLUSH}>
        <BlurMask blur={1.2} style="normal" />
      </Oval>
      <Oval x={63} y={60} width={10} height={5.5} color={BLUSH}>
        <BlurMask blur={1.2} style="normal" />
      </Oval>
    </>
  );
}

type GlovePose = 'open' | 'fist' | 'point';

const FINGERS = [
  { x: -5.4, angle: -0.3, lag: 0 },
  { x: -1.8, angle: -0.1, lag: 0.9 },
  { x: 1.8, angle: 0.1, lag: 1.8 },
  { x: 5.4, angle: 0.28, lag: 2.7 },
] as const;

interface FingerProps {
  x: number;
  angle: number;
  lag: number;
  color: string;
  wiggle?: DerivedValue<number>;
}

function Finger({ x, angle, lag, color, wiggle }: FingerProps) {
  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: x },
    { translateY: -4 },
    { rotate: angle + (wiggle ? 0.34 * Math.sin(wiggle.get() - lag) : 0) },
  ]);
  return (
    <Group transform={transform}>
      <Piece x={-2.15} y={-10.5} width={4.3} height={11.5} r={2.15} color={color} />
    </Group>
  );
}

interface GloveProps {
  pose: GlovePose;
  color?: string;
  cuff?: string;
  wiggle?: DerivedValue<number>;
}

function Glove({ pose, color = GLOVE, cuff = GLOVE, wiggle }: GloveProps) {
  const art = useMemo(
    () => ({
      stitches: draw((path) => {
        [-2.6, 0, 2.6].forEach((x) => {
          path.moveTo(x, -3.6);
          path.lineTo(x, 1.6);
        });
      }),
      folds: draw((path) => {
        (pose === 'point' ? [0.6, 3.6] : [-3.4, 0, 3.4]).forEach((x) => {
          path.moveTo(x, -6.6);
          path.lineTo(x, -3);
        });
      }),
    }),
    [pose],
  );
  const knuckles = pose === 'point' ? [-1, 2.4, 5.4] : [-5, -1.7, 1.7, 5];

  return (
    <>
      {pose === 'open' ? (
        <>
          <Group transform={[{ translateX: -6.5 }, { translateY: 1 }, { rotate: -1 }]}>
            <Piece x={-2.3} y={-9} width={4.6} height={9.5} r={2.3} color={color} />
          </Group>
          {FINGERS.map((finger) => (
            <Finger key={finger.x} x={finger.x} angle={finger.angle} lag={finger.lag} color={color} wiggle={wiggle} />
          ))}
        </>
      ) : (
        <>
          {pose === 'point' ? <Piece x={-6.4} y={-19} width={4.4} height={14} r={2.2} color={color} /> : null}
          {knuckles.map((x) => (
            <Group key={x}>
              <Circle cx={x} cy={-6.8} r={2.3} color={color} />
              <Circle cx={x} cy={-6.8} r={2.3} style="stroke" strokeWidth={1.3} color={INK} />
            </Group>
          ))}
        </>
      )}
      <Piece x={-7.5} y={-7} width={15} height={14} r={5.5} color={color} />
      {pose === 'open' ? (
        <Path path={art.stitches} style="stroke" strokeWidth={0.9} strokeCap="round" color={withAlpha(INK, 0.45)} />
      ) : (
        <>
          <Path path={art.folds} style="stroke" strokeWidth={1.1} strokeCap="round" color={INK} />
          <Piece x={-7} y={-1.6} width={10.5} height={4.4} r={2.2} color={color} />
        </>
      )}
      <Piece x={-6.8} y={6} width={13.6} height={5.4} r={2.2} color={cuff} />
    </>
  );
}

function Rays({ clock, x, y, color, at, count = 12 }: { clock: Clock; x: number; y: number; color: string; at: number; count?: number }) {
  const shape = useMemo(
    () =>
      draw((path) => {
        for (let index = 0; index < count; index += 1) {
          const angle = (index / count) * TAU;
          const spread = (TAU / count) * 0.16;
          path.moveTo(x + Math.cos(angle - spread) * 16, y + Math.sin(angle - spread) * 16);
          path.lineTo(x + Math.cos(angle) * 56, y + Math.sin(angle) * 56);
          path.lineTo(x + Math.cos(angle + spread) * 16, y + Math.sin(angle + spread) * 16);
          path.close();
        }
      }),
    [count, x, y],
  );
  const transform = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ scale: 0.55 + 0.45 * easeOut(ramp(t, at, at + 0.16)) }, { rotate: 0.3 * t }];
  });
  const opacity = useDerivedValue(() => 0.5 * ramp(clock.get(), at, at + 0.05));
  return (
    <Group origin={vec(x, y)} transform={transform} opacity={opacity}>
      <Path path={shape} color={color} />
    </Group>
  );
}

const JOY_TEARS = [0, 1, 2].flatMap((index) => [-1, 1].map((direction) => ({ index, direction })));

function LaughArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      eyes: draw((path) => {
        path.moveTo(33.5, 55.5);
        path.quadTo(39.5, 46, 45.5, 55.5);
        path.moveTo(54.5, 55.5);
        path.quadTo(60.5, 46, 66.5, 55.5);
      }),
      brows: draw((path) => {
        path.moveTo(33, 43);
        path.quadTo(39, 39.5, 45, 42);
        path.moveTo(55, 42);
        path.quadTo(61, 39.5, 67, 43);
      }),
      mouth: draw((path) => {
        path.moveTo(37, 62.5);
        path.lineTo(63, 62.5);
        path.cubicTo(63, 75, 57, 81.5, 50, 81.5);
        path.cubicTo(43, 81.5, 37, 75, 37, 62.5);
        path.close();
      }),
      lines: draw((path) => {
        [
          [13, 40, 18.5, 43.5],
          [10.5, 51, 17, 52],
          [13, 63, 18.5, 60],
        ].forEach(([x1, y1, x2, y2]) => {
          path.moveTo(x1, y1);
          path.lineTo(x2, y2);
          path.moveTo(100 - x1, y1);
          path.lineTo(100 - x2, y2);
        });
      }),
    }),
    [],
  );
  const lift = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.12, 0.92);
    return Math.abs(Math.sin(Math.PI * 4 * progress)) * 9 * (1 - 0.55 * progress);
  });
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const progress = ramp(t, 0.12, 0.92);
    const air = Math.abs(Math.sin(Math.PI * 4 * progress));
    const contact = (1 - air) ** 6 * ramp(t, 0.1, 0.14) * (1 - ramp(t, 0.86, 0.95));
    return [
      { translateY: -lift.get() },
      { rotate: 0.09 * Math.sin(TAU * 2 * progress) },
      { scaleX: 1 + 0.1 * contact },
      { scaleY: 1 - 0.12 * contact },
    ];
  });
  const mouth = useDerivedValue<Transforms3d>(() => [
    { scaleY: 1 - 0.22 * Math.abs(Math.sin(Math.PI * 8 * ramp(clock.get(), 0.12, 0.92))) },
  ]);
  const lines = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.14, 0.2) * (0.55 + 0.45 * Math.abs(Math.cos(Math.PI * 8 * ramp(t, 0.12, 0.92))));
  });

  return (
    <Mascot clock={clock} body={body} lift={lift}>
      <Group opacity={lines}>
        <Stroke path={art.lines} width={2.2} color={Colors.gold} />
      </Group>
      <Stroke path={art.brows} width={2.2} />
      <Stroke path={art.eyes} width={3} />
      <Cheeks />
      <Group origin={vec(50, 62.5)} transform={mouth}>
        <Path path={art.mouth} color={MOUTH} />
        <Group clip={art.mouth}>
          <Rect x={37} y={62.5} width={26} height={3.8} color="#FFFFFF" />
          <Oval x={42} y={73} width={16} height={10} color={TONGUE} />
        </Group>
        <Stroke path={art.mouth} width={2.2} />
      </Group>
      <Group transform={[{ translateX: 32.5 }, { translateY: 58.5 }, { scale: 0.4 }]}>
        <Drop />
      </Group>
      <Group transform={[{ translateX: 67.5 }, { translateY: 58.5 }, { scale: 0.4 }]}>
        <Drop />
      </Group>
      {JOY_TEARS.map(({ index, direction }) => (
        <Arc
          key={`${index}${direction}`}
          clock={clock}
          start={0.14}
          rate={2}
          offset={index / 3}
          x={50 + direction * 17}
          y={56}
          vx={direction * 22}
          vy={-12}
          gravity={30}
          scale={0.5}>
          <Drop />
        </Arc>
      ))}
    </Mascot>
  );
}

const SPIT = [0, 1, 2, 3];

function TeaseArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      wink: draw((path) => {
        path.moveTo(34.5, 49.5);
        path.lineTo(44.5, 53.5);
        path.lineTo(34.5, 57.5);
      }),
      brows: draw((path) => {
        path.moveTo(33, 45.5);
        path.lineTo(45, 46.5);
        path.moveTo(53, 43);
        path.quadTo(60, 37, 67, 42);
      }),
      smirk: draw((path) => {
        path.moveTo(40, 67);
        path.quadTo(50, 72.5, 61, 65.5);
      }),
      tongue: draw((path) => {
        path.moveTo(45.5, 68.4);
        path.lineTo(45.5, 74);
        path.cubicTo(45.5, 81.5, 55.5, 81.5, 55.5, 74);
        path.lineTo(55.5, 68.4);
        path.close();
      }),
      groove: draw((path) => {
        path.moveTo(50.5, 69.8);
        path.lineTo(50.5, 75.5);
      }),
    }),
    [],
  );
  const body = useDerivedValue<Transforms3d>(() => {
    const progress = ramp(clock.get(), 0.12, 0.95);
    const sway = Math.sin(TAU * 3 * progress);
    return [{ translateX: 3 * sway }, { rotate: 0.13 * sway }];
  });
  const tongue = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ rotate: 0.22 * Math.sin(TAU * 5 * t) * ramp(t, 0.12, 0.2) }, { scaleY: 0.4 + 0.6 * overshoot(ramp(t, 0.1, 0.2)) }];
  });
  const wiggle = useDerivedValue(() => TAU * 7 * clock.get());
  const leftGlove = useDerivedValue<Transforms3d>(() => [
    { translateX: 15.5 },
    { translateY: 47 },
    { rotate: -0.42 },
    { scale: 1.05 * overshoot(ramp(clock.get(), 0.1, 0.22)) },
    { scaleX: -1 },
  ]);
  const rightGlove = useDerivedValue<Transforms3d>(() => [
    { translateX: 84.5 },
    { translateY: 47 },
    { rotate: 0.42 },
    { scale: 1.05 * overshoot(ramp(clock.get(), 0.12, 0.24)) },
  ]);

  return (
    <Mascot clock={clock} body={body}>
      <Stroke path={art.brows} width={2.4} />
      <Stroke path={art.wink} width={3} />
      <Circle cx={60} cy={53} r={6.8} color="#FFFFFF" />
      <Circle cx={60} cy={53} r={6.8} style="stroke" strokeWidth={1.6} color={INK} />
      <Circle cx={61.5} cy={54} r={3.3} color={INK} />
      <Circle cx={62.8} cy={52.4} r={1} color="#FFFFFF" />
      <Cheeks />
      <Stroke path={art.smirk} width={2.6} />
      <Group origin={vec(50.5, 68.4)} transform={tongue}>
        <Path path={art.tongue} color={TONGUE} />
        <Stroke path={art.groove} width={1.2} color={TONGUE_DEEP} />
        <Stroke path={art.tongue} width={1.6} />
      </Group>
      {SPIT.map((index) => (
        <Arc
          key={index}
          clock={clock}
          start={0.2}
          rate={3}
          offset={index / 4}
          x={50.5}
          y={79}
          vx={index % 2 === 0 ? -11 : 11}
          vy={5}
          gravity={14}>
          <Circle cx={0} cy={0} r={1.4} color={TEAR} />
        </Arc>
      ))}
      <Group transform={leftGlove}>
        <Glove pose="open" wiggle={wiggle} />
      </Group>
      <Group transform={rightGlove}>
        <Glove pose="open" wiggle={wiggle} />
      </Group>
    </Mascot>
  );
}

function CoolArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      smirk: draw((path) => {
        path.moveTo(41, 69);
        path.quadTo(51, 73.5, 60.5, 66);
        path.moveTo(60.5, 66);
        path.lineTo(62.6, 64.6);
      }),
      brow: draw((path) => {
        path.moveTo(54, 41.5);
        path.quadTo(61, 37.5, 68, 41);
      }),
      lenses: draw((path) => {
        path.moveTo(29.5, 47);
        path.lineTo(47, 47);
        path.lineTo(46, 55);
        path.quadTo(45, 60.5, 39.5, 60.5);
        path.lineTo(36, 60.5);
        path.quadTo(30.5, 60.5, 30, 55);
        path.close();
        path.moveTo(53, 47);
        path.lineTo(70.5, 47);
        path.lineTo(70, 55);
        path.quadTo(69.5, 60.5, 64, 60.5);
        path.lineTo(60.5, 60.5);
        path.quadTo(55, 60.5, 54, 55);
        path.close();
      }),
      shine: draw((path) => {
        [32, 56].forEach((x) => {
          path.moveTo(x, 47);
          path.lineTo(x + 5, 47);
          path.lineTo(x - 1, 60.5);
          path.lineTo(x - 6, 60.5);
          path.close();
          path.moveTo(x + 7, 47);
          path.lineTo(x + 8.5, 47);
          path.lineTo(x + 2.5, 60.5);
          path.lineTo(x + 1, 60.5);
          path.close();
        });
      }),
      frame: draw((path) => {
        path.moveTo(29.5, 47);
        path.lineTo(70.5, 47);
        path.moveTo(29.5, 48.5);
        path.lineTo(22.5, 46.5);
        path.moveTo(70.5, 48.5);
        path.lineTo(77.5, 46.5);
      }),
      bridge: draw((path) => {
        path.moveTo(47, 49.5);
        path.quadTo(50, 47.5, 53, 49.5);
      }),
      lines: draw((path) => {
        [36, 50, 64].forEach((x) => {
          path.moveTo(x, 30);
          path.lineTo(x, 40);
        });
      }),
      glint: draw((path) => star(path, 0, 0, 6.5, 1.4, 4)),
    }),
    [],
  );
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const squash = bump(t, 0.3, 0.42);
    return [{ rotate: -0.07 * easeOut(ramp(t, 0.45, 0.62)) }, { scaleX: 1 + 0.07 * squash }, { scaleY: 1 - 0.07 * squash }];
  });
  const glasses = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ translateY: lerp(-52, 0, overshoot(ramp(t, 0.14, 0.34))) }, { rotate: lerp(-0.35, 0, easeOut(ramp(t, 0.14, 0.34))) }];
  });
  const brow = useDerivedValue<Transforms3d>(() => [{ translateY: -2.5 * easeOut(ramp(clock.get(), 0.55, 0.65)) }]);
  const glint = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [
      { translateX: 66.5 },
      { translateY: 49 },
      { scale: overshoot(ramp(t, 0.55, 0.65)) * (1 - 0.45 * ramp(t, 0.72, 0.88)) },
      { rotate: 1.6 * t },
    ];
  });
  const lines = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.12, 0.16) * (1 - ramp(t, 0.28, 0.36));
  });

  return (
    <Mascot clock={clock} body={body}>
      <Oval x={37} y={49} width={6.5} height={8} color={INK} />
      <Oval x={56.5} y={49} width={6.5} height={8} color={INK} />
      <Group transform={brow}>
        <Stroke path={art.brow} width={2.4} />
      </Group>
      <Stroke path={art.smirk} width={2.8} />
      <Group opacity={lines}>
        <Stroke path={art.lines} width={1.6} color={Colors.volt} />
      </Group>
      <Group origin={vec(50, 53)} transform={glasses}>
        <Path path={art.lenses}>
          <LinearGradient start={vec(0, 47)} end={vec(0, 60.5)} colors={['#3A4A62', '#06080C']} />
        </Path>
        <Group clip={art.lenses}>
          <Path path={art.shine} color="rgba(255, 255, 255, 0.28)" />
        </Group>
        <Stroke path={art.lenses} width={2} />
        <Stroke path={art.frame} width={2.6} />
        <Stroke path={art.bridge} width={2.2} />
      </Group>
      <Group transform={glint}>
        <Path path={art.glint} color={Colors.volt} opacity={0.8}>
          <BlurMask blur={2.4} style="normal" />
        </Path>
        <Path path={art.glint} color="#FFFFFF" />
      </Group>
    </Mascot>
  );
}

function ShockArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      brows: draw((path) => {
        path.moveTo(30, 39);
        path.quadTo(38.5, 33, 46.5, 38);
        path.moveTo(53.5, 38);
        path.quadTo(61.5, 33, 70, 39);
      }),
      mouth: draw((path) => {
        path.addOval(Skia.XYWHRect(44.5, 65, 11, 16));
      }),
      lines: draw((path) => {
        for (let index = 0; index < 9; index += 1) {
          const angle = ((-170 + index * 20) * Math.PI) / 180;
          path.moveTo(50 + Math.cos(angle) * 35.5, 56 + Math.sin(angle) * 35.5);
          path.lineTo(50 + Math.cos(angle) * 42.5, 56 + Math.sin(angle) * 42.5);
        }
      }),
    }),
    [],
  );
  const lift = useDerivedValue(() => 13 * Math.sin(Math.PI * ramp(clock.get(), 0.08, 0.34)) ** 0.8);
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const takeoff = bump(t, 0.06, 0.18);
    const land = bump(t, 0.34, 0.46);
    return [
      { translateX: 0.9 * Math.sin(TAU * 30 * t) * ramp(t, 0.46, 0.56) },
      { translateY: -lift.get() },
      { scaleX: 1 - 0.06 * takeoff + 0.12 * land },
      { scaleY: 1 + 0.1 * takeoff - 0.14 * land },
    ];
  });
  const eyes = useDerivedValue<Transforms3d>(() => [{ scale: 0.5 + 0.5 * overshoot(ramp(clock.get(), 0.08, 0.2)) }]);
  const brows = useDerivedValue<Transforms3d>(() => [{ translateY: -2 * overshoot(ramp(clock.get(), 0.08, 0.18)) }]);
  const mouth = useDerivedValue<Transforms3d>(() => [{ scaleY: 0.25 + 0.75 * overshoot(ramp(clock.get(), 0.1, 0.22)) }]);
  const linesTransform = useDerivedValue<Transforms3d>(() => [{ scale: 0.85 + 0.15 * overshoot(ramp(clock.get(), 0.1, 0.2)) }]);
  const linesOpacity = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.1, 0.14) * (1 - 0.4 * ramp(t, 0.4, 0.6));
  });

  return (
    <Mascot clock={clock} body={body} lift={lift}>
      <Group origin={vec(BALL_X, BALL_Y)} transform={linesTransform} opacity={linesOpacity}>
        <Stroke path={art.lines} width={2.4} color={Colors.blue} />
      </Group>
      <Group transform={brows}>
        <Stroke path={art.brows} width={4.8} color="#FFFFFF" />
        <Stroke path={art.brows} width={2.4} />
      </Group>
      {[38.5, 61.5].map((x) => (
        <Group key={x} origin={vec(x, 50.5)} transform={eyes}>
          <Circle cx={x} cy={50.5} r={9} color="#FFFFFF" />
          <Circle cx={x} cy={50.5} r={9} style="stroke" strokeWidth={1.8} color={INK} />
          <Circle cx={x} cy={51} r={2.3} color={INK} />
        </Group>
      ))}
      <Group origin={vec(50, 65)} transform={mouth}>
        <Path path={art.mouth} color={MOUTH} />
        <Group clip={art.mouth}>
          <Oval x={45.5} y={75} width={9} height={6} color={TONGUE} />
        </Group>
        <Stroke path={art.mouth} width={2} />
      </Group>
    </Mascot>
  );
}

const SWEAT_DROPS = [0, 1].flatMap((index) => [-1, 1].map((direction) => ({ index, direction })));

function SweatArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      brows: draw((path) => {
        path.moveTo(32.5, 46.5);
        path.lineTo(45, 41.5);
        path.moveTo(55, 41.5);
        path.lineTo(67.5, 46.5);
      }),
      teeth: draw((path) => {
        path.moveTo(38, 69.75);
        path.lineTo(62, 69.75);
        [44, 50, 56].forEach((x) => {
          path.moveTo(x, 65);
          path.lineTo(x, 74.5);
        });
      }),
    }),
    [],
  );
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ translateX: 1.1 * Math.sin(TAU * 26 * t) * ramp(t, 0.1, 0.2) }];
  });
  const tintAmount = useDerivedValue(() => 0.32 * ramp(clock.get(), 0.1, 0.3));
  const glance = useDerivedValue<Transforms3d>(() => [{ translateX: 1.8 * Math.sin(TAU * 2 * clock.get()) }]);
  const mouth = useDerivedValue<Transforms3d>(() => [{ scaleX: 1 + 0.03 * Math.sin(TAU * 13 * clock.get()) }]);
  const drop = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ translateX: 74 }, { translateY: 37 + 11 * easeInOut(ramp(t, 0.22, 0.95)) }, { scale: 0.78 * overshoot(ramp(t, 0.12, 0.22)) }];
  });

  return (
    <Mascot clock={clock} body={body} tint="#A9CCFF" tintAmount={tintAmount}>
      <Stroke path={art.brows} width={2.6} />
      <Group transform={glance}>
        <Oval x={37.5} y={50.25} width={6} height={7.5} color={INK} />
        <Oval x={56.5} y={50.25} width={6} height={7.5} color={INK} />
        <Circle cx={41.2} cy={52} r={0.9} color="#FFFFFF" />
        <Circle cx={60.2} cy={52} r={0.9} color="#FFFFFF" />
      </Group>
      <Group origin={vec(50, 69.75)} transform={mouth}>
        <RoundedRect x={38} y={65} width={24} height={9.5} r={4.5} color="#FFFFFF" />
        <Stroke path={art.teeth} width={1.2} />
        <RoundedRect x={38} y={65} width={24} height={9.5} r={4.5} style="stroke" strokeWidth={1.8} color={INK} />
      </Group>
      <Group transform={drop}>
        <Drop />
      </Group>
      {SWEAT_DROPS.map(({ index, direction }) => (
        <Arc
          key={`${index}${direction}`}
          clock={clock}
          start={0.16}
          rate={3}
          offset={index / 2 + (direction > 0 ? 0.25 : 0)}
          x={50 + direction * 10}
          y={28}
          vx={direction * 14}
          vy={-8}
          gravity={26}
          scale={0.34}>
          <Drop />
        </Arc>
      ))}
    </Mascot>
  );
}

const FOUNTAIN = [0, 1, 2, 3].flatMap((index) => [-1, 1].map((direction) => ({ index, direction })));

function CryArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      brows: draw((path) => {
        path.moveTo(32, 47);
        path.quadTo(39, 44, 45, 40.5);
        path.moveTo(55, 40.5);
        path.quadTo(61, 44, 68, 47);
      }),
      eyes: draw((path) => {
        path.moveTo(33.5, 52);
        path.quadTo(39.5, 57, 45.5, 52);
        path.moveTo(54.5, 52);
        path.quadTo(60.5, 57, 66.5, 52);
      }),
      mouth: draw((path) => {
        path.moveTo(37, 75.5);
        path.cubicTo(37, 62.5, 63, 62.5, 63, 75.5);
        path.quadTo(50, 72, 37, 75.5);
        path.close();
      }),
    }),
    [],
  );
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const sob = Math.sin(TAU * 7 * t) * ramp(t, 0.12, 0.2);
    return [{ translateY: 1.4 * sob }, { scaleY: 1 - 0.03 * ramp(t, 0.12, 0.3) - 0.02 * Math.max(0, sob) }];
  });
  const river = useDerivedValue<Transforms3d>(() => [{ scaleY: easeOut(ramp(clock.get(), 0.14, 0.32)) }]);
  const mouth = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ scaleY: 0.5 + 0.5 * overshoot(ramp(t, 0.1, 0.2)) + 0.1 * Math.sin(TAU * 7 * t) * ramp(t, 0.2, 0.3) }];
  });
  const puddle = useDerivedValue<Transforms3d>(() => [{ scaleX: (8 + 48 * easeOut(ramp(clock.get(), 0.2, 1))) / 56 }]);

  return (
    <Mascot
      clock={clock}
      body={body}
      ground={
        <Group origin={vec(50, 90)} transform={puddle}>
          <Oval x={22} y={87} width={56} height={6} color={withAlpha(TEAR, 0.55)} />
          <Oval x={30} y={88} width={24} height={1.6} color="rgba(255, 255, 255, 0.4)" />
        </Group>
      }>
      <Stroke path={art.brows} width={2.6} />
      <Stroke path={art.eyes} width={2.8} />
      {[32.5, 62.5].map((x) => (
        <Group key={x} origin={vec(x + 2.5, 54)} transform={river}>
          <RoundedRect x={x} y={54} width={5} height={21} r={2.5} color={withAlpha(TEAR, 0.9)} />
          <Rect x={x + 1.3} y={56} width={1.2} height={16} color="rgba(255, 255, 255, 0.6)" />
        </Group>
      ))}
      <Group origin={vec(50, 70)} transform={mouth}>
        <Path path={art.mouth} color={MOUTH} />
        <Group clip={art.mouth}>
          <Oval x={44} y={70} width={12} height={7} color={TONGUE} />
        </Group>
        <Stroke path={art.mouth} width={2} />
      </Group>
      {FOUNTAIN.map(({ index, direction }) => (
        <Arc
          key={`${index}${direction}`}
          clock={clock}
          start={0.16}
          rate={3}
          offset={index / 4}
          x={50 + direction * 16}
          y={53}
          vx={direction * 30}
          vy={-18}
          gravity={56}
          scale={0.42}>
          <Drop />
        </Arc>
      ))}
    </Mascot>
  );
}

const STEAM_PUFFS = [0, 1, 2].flatMap((index) => [-1, 1].map((direction) => ({ index, direction })));

function AngryArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      brows: draw((path) => {
        path.moveTo(31.5, 42);
        path.lineTo(46, 49);
        path.moveTo(68.5, 42);
        path.lineTo(54, 49);
      }),
      mouth: draw((path) => {
        path.moveTo(37.5, 75);
        path.lineTo(42, 66);
        path.lineTo(58, 66);
        path.lineTo(62.5, 75);
        path.close();
      }),
      vein: draw((path) => {
        path.moveTo(-5, -1.5);
        path.quadTo(-1.5, -1.5, -1.5, -5);
        path.moveTo(1.5, -5);
        path.quadTo(1.5, -1.5, 5, -1.5);
        path.moveTo(5, 1.5);
        path.quadTo(1.5, 1.5, 1.5, 5);
        path.moveTo(-1.5, 5);
        path.quadTo(-1.5, 1.5, -5, 1.5);
      }),
    }),
    [],
  );
  const body = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const shake = Math.sin(TAU * 22 * t) * ramp(t, 0.1, 0.16) * (1 - 0.6 * ramp(t, 0.7, 1));
    const puff = 1 + 0.05 * easeOut(ramp(t, 0.1, 0.3));
    return [{ translateX: 1.8 * shake }, { rotate: 0.03 * shake }, { scaleX: puff }, { scaleY: puff }];
  });
  const tintAmount = useDerivedValue(() => 0.7 * ramp(clock.get(), 0.1, 0.45));
  const brows = useDerivedValue<Transforms3d>(() => [{ translateY: -5 * (1 - overshoot(ramp(clock.get(), 0.08, 0.18))) }]);
  const mouth = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ scaleY: 1 + 0.1 * Math.sin(TAU * 11 * t) * ramp(t, 0.12, 0.2) }];
  });
  const vein = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [
      { translateX: 65 },
      { translateY: 36.5 },
      { scale: overshoot(ramp(t, 0.18, 0.28)) * (0.9 + 0.2 * Math.abs(Math.sin(TAU * 3 * t))) },
    ];
  });

  return (
    <Mascot clock={clock} body={body} tint="#FF4D4D" tintAmount={tintAmount}>
      <Group transform={brows}>
        <Stroke path={art.brows} width={3.6} />
      </Group>
      <Oval x={37} y={51.5} width={7} height={5} color={INK} />
      <Oval x={56} y={51.5} width={7} height={5} color={INK} />
      <Circle cx={41.6} cy={53} r={0.9} color="#FFFFFF" />
      <Circle cx={60.6} cy={53} r={0.9} color="#FFFFFF" />
      <Group origin={vec(50, 66)} transform={mouth}>
        <Path path={art.mouth} color={MOUTH} />
        <Group clip={art.mouth}>
          <Rect x={40} y={66} width={20} height={3.2} color="#FFFFFF" />
          <Rect x={37} y={72} width={26} height={3} color="#FFFFFF" />
        </Group>
        <Stroke path={art.mouth} width={2} />
      </Group>
      <Group transform={vein}>
        <Stroke path={art.vein} width={3.8} color="#FFFFFF" />
        <Stroke path={art.vein} width={2.2} color={VEIN} />
      </Group>
      {STEAM_PUFFS.map(({ index, direction }) => (
        <Arc
          key={`${index}${direction}`}
          clock={clock}
          start={0.2}
          rate={2}
          offset={index / 3}
          x={50 + direction * 25}
          y={33}
          vx={direction * 8}
          vy={-22}
          scale={0.9}
          grow={1.4}>
          <Circle cx={0} cy={0} r={4} color={STEAM}>
            <BlurMask blur={0.7} style="normal" />
          </Circle>
        </Arc>
      ))}
    </Mascot>
  );
}

const CLAP_STARS = [
  { x: 18, y: 30, size: 1, at: 0.2 },
  { x: 82, y: 27, size: 0.8, at: 0.26 },
  { x: 86, y: 64, size: 0.7, at: 0.32 },
] as const;

function ClapArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      eyes: draw((path) => {
        path.moveTo(34.5, 54.5);
        path.quadTo(40, 47.5, 45.5, 54.5);
        path.moveTo(54.5, 54.5);
        path.quadTo(60, 47.5, 65.5, 54.5);
      }),
      brows: draw((path) => {
        path.moveTo(34, 44);
        path.quadTo(40, 41, 45, 43);
        path.moveTo(55, 43);
        path.quadTo(60, 41, 66, 44);
      }),
      mouth: draw((path) => {
        path.moveTo(41, 63.5);
        path.lineTo(59, 63.5);
        path.cubicTo(59, 71.5, 54.5, 75, 50, 75);
        path.cubicTo(45.5, 75, 41, 71.5, 41, 63.5);
        path.close();
      }),
      spark: draw((path) => {
        for (let index = 0; index < 5; index += 1) {
          const angle = ((-150 + index * 30) * Math.PI) / 180;
          path.moveTo(50 + Math.cos(angle) * 7, 83 + Math.sin(angle) * 7);
          path.lineTo(50 + Math.cos(angle) * 12, 83 + Math.sin(angle) * 12);
        }
      }),
    }),
    [],
  );
  const gap = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.14, 0.9);
    return 10 * (0.5 + 0.5 * Math.cos(TAU * 5 * progress));
  });
  const body = useDerivedValue<Transforms3d>(() => [{ translateY: 1.2 * (1 - gap.get() / 10) }]);
  const leftGlove = useDerivedValue<Transforms3d>(() => [
    { translateX: 45.5 - gap.get() },
    { translateY: 90 },
    { rotate: 0.55 },
    { scale: 0.92 * overshoot(ramp(clock.get(), 0.08, 0.2)) },
  ]);
  const rightGlove = useDerivedValue<Transforms3d>(() => [
    { translateX: 54.5 + gap.get() },
    { translateY: 90 },
    { rotate: -0.55 },
    { scale: 0.92 * overshoot(ramp(clock.get(), 0.08, 0.2)) },
    { scaleX: -1 },
  ]);
  const spark = useDerivedValue<Transforms3d>(() => {
    const progress = ramp(clock.get(), 0.14, 0.9);
    return [{ scale: 0.5 + 0.7 * ramp(fract(5 * progress + 0.5), 0, 0.35) }];
  });
  const sparkOpacity = useDerivedValue(() => {
    const t = clock.get();
    const progress = ramp(t, 0.14, 0.9);
    return (1 - ramp(fract(5 * progress + 0.5), 0, 0.35)) * ramp(t, 0.14, 0.18) * (1 - ramp(t, 0.88, 0.92));
  });

  return (
    <>
      {CLAP_STARS.map((sparkle) => (
        <Twinkle key={sparkle.x} clock={clock} x={sparkle.x} y={sparkle.y} size={sparkle.size} at={sparkle.at} />
      ))}
      <Mascot clock={clock} body={body}>
        <Stroke path={art.brows} width={2.2} />
        <Stroke path={art.eyes} width={3} />
        <Cheeks />
        <Path path={art.mouth} color={MOUTH} />
        <Group clip={art.mouth}>
          <Rect x={41} y={63.5} width={18} height={3.2} color="#FFFFFF" />
          <Oval x={45} y={70} width={10} height={6} color={TONGUE} />
        </Group>
        <Stroke path={art.mouth} width={2.2} />
        <Group origin={vec(50, 83)} transform={spark} opacity={sparkOpacity}>
          <Stroke path={art.spark} width={2} color={Colors.gold} />
        </Group>
        <Group transform={leftGlove}>
          <Glove pose="open" />
        </Group>
        <Group transform={rightGlove}>
          <Glove pose="open" />
        </Group>
      </Mascot>
    </>
  );
}

function RedCardArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      card: draw((path) => {
        path.addRRect(Skia.RRectXY(Skia.XYWHRect(42, 10, 24, 36), 3, 3));
      }),
      sheen: draw((path) => {
        path.moveTo(47, 10);
        path.lineTo(54, 10);
        path.lineTo(46, 46);
        path.lineTo(39, 46);
        path.close();
      }),
      sleeve: draw((path) => {
        path.moveTo(49.5, 57);
        path.lineTo(62.5, 57);
        path.lineTo(80, 106);
        path.lineTo(60, 106);
        path.close();
      }),
      flash: draw((path) => {
        path.moveTo(54, 6);
        path.lineTo(54, 1);
        path.moveTo(39.5, 8.5);
        path.lineTo(35.5, 4.5);
        path.moveTo(68.5, 8.5);
        path.lineTo(72.5, 4.5);
      }),
      trail: draw((path) => {
        path.moveTo(44, 50);
        path.lineTo(44, 70);
        path.moveTo(54, 52);
        path.lineTo(54, 78);
        path.moveTo(64, 50);
        path.lineTo(64, 66);
      }),
    }),
    [],
  );
  const arm = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const thrust = ramp(t, 0.04, 0.2);
    const settle = t > 0.2 ? 0.07 * Math.sin(TAU * 5 * (t - 0.2)) * Math.exp(-(t - 0.2) * 9) : 0;
    return [{ translateY: lerp(72, 0, overshoot(thrust)) }, { rotate: lerp(0.4, 0, easeOut(thrust)) + settle }];
  });
  const glow = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.18, 0.26) * (0.55 + 0.3 * (0.5 + 0.5 * Math.sin(TAU * 4 * t)));
  });
  const flash = useDerivedValue<Transforms3d>(() => [{ scale: overshoot(ramp(clock.get(), 0.2, 0.3)) }]);
  const trail = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.05, 0.09) * (1 - ramp(t, 0.18, 0.26));
  });

  return (
    <>
      <Rays clock={clock} x={54} y={28} color={CARD_RED} at={0.18} />
      <Group opacity={trail}>
        <Stroke path={art.trail} width={1.8} color="rgba(255, 255, 255, 0.7)" />
      </Group>
      <Group origin={vec(62, 100)} transform={arm}>
        <Path path={art.card} color={CARD_RED} opacity={glow}>
          <BlurMask blur={6} style="normal" />
        </Path>
        <Path path={art.card}>
          <LinearGradient start={vec(42, 10)} end={vec(66, 46)} colors={['#FF7584', CARD_RED, '#B0001A']} />
        </Path>
        <Group clip={art.card}>
          <Path path={art.sheen} color="rgba(255, 255, 255, 0.24)" />
        </Group>
        <Path path={art.card} style="stroke" strokeWidth={1.4} color="#5A0010" />
        <Group origin={vec(54, 10)} transform={flash}>
          <Stroke path={art.flash} width={2} color="#FFFFFF" />
        </Group>
        <Path path={art.sleeve}>
          <LinearGradient start={vec(50, 57)} end={vec(78, 106)} colors={['#323D4C', SLEEVE]} />
        </Path>
        <Path path={art.sleeve} style="stroke" strokeWidth={1} color={Colors.strokeBright} />
        <Group transform={[{ translateX: 56 }, { translateY: 49.5 }, { rotate: -0.08 }, { scale: 1.15 }]}>
          <Glove pose="fist" />
        </Group>
      </Group>
    </>
  );
}

function traceX(distance: number) {
  'worklet';
  if (distance <= 32) {
    return 50 - distance;
  }
  return distance <= 80 ? 18 : 18 + distance - 80;
}

function traceY(distance: number) {
  'worklet';
  if (distance <= 32) {
    return 22;
  }
  return distance <= 80 ? 22 + distance - 32 : 70;
}

function TracingGlove({ clock, side }: { clock: Clock; side: -1 | 1 }) {
  const transform = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const distance = 112 * easeInOut(ramp(t, 0.06, 0.46));
    const away = ramp(t, 0.5, 0.62);
    return [
      { translateX: 50 + side * (traceX(distance) - 50) + side * -3.2 },
      { translateY: traceY(distance) + 15.2 + 12 * away },
      { scale: 0.8 },
      { scaleX: -side },
    ];
  });
  const opacity = useDerivedValue(() => 1 - ramp(clock.get(), 0.5, 0.62));
  return (
    <Group transform={transform} opacity={opacity}>
      <Glove pose="point" />
    </Group>
  );
}

function VarArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      trace: draw((path) => {
        path.moveTo(50, 22);
        path.lineTo(18, 22);
        path.lineTo(18, 70);
        path.lineTo(50, 70);
        path.moveTo(50, 22);
        path.lineTo(82, 22);
        path.lineTo(82, 70);
        path.lineTo(50, 70);
      }),
      screen: draw((path) => {
        path.addRRect(Skia.RRectXY(Skia.XYWHRect(21, 25, 58, 42), 3, 3));
      }),
      grid: draw((path) => {
        for (let y = 31; y < 67; y += 6) {
          path.moveTo(21, y);
          path.lineTo(79, y);
        }
      }),
      letters: draw((path) => {
        path.moveTo(32, 40);
        path.lineTo(37, 56);
        path.lineTo(42, 40);
        path.moveTo(45, 56);
        path.lineTo(50, 40);
        path.lineTo(55, 56);
        path.moveTo(47, 51);
        path.lineTo(53, 51);
        path.moveTo(59, 56);
        path.lineTo(59, 40);
        path.lineTo(64, 40);
        path.quadTo(68, 40, 68, 44);
        path.quadTo(68, 48, 64, 48);
        path.lineTo(59, 48);
        path.moveTo(63, 48);
        path.lineTo(68, 56);
      }),
    }),
    [],
  );
  const traced = useDerivedValue(() => easeInOut(ramp(clock.get(), 0.06, 0.46)));
  const monitor = useDerivedValue<Transforms3d>(() => [{ scale: 0.85 + 0.15 * overshoot(ramp(clock.get(), 0.46, 0.6)) }]);
  const monitorOpacity = useDerivedValue(() => ramp(clock.get(), 0.46, 0.54));
  const letters = useDerivedValue<Transforms3d>(() => [{ scale: overshoot(ramp(clock.get(), 0.58, 0.7)) }]);
  const scan = useDerivedValue(() => 25 + 40 * fract(clock.get() * 2));
  const record = useDerivedValue(() => 0.6 + 0.4 * Math.sin(TAU * 4 * clock.get()));

  return (
    <>
      <Group origin={vec(50, 46)} transform={monitor} opacity={monitorOpacity}>
        <Path path={art.screen}>
          <LinearGradient start={vec(0, 25)} end={vec(0, 67)} colors={['#15263A', '#070B10']} />
        </Path>
        <Group clip={art.screen}>
          <Path path={art.grid} style="stroke" strokeWidth={0.6} color={withAlpha(Colors.volt, 0.08)} />
          <Rect x={21} y={scan} width={58} height={1.6} color={withAlpha(Colors.volt, 0.2)} />
        </Group>
        <Circle cx={27} cy={31} r={1.8} color={FLAG_RED} opacity={record} />
        <Group origin={vec(50, 48)} transform={letters}>
          <Path path={art.letters} style="stroke" strokeWidth={5} strokeCap="round" strokeJoin="round" color={Colors.volt} opacity={0.6}>
            <BlurMask blur={2.6} style="normal" />
          </Path>
          <Stroke path={art.letters} width={3.2} color={Colors.volt} />
        </Group>
      </Group>
      <Path
        path={art.trace}
        style="stroke"
        strokeWidth={5}
        strokeCap="round"
        strokeJoin="round"
        color={Colors.volt}
        opacity={0.6}
        end={traced}>
        <BlurMask blur={2.5} style="normal" />
      </Path>
      <Path path={art.trace} style="stroke" strokeWidth={2.6} strokeCap="round" strokeJoin="round" color={Colors.volt} end={traced} />
      <TracingGlove clock={clock} side={-1} />
      <TracingGlove clock={clock} side={1} />
    </>
  );
}

const FLAG_COLUMNS = [0, 1, 2, 3, 4, 5];
const FLAG_ROWS = [0, 1, 2, 3];
const FLAG_X = 37;
const FLAG_Y = 15;
const CELL_WIDTH = 5;
const CELL_HEIGHT = 5.5;

function FlagColumn({ clock, column }: { clock: Clock; column: number }) {
  const transform = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ translateY: Math.sin(TAU * 3 * t - column * 0.9) * column * 0.55 * ramp(t, 0.12, 0.24) }];
  });
  const shade = useDerivedValue(() => 0.1 + 0.1 * Math.cos(TAU * 3 * clock.get() - column * 0.9));
  const x = FLAG_X + column * CELL_WIDTH;
  const height = CELL_HEIGHT * FLAG_ROWS.length;
  return (
    <Group transform={transform}>
      {FLAG_ROWS.map((row) => (
        <Rect
          key={row}
          x={x}
          y={FLAG_Y + row * CELL_HEIGHT}
          width={CELL_WIDTH + 0.2}
          height={CELL_HEIGHT}
          color={(row + column) % 2 === 0 ? FLAG_RED : FLAG_YELLOW}
        />
      ))}
      <Rect x={x} y={FLAG_Y} width={CELL_WIDTH + 0.2} height={height} color="#000000" opacity={shade} />
      <Rect x={x} y={FLAG_Y - 0.6} width={CELL_WIDTH + 0.2} height={1.2} color={INK} />
      <Rect x={x} y={FLAG_Y + height - 0.6} width={CELL_WIDTH + 0.2} height={1.2} color={INK} />
      {column === FLAG_COLUMNS.length - 1 ? (
        <Rect x={x + CELL_WIDTH - 0.6} y={FLAG_Y - 0.6} width={1.2} height={height + 1.2} color={INK} />
      ) : null}
    </Group>
  );
}

function OffsideArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      sleeve: draw((path) => {
        path.moveTo(27, 106);
        path.lineTo(43, 106);
        path.lineTo(40.5, 76);
        path.lineTo(30.5, 76);
        path.close();
      }),
      swing: draw((path) => {
        path.moveTo(70, 62);
        path.quadTo(76, 40, 62, 18);
        path.moveTo(79, 66);
        path.quadTo(86, 40, 71, 14);
      }),
    }),
    [],
  );
  const arm = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [{ rotate: lerp(1.3, 0, overshoot(ramp(t, 0.05, 0.24))) + 0.06 * Math.sin(TAU * 2.5 * t) * ramp(t, 0.24, 0.32) }];
  });
  const swing = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.08, 0.12) * (1 - ramp(t, 0.24, 0.34));
  });
  const line = useDerivedValue(() => ramp(clock.get(), 0, 0.12));

  return (
    <>
      <Group opacity={line}>
        <Rect x={6} y={90} width={88} height={1.6} color="#FFFFFF" opacity={0.7}>
          <BlurMask blur={1.4} style="solid" />
        </Rect>
      </Group>
      <Group opacity={swing}>
        <Stroke path={art.swing} width={1.8} color="rgba(255, 255, 255, 0.7)" />
      </Group>
      <Group origin={vec(35, 104)} transform={arm}>
        <RoundedRect x={33.5} y={13} width={3.4} height={58} r={1.7}>
          <LinearGradient start={vec(33.5, 0)} end={vec(36.9, 0)} colors={['#F4F7FB', '#9AA6B5']} />
        </RoundedRect>
        <RoundedRect x={33.5} y={13} width={3.4} height={58} r={1.7} style="stroke" strokeWidth={1.1} color={INK} />
        {FLAG_COLUMNS.map((column) => (
          <FlagColumn key={column} clock={clock} column={column} />
        ))}
        <Circle cx={35.2} cy={12.5} r={2.4} color="#F4F7FB" />
        <Circle cx={35.2} cy={12.5} r={2.4} style="stroke" strokeWidth={1.1} color={INK} />
        <Path path={art.sleeve}>
          <LinearGradient start={vec(30, 76)} end={vec(42, 106)} colors={['#323D4C', SLEEVE]} />
        </Path>
        <Path path={art.sleeve} style="stroke" strokeWidth={1} color={Colors.strokeBright} />
        <Group transform={[{ translateX: 35.5 }, { translateY: 70 }, { rotate: -0.05 }, { scale: 1.05 }]}>
          <Glove pose="fist" />
        </Group>
      </Group>
    </>
  );
}

const SAVE_STARS = [
  { x: 80, y: 20, size: 0.9, at: 0.5 },
  { x: 22, y: 24, size: 0.75, at: 0.56 },
  { x: 84, y: 66, size: 0.65, at: 0.62 },
] as const;

function SaveArt({ clock }: ArtProps) {
  const art = useMemo(
    () => ({
      burst: draw((path) => star(path, 0, 0, 17, 8, 8)),
      trail: draw((path) => {
        path.moveTo(18, -6);
        path.lineTo(34, -6);
        path.moveTo(21, 0);
        path.lineTo(42, 0);
        path.moveTo(18, 6);
        path.lineTo(31, 6);
      }),
      dive: draw((path) => {
        path.moveTo(-12, 12);
        path.lineTo(-26, 24);
        path.moveTo(-4, 17);
        path.lineTo(-16, 30);
        path.moveTo(-18, 4);
        path.lineTo(-32, 12);
      }),
    }),
    [],
  );
  const ballX = useDerivedValue(() => {
    const t = clock.get();
    return t < 0.3 ? lerp(122, 46.5, ramp(t, 0.06, 0.3)) : 46.5 - 4.3 * ramp(t, 0.3, 0.44);
  });
  const ballY = useDerivedValue(() => {
    const t = clock.get();
    return (t < 0.3 ? lerp(26, 47.2, ramp(t, 0.06, 0.3)) : 47.2) - 5 * overshoot(ramp(t, 0.44, 0.6));
  });
  const ball = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    const hit = bump(t, 0.3, 0.38);
    return [
      { translateX: ballX.get() },
      { translateY: ballY.get() },
      { rotate: -7 * Math.min(t, 0.3) - 1.2 * ramp(t, 0.3, 0.6) },
      { scaleX: 0.6 * (1 - 0.14 * hit) },
      { scaleY: 0.6 * (1 + 0.08 * hit) },
      { translateX: -BALL_X },
      { translateY: -BALL_Y },
    ];
  });
  const trail = useDerivedValue<Transforms3d>(() => [{ translateX: ballX.get() }, { translateY: ballY.get() }]);
  const trailOpacity = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.06, 0.1) * (1 - ramp(t, 0.27, 0.32));
  });
  const gloveX = useDerivedValue(() => {
    const t = clock.get();
    return lerp(-18, 42, easeOut(ramp(t, 0.08, 0.3))) - 3 * bump(t, 0.3, 0.4) - 4 * ramp(t, 0.3, 0.44);
  });
  const gloveY = useDerivedValue(() => {
    const t = clock.get();
    return lerp(104, 54, easeOut(ramp(t, 0.08, 0.3))) - 5 * overshoot(ramp(t, 0.44, 0.6));
  });
  const glove = useDerivedValue<Transforms3d>(() => [
    { translateX: gloveX.get() },
    { translateY: gloveY.get() },
    { rotate: lerp(1.25, 0.55, easeOut(ramp(clock.get(), 0.08, 0.3))) },
    { scale: 1.95 },
  ]);
  const dive = useDerivedValue<Transforms3d>(() => [{ translateX: gloveX.get() }, { translateY: gloveY.get() }]);
  const diveOpacity = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.08, 0.12) * (1 - ramp(t, 0.28, 0.34));
  });
  const burst = useDerivedValue<Transforms3d>(() => {
    const t = clock.get();
    return [
      { translateX: 47 },
      { translateY: 42 },
      { scale: overshoot(ramp(t, 0.29, 0.37)) * (1 - 0.45 * ramp(t, 0.4, 0.62)) },
      { rotate: 0.4 * t },
    ];
  });
  const ring = useDerivedValue(() => 6 + 26 * easeOut(ramp(clock.get(), 0.3, 0.56)));
  const ringOpacity = useDerivedValue(() => {
    const t = clock.get();
    return t < 0.3 ? 0 : 1 - ramp(t, 0.3, 0.56);
  });

  return (
    <>
      {SAVE_STARS.map((sparkle) => (
        <Twinkle key={sparkle.x} clock={clock} x={sparkle.x} y={sparkle.y} size={sparkle.size} at={sparkle.at} color={Colors.volt} />
      ))}
      <Circle cx={47} cy={42} r={ring} style="stroke" strokeWidth={2} color="#FFFFFF" opacity={ringOpacity} />
      <Group transform={burst}>
        <Path path={art.burst} color={Colors.gold} opacity={0.8}>
          <BlurMask blur={4} style="normal" />
        </Path>
        <Path path={art.burst} color="#FFF4C2" />
      </Group>
      <Group transform={trail} opacity={trailOpacity}>
        <Stroke path={art.trail} width={2} color="rgba(255, 255, 255, 0.75)" />
      </Group>
      <Group transform={dive} opacity={diveOpacity}>
        <Stroke path={art.dive} width={2} color="rgba(255, 255, 255, 0.7)" />
      </Group>
      <Group transform={glove}>
        <Glove pose="open" color={Colors.volt} cuff={Colors.stroke} />
      </Group>
      <Group transform={ball}>
        <Ball />
      </Group>
    </>
  );
}

const ARTS: Readonly<Record<ReactionId, ComponentType<ArtProps>>> = {
  laugh: LaughArt,
  tease: TeaseArt,
  cool: CoolArt,
  shock: ShockArt,
  sweat: SweatArt,
  cry: CryArt,
  angry: AngryArt,
  clap: ClapArt,
  'red-card': RedCardArt,
  var: VarArt,
  offside: OffsideArt,
  save: SaveArt,
};

const GLOWS: Readonly<Record<ReactionId, string>> = {
  laugh: Colors.gold,
  tease: TONGUE,
  cool: Colors.volt,
  shock: Colors.blue,
  sweat: TEAR,
  cry: Colors.blue,
  angry: Colors.negative,
  clap: Colors.gold,
  'red-card': CARD_RED,
  var: Colors.blue,
  offside: FLAG_YELLOW,
  save: Colors.volt,
};

export function ReactionArt({ reaction, size, play = false }: { reaction: ReactionId; size: number; play?: boolean }) {
  const reduceMotion = useReducedMotion();
  const animate = play && !reduceMotion;
  const clock = useSharedValue(animate ? 0 : 1);
  const Art = ARTS[reaction];

  useEffect(() => {
    cancelAnimation(clock);
    if (animate) {
      clock.set(0);
      clock.set(withTiming(1, { duration: PERFORMANCE_MILLISECONDS, easing: Easing.linear }));
    } else {
      clock.set(1);
    }
    return () => cancelAnimation(clock);
  }, [animate, clock, reaction]);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: size / UNIT }]}>
        <Backdrop clock={clock} color={GLOWS[reaction]} />
        <Art clock={clock} />
      </Group>
    </Canvas>
  );
}
