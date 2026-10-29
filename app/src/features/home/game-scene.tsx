import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import type { GameId } from '@sportapps/protocol';
import { useEffect, type ReactNode } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors, Finishes, type Finish } from '@/constants/theme';
import { GAME_FINISHES } from '@/features/games';

const LOOP_MILLISECONDS = 4800;
const RESTING = 0.86;
const CHALK = 'rgba(214, 226, 240, 0.5)';
const CHALK_FAINT = 'rgba(214, 226, 240, 0.22)';

function ramp(t: number, from: number, to: number) {
  'worklet';
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
}

function easeOut(progress: number) {
  'worklet';
  return 1 - (1 - progress) ** 3;
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

function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function segment(points: readonly (readonly [number, number])[]) {
  const path = Skia.PathBuilder.Make();
  points.forEach(([x, y], index) => (index === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  return path.build();
}

function cross(x: number, y: number, reach: number) {
  const path = Skia.PathBuilder.Make();
  path.moveTo(x - reach, y - reach);
  path.lineTo(x + reach, y + reach);
  path.moveTo(x + reach, y - reach);
  path.lineTo(x - reach, y + reach);
  return path.build();
}

interface SceneProps {
  clock: SharedValue<number>;
  size: number;
  finish: Finish;
}

interface PopProps {
  clock: SharedValue<number>;
  at: number;
  x: number;
  y: number;
  children: ReactNode;
}

function Pop({ clock, at, x, y, children }: PopProps) {
  const transform = useDerivedValue(() => [{ scale: overshoot(ramp(clock.get(), at, at + 0.08)) }]);
  return (
    <Group origin={vec(x, y)} transform={transform}>
      {children}
    </Group>
  );
}

const GRID_MOVES = [
  { row: 0, column: 0, side: 'x', at: 0.22 },
  { row: 0, column: 1, side: 'o', at: 0.34 },
  { row: 1, column: 1, side: 'x', at: 0.46 },
  { row: 1, column: 2, side: 'o', at: 0.58 },
  { row: 2, column: 2, side: 'x', at: 0.7 },
] as const;

function GridScene({ clock, size }: SceneProps) {
  const cell = size * 0.2;
  const start = size * 0.2;
  const centre = (index: number) => start + cell * (index + 0.5);
  const lines = Skia.PathBuilder.Make();
  [1, 2].forEach((step) => {
    const at = start + cell * step;
    lines.moveTo(at, start - cell * 0.1);
    lines.lineTo(at, start + cell * 3.1);
    lines.moveTo(start - cell * 0.1, at);
    lines.lineTo(start + cell * 3.1, at);
  });
  const board = lines.build();
  const reach = cell * 0.27;
  const win = segment([
    [centre(0) - reach, centre(0) - reach],
    [centre(2) + reach, centre(2) + reach],
  ]);
  const boardEnd = useDerivedValue(() => easeOut(ramp(clock.get(), 0.02, 0.18)));
  const winEnd = useDerivedValue(() => easeOut(ramp(clock.get(), 0.76, 0.86)));

  return (
    <>
      <Path path={board} style="stroke" strokeWidth={size * 0.016} strokeCap="round" color={CHALK} end={boardEnd} />
      {GRID_MOVES.map((move) => {
        const x = centre(move.column);
        const y = centre(move.row);
        return (
          <Pop key={`${move.row}${move.column}`} clock={clock} at={move.at} x={x} y={y}>
            {move.side === 'x' ? (
              <Path path={cross(x, y, reach)} style="stroke" strokeWidth={size * 0.036} strokeCap="round" color={Finishes.x.base} />
            ) : (
              <Circle cx={x} cy={y} r={reach} style="stroke" strokeWidth={size * 0.036} color={Finishes.o.base} />
            )}
          </Pop>
        );
      })}
      <Path path={win} style="stroke" strokeWidth={size * 0.06} strokeCap="round" color={Colors.volt} end={winEnd} opacity={0.55}>
        <BlurMask blur={size * 0.03} style="normal" />
      </Path>
      <Path path={win} style="stroke" strokeWidth={size * 0.024} strokeCap="round" color={Colors.volt} end={winEnd} />
    </>
  );
}

interface CardProps {
  clock: SharedValue<number>;
  size: number;
  finish: Finish;
  winner: boolean;
}

function DuelCard({ clock, size, finish, winner }: CardProps) {
  const width = size * 0.3;
  const height = size * 0.42;
  const transform = useDerivedValue(() => {
    const t = clock.get();
    const enter = easeOut(ramp(t, winner ? 0.04 : 0.1, winner ? 0.22 : 0.28));
    const settle = ramp(t, 0.5, 0.58);
    return [
      { translateX: lerp(winner ? -size * 0.25 : size * 1.25, winner ? size * 0.31 : size * 0.69, enter) },
      { translateY: size * 0.5 + (winner ? -size * 0.05 : size * 0.02) * settle },
      { rotate: winner ? -0.08 : 0.08 + 0.16 * settle },
      { scale: winner ? 1 + 0.08 * settle : 1 - 0.08 * settle },
    ];
  });
  const opacity = useDerivedValue(() => (winner ? 1 : 1 - 0.55 * ramp(clock.get(), 0.5, 0.58)));
  const glow = useDerivedValue(() => (winner ? 0.9 * ramp(clock.get(), 0.5, 0.58) : 0));
  const shoulders = Skia.PathBuilder.Make();
  shoulders.moveTo(-width * 0.34, height * 0.3);
  shoulders.quadTo(-width * 0.3, height * 0.02, 0, height * 0.02);
  shoulders.quadTo(width * 0.3, height * 0.02, width * 0.34, height * 0.3);
  shoulders.close();

  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect
        x={-width * 0.58}
        y={-height * 0.56}
        width={width * 1.16}
        height={height * 1.12}
        r={size * 0.05}
        color={finish.base}
        opacity={glow}>
        <BlurMask blur={size * 0.05} style="normal" />
      </RoundedRect>
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={size * 0.035}>
        <LinearGradient
          start={vec(-width / 2, -height / 2)}
          end={vec(width / 2, height / 2)}
          colors={[finish.light, finish.base, finish.deep]}
        />
      </RoundedRect>
      <Circle cx={0} cy={-height * 0.14} r={width * 0.19} color={withAlpha(finish.ink, 0.55)} />
      <Path path={shoulders.build()} color={withAlpha(finish.ink, 0.55)} />
      <RoundedRect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        r={size * 0.035}
        style="stroke"
        strokeWidth={size * 0.008}
        color={finish.light}
      />
    </Group>
  );
}

const SPARKS = Array.from({ length: 10 }, (_, index) => ({
  angle: (index / 10) * Math.PI * 2 + (index % 2) * 0.3,
  reach: 0.16 + (index % 3) * 0.05,
}));

function Spark({ clock, size, angle, reach }: { clock: SharedValue<number>; size: number; angle: number; reach: number }) {
  const cx = useDerivedValue(() => size * 0.5 + Math.cos(angle) * reach * size * easeOut(ramp(clock.get(), 0.48, 0.68)));
  const cy = useDerivedValue(() => size * 0.48 + Math.sin(angle) * reach * size * easeOut(ramp(clock.get(), 0.48, 0.68)));
  const opacity = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.48, 0.68);
    return progress > 0 && progress < 1 ? 1 - progress : 0;
  });
  return <Circle cx={cx} cy={cy} r={size * 0.012} color={Colors.volt} opacity={opacity} />;
}

function DuelScene({ clock, size }: SceneProps) {
  const bolt = segment([
    [size * 0.53, size * 0.3],
    [size * 0.46, size * 0.47],
    [size * 0.54, size * 0.5],
    [size * 0.47, size * 0.68],
  ]);
  const boltOpacity = useDerivedValue(() => {
    const t = clock.get();
    return ramp(t, 0.32, 0.36) * (1 - ramp(t, 0.48, 0.52));
  });
  const ring = useDerivedValue(() => size * (0.05 + 0.2 * easeOut(ramp(clock.get(), 0.48, 0.68))));
  const ringOpacity = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.48, 0.68);
    return progress > 0 && progress < 1 ? 1 - progress : 0;
  });

  return (
    <>
      <DuelCard clock={clock} size={size} finish={Finishes.o} winner={false} />
      <DuelCard clock={clock} size={size} finish={Finishes.x} winner />
      <Group opacity={boltOpacity}>
        <Path path={bolt} style="stroke" strokeWidth={size * 0.05} strokeJoin="round" strokeCap="round" color={Colors.volt} opacity={0.5}>
          <BlurMask blur={size * 0.025} style="normal" />
        </Path>
        <Path path={bolt} style="stroke" strokeWidth={size * 0.022} strokeJoin="round" strokeCap="round" color={Colors.volt} />
      </Group>
      <Circle
        cx={size * 0.5}
        cy={size * 0.48}
        r={ring}
        style="stroke"
        strokeWidth={size * 0.012}
        color={Colors.volt}
        opacity={ringOpacity}
      />
      {SPARKS.map((spark, index) => (
        <Spark key={index} clock={clock} size={size} {...spark} />
      ))}
    </>
  );
}

const FORMATION = [
  [0.5, 0.84],
  [0.3, 0.71],
  [0.43, 0.73],
  [0.57, 0.73],
  [0.7, 0.71],
  [0.34, 0.54],
  [0.5, 0.57],
  [0.66, 0.54],
  [0.32, 0.31],
  [0.5, 0.26],
  [0.68, 0.31],
] as const;

function Teammate({
  clock,
  size,
  x,
  y,
  at,
  finish,
}: {
  clock: SharedValue<number>;
  size: number;
  x: number;
  y: number;
  at: number;
  finish: Finish;
}) {
  const glow = useDerivedValue(() => {
    const t = clock.get();
    return 0.7 * ramp(t, 0.72, 0.76) * (1 - ramp(t, 0.86, 0.92));
  });
  return (
    <Pop clock={clock} at={at} x={x} y={y}>
      <Circle cx={x} cy={y} r={size * 0.05} color={finish.base} opacity={glow}>
        <BlurMask blur={size * 0.025} style="normal" />
      </Circle>
      <Circle cx={x} cy={y} r={size * 0.032} color={Finishes.x.base} />
      <Circle cx={x} cy={y} r={size * 0.032} style="stroke" strokeWidth={size * 0.008} color={Finishes.x.light} />
    </Pop>
  );
}

function DraftScene({ clock, size, finish }: SceneProps) {
  const pitchOpacity = useDerivedValue(() => ramp(clock.get(), 0, 0.1));
  const left = size * 0.2;
  const top = size * 0.1;
  const width = size * 0.6;
  const height = size * 0.8;
  const stroke = size * 0.01;
  return (
    <>
      <Group opacity={pitchOpacity}>
        <RoundedRect x={left} y={top} width={width} height={height} r={size * 0.03} style="stroke" strokeWidth={stroke} color={CHALK} />
        <Path
          path={segment([
            [left, top + height / 2],
            [left + width, top + height / 2],
          ])}
          style="stroke"
          strokeWidth={stroke}
          color={CHALK}
        />
        <Circle cx={size / 2} cy={top + height / 2} r={size * 0.08} style="stroke" strokeWidth={stroke} color={CHALK} />
        <RoundedRect
          x={size * 0.36}
          y={top}
          width={size * 0.28}
          height={size * 0.1}
          r={size * 0.01}
          style="stroke"
          strokeWidth={stroke}
          color={CHALK_FAINT}
        />
        <RoundedRect
          x={size * 0.36}
          y={top + height - size * 0.1}
          width={size * 0.28}
          height={size * 0.1}
          r={size * 0.01}
          style="stroke"
          strokeWidth={stroke}
          color={CHALK_FAINT}
        />
      </Group>
      {FORMATION.map(([x, y], index) => (
        <Teammate key={index} clock={clock} size={size} x={x * size} y={y * size} at={0.12 + index * 0.045} finish={finish} />
      ))}
    </>
  );
}

function HigherScene({ clock, size }: SceneProps) {
  const base = size * 0.82;
  const barWidth = size * 0.2;
  const lowHeight = useDerivedValue(() => size * 0.34 * easeOut(ramp(clock.get(), 0.08, 0.36)));
  const highHeight = useDerivedValue(() => size * 0.54 * easeOut(ramp(clock.get(), 0.14, 0.42)));
  const lowTop = useDerivedValue(() => base - lowHeight.get());
  const highTop = useDerivedValue(() => base - highHeight.get());
  const lowOpacity = useDerivedValue(() => 1 - 0.5 * ramp(clock.get(), 0.5, 0.56));
  const reveal = useDerivedValue(() => ramp(clock.get(), 0.48, 0.54));
  const arrow = useDerivedValue(() => {
    const t = clock.get();
    return [{ translateY: Math.sin(t * Math.PI * 8) * size * 0.012 }, { scale: overshoot(ramp(t, 0.54, 0.62)) }];
  });
  const arrowX = size * 0.66;
  const arrowY = size * 0.18;
  const head = segment([
    [arrowX - size * 0.07, arrowY + size * 0.05],
    [arrowX, arrowY - size * 0.03],
    [arrowX + size * 0.07, arrowY + size * 0.05],
  ]);

  return (
    <>
      <Path
        path={segment([
          [size * 0.14, base],
          [size * 0.86, base],
        ])}
        style="stroke"
        strokeWidth={size * 0.012}
        strokeCap="round"
        color={CHALK}
      />
      <RoundedRect x={size * 0.24} y={lowTop} width={barWidth} height={lowHeight} r={size * 0.02} opacity={lowOpacity}>
        <LinearGradient
          start={vec(0, base - size * 0.34)}
          end={vec(0, base)}
          colors={[Finishes.o.light, Finishes.o.base, Finishes.o.deep]}
        />
      </RoundedRect>
      <RoundedRect x={size * 0.56} y={highTop} width={barWidth} height={highHeight} r={size * 0.02}>
        <LinearGradient
          start={vec(0, base - size * 0.54)}
          end={vec(0, base)}
          colors={[Finishes.o.light, Finishes.o.base, Finishes.o.deep]}
        />
      </RoundedRect>
      <Group opacity={reveal}>
        <RoundedRect
          x={size * 0.54}
          y={highTop}
          width={barWidth + size * 0.04}
          height={highHeight}
          r={size * 0.03}
          color={Colors.volt}
          opacity={0.45}>
          <BlurMask blur={size * 0.04} style="normal" />
        </RoundedRect>
        <RoundedRect x={size * 0.56} y={highTop} width={barWidth} height={highHeight} r={size * 0.02}>
          <LinearGradient start={vec(0, base - size * 0.54)} end={vec(0, base)} colors={['#F4FFCF', Colors.volt, '#6FA500']} />
        </RoundedRect>
      </Group>
      <Group origin={vec(arrowX, arrowY)} transform={arrow}>
        <Path path={head} style="stroke" strokeWidth={size * 0.035} strokeCap="round" strokeJoin="round" color={Colors.volt} />
      </Group>
    </>
  );
}

const LINKS = [
  { x: 0.23, y: 0.47, angle: -0.35, at: 0.1 },
  { x: 0.41, y: 0.53, angle: 0.35, at: 0.22 },
  { x: 0.59, y: 0.47, angle: -0.35, at: 0.34 },
  { x: 0.77, y: 0.53, angle: 0.35, at: 0.46 },
] as const;

function ChainScene({ clock, size, finish }: SceneProps) {
  const width = size * 0.26;
  const height = size * 0.15;
  const pulseX = useDerivedValue(() => size * lerp(0.2, 0.8, ramp(clock.get(), 0.56, 0.86)));
  const pulseY = useDerivedValue(() => size * (0.5 + Math.sin(ramp(clock.get(), 0.56, 0.86) * Math.PI * 3) * 0.03));
  const pulseOpacity = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.56, 0.86);
    return progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) : 0;
  });

  return (
    <>
      {LINKS.map((link, index) => {
        const x = link.x * size;
        const y = link.y * size;
        return (
          <Pop key={index} clock={clock} at={link.at} x={x} y={y}>
            <Group origin={vec(x, y)} transform={[{ rotate: link.angle }]}>
              <RoundedRect
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                r={height / 2}
                style="stroke"
                strokeWidth={size * 0.034}
                color={finish.base}
              />
              <RoundedRect
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                r={height / 2}
                style="stroke"
                strokeWidth={size * 0.01}
                color={finish.light}
              />
            </Group>
          </Pop>
        );
      })}
      <Circle cx={pulseX} cy={pulseY} r={size * 0.07} color={Colors.volt} opacity={pulseOpacity}>
        <BlurMask blur={size * 0.04} style="normal" />
      </Circle>
    </>
  );
}

const CHIPS = [0.08, 0.15, 0.22, 0.29, 0.36, 0.43];

function AuctionScene({ clock, size }: SceneProps) {
  const chipWidth = size * 0.3;
  const chipHeight = size * 0.075;
  const stackX = size * 0.32;
  const bubbleX = size * 0.67;
  const bubbleY = size * 0.32;
  const bubbleWidth = size * 0.34;
  const bubbleHeight = size * 0.24;
  const bubble = Skia.PathBuilder.Make();
  bubble.addRRect(
    Skia.RRectXY(Skia.XYWHRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight), size * 0.05, size * 0.05),
  );
  bubble.moveTo(bubbleX - bubbleWidth * 0.3, bubbleY + bubbleHeight / 2 - 1);
  bubble.lineTo(bubbleX - bubbleWidth * 0.42, bubbleY + bubbleHeight / 2 + size * 0.1);
  bubble.lineTo(bubbleX - bubbleWidth * 0.08, bubbleY + bubbleHeight / 2 - 1);
  bubble.close();
  const balloon = bubble.build();
  const stamp = useDerivedValue(() => [{ rotate: -0.14 }, { scale: overshoot(ramp(clock.get(), 0.55, 0.64)) }]);
  const shock = useDerivedValue(() => size * (0.12 + 0.24 * easeOut(ramp(clock.get(), 0.56, 0.78))));
  const shockOpacity = useDerivedValue(() => {
    const progress = ramp(clock.get(), 0.56, 0.78);
    return progress > 0 && progress < 1 ? 1 - progress : 0;
  });

  return (
    <>
      {CHIPS.map((at, index) => {
        const y = size * 0.8 - index * chipHeight * 0.95;
        return (
          <Pop key={index} clock={clock} at={at} x={stackX} y={y}>
            <Oval x={stackX - chipWidth / 2} y={y - chipHeight / 2} width={chipWidth} height={chipHeight}>
              <LinearGradient
                start={vec(stackX - chipWidth / 2, 0)}
                end={vec(stackX + chipWidth / 2, 0)}
                colors={[Finishes.x.deep, Finishes.x.light, Finishes.x.base, Finishes.x.deep]}
              />
            </Oval>
            <Oval
              x={stackX - chipWidth / 2}
              y={y - chipHeight / 2}
              width={chipWidth}
              height={chipHeight}
              style="stroke"
              strokeWidth={size * 0.006}
              color={Finishes.x.ink}
            />
          </Pop>
        );
      })}
      <Circle
        cx={bubbleX}
        cy={bubbleY}
        r={shock}
        style="stroke"
        strokeWidth={size * 0.012}
        color={Finishes.o.base}
        opacity={shockOpacity}
      />
      <Group origin={vec(bubbleX, bubbleY)} transform={stamp}>
        <Path path={balloon} color={Finishes.o.base} opacity={0.6}>
          <BlurMask blur={size * 0.04} style="normal" />
        </Path>
        <Path path={balloon}>
          <LinearGradient
            start={vec(bubbleX, bubbleY - bubbleHeight / 2)}
            end={vec(bubbleX, bubbleY + bubbleHeight / 2)}
            colors={[Finishes.o.light, Finishes.o.base, Finishes.o.deep]}
          />
        </Path>
        <Path
          path={segment([
            [bubbleX, bubbleY - bubbleHeight * 0.28],
            [bubbleX, bubbleY + bubbleHeight * 0.06],
          ])}
          style="stroke"
          strokeWidth={size * 0.04}
          strokeCap="round"
          color={Finishes.o.ink}
        />
        <Circle cx={bubbleX} cy={bubbleY + bubbleHeight * 0.26} r={size * 0.022} color={Finishes.o.ink} />
      </Group>
    </>
  );
}

function ListRow({ clock, size, rank, at }: { clock: SharedValue<number>; size: number; rank: number; at: number }) {
  const top = size * (0.115 + rank * 0.077);
  const height = size * 0.052;
  const full = size * (0.5 - rank * 0.022);
  const width = useDerivedValue(() => full * easeOut(ramp(clock.get(), at, at + 0.08)));
  const leader = rank === 0;
  const glow = useDerivedValue(() => (leader ? 0.6 * ramp(clock.get(), 0.62, 0.68) : 0));
  return (
    <>
      <Pop clock={clock} at={at} x={size * 0.22} y={top + height / 2}>
        <Circle cx={size * 0.22} cy={top + height / 2} r={height * 0.42} color={leader ? Finishes.x.base : CHALK} />
      </Pop>
      {leader ? (
        <RoundedRect
          x={size * 0.28}
          y={top - size * 0.01}
          width={width}
          height={height + size * 0.02}
          r={height / 2}
          color={Finishes.x.base}
          opacity={glow}>
          <BlurMask blur={size * 0.03} style="normal" />
        </RoundedRect>
      ) : null}
      <RoundedRect x={size * 0.29} y={top} width={width} height={height} r={height / 2} color={leader ? Finishes.x.base : CHALK_FAINT} />
    </>
  );
}

function TopTenScene({ clock, size }: SceneProps) {
  return (
    <>
      {Array.from({ length: 10 }, (_, rank) => (
        <ListRow key={rank} clock={clock} size={size} rank={rank} at={0.08 + (9 - rank) * 0.05} />
      ))}
    </>
  );
}

const ROUTE = [
  [0.18, 0.76],
  [0.38, 0.46],
  [0.6, 0.64],
  [0.8, 0.3],
] as const;

function CareerScene({ clock, size, finish }: SceneProps) {
  const points = ROUTE.map(([x, y]) => [x * size, y * size] as const);
  const route = segment(points);
  const routeEnd = useDerivedValue(() => easeOut(ramp(clock.get(), 0.06, 0.6)));
  const [goalX, goalY] = points[points.length - 1];
  const unit = size * 0.06;
  const question = Skia.PathBuilder.Make();
  question.moveTo(goalX - unit * 0.55, goalY - unit * 0.35);
  question.cubicTo(
    goalX - unit * 0.55,
    goalY - unit * 1.05,
    goalX + unit * 0.55,
    goalY - unit * 1.05,
    goalX + unit * 0.55,
    goalY - unit * 0.35,
  );
  question.cubicTo(goalX + unit * 0.55, goalY + unit * 0.05, goalX, goalY + unit * 0.02, goalX, goalY + unit * 0.4);
  const pulse = useDerivedValue(() => size * (0.1 + 0.05 * Math.abs(Math.sin(clock.get() * Math.PI * 6))));
  const pulseOpacity = useDerivedValue(() => 0.6 * ramp(clock.get(), 0.64, 0.7));

  return (
    <>
      <Path path={route} style="stroke" strokeWidth={size * 0.014} strokeCap="round" strokeJoin="round" color={CHALK} end={routeEnd} />
      {points.slice(0, -1).map(([x, y], index) => (
        <Pop key={index} clock={clock} at={0.06 + index * 0.18} x={x} y={y}>
          <Circle cx={x} cy={y} r={size * 0.05} color={Colors.panelRaised} />
          <Circle cx={x} cy={y} r={size * 0.05} style="stroke" strokeWidth={size * 0.012} color={finish.base} />
          <Circle cx={x} cy={y} r={size * 0.018} color={finish.light} />
        </Pop>
      ))}
      <Circle cx={goalX} cy={goalY} r={pulse} style="stroke" strokeWidth={size * 0.01} color={Colors.volt} opacity={pulseOpacity} />
      <Pop clock={clock} at={0.6} x={goalX} y={goalY}>
        <Circle cx={goalX} cy={goalY} r={size * 0.09} color={Colors.panelRaised} />
        <Circle cx={goalX} cy={goalY} r={size * 0.09} style="stroke" strokeWidth={size * 0.016} color={Colors.volt} />
        <Path path={question.build()} style="stroke" strokeWidth={size * 0.022} strokeCap="round" color={Colors.volt} />
        <Circle cx={goalX} cy={goalY + unit * 0.85} r={size * 0.014} color={Colors.volt} />
      </Pop>
    </>
  );
}

function RareScene({ clock, size, finish }: SceneProps) {
  const lensX = useDerivedValue(() => size * (0.46 + Math.cos(clock.get() * Math.PI * 2) * 0.06));
  const lensY = useDerivedValue(() => size * (0.44 + Math.sin(clock.get() * Math.PI * 2) * 0.06));
  const handle = useDerivedValue(() => {
    const path = Skia.PathBuilder.Make();
    const x = lensX.get();
    const y = lensY.get();
    path.moveTo(x + size * 0.13, y + size * 0.13);
    path.lineTo(x + size * 0.27, y + size * 0.27);
    return path.build();
  });
  return (
    <>
      <Circle cx={lensX} cy={lensY} r={size * 0.18} color={withAlpha(finish.base, 0.18)} />
      <Circle cx={lensX} cy={lensY} r={size * 0.18} style="stroke" strokeWidth={size * 0.035} color={finish.base} />
      <Path path={handle} style="stroke" strokeWidth={size * 0.05} strokeCap="round" color={finish.base} />
      <Circle cx={lensX} cy={lensY} r={size * 0.03} color={Colors.volt} />
    </>
  );
}

const SCENES = {
  grid: GridScene,
  duel: DuelScene,
  draft: DraftScene,
  higher: HigherScene,
  chain: ChainScene,
  rare: RareScene,
  auction: AuctionScene,
  'top-ten': TopTenScene,
  career: CareerScene,
} as const satisfies Record<GameId, (props: SceneProps) => ReactNode>;

interface GameSceneProps {
  game: GameId;
  size: number;
  active: boolean;
}

export function GameScene({ game, size, active }: GameSceneProps) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(RESTING);
  const fade = useDerivedValue(() => {
    const t = clock.get();
    return Math.min(ramp(t, 0, 0.03), 1 - ramp(t, 0.95, 1));
  });
  const finish = GAME_FINISHES[game];
  const Scene = SCENES[game];

  useEffect(() => {
    cancelAnimation(clock);
    if (active && !reduceMotion) {
      clock.set(0);
      clock.set(withRepeat(withTiming(1, { duration: LOOP_MILLISECONDS, easing: Easing.linear }), -1, false));
    } else {
      clock.set(RESTING);
    }
    return () => cancelAnimation(clock);
  }, [active, clock, reduceMotion]);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={size / 2} cy={size / 2} r={size * 0.5}>
        <RadialGradient c={vec(size / 2, size / 2)} r={size * 0.5} colors={[withAlpha(finish.base, 0.26), withAlpha(finish.base, 0)]} />
      </Circle>
      <Group opacity={fade}>
        <Scene clock={clock} size={size} finish={finish} />
      </Group>
    </Canvas>
  );
}
