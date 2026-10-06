import { Canvas, Circle, Line, LinearGradient, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Colors } from '@/constants/theme';

const FLOODLIGHT = 'rgba(207, 230, 255, 0.30)';
const FLOODLIGHT_FADE = 'rgba(207, 230, 255, 0)';
const PITCH_GLOW = 'rgba(46, 229, 157, 0.20)';
const PITCH_FADE = 'rgba(46, 229, 157, 0)';
const PITCH_LINE = 'rgba(244, 248, 255, 0.07)';

export function StadiumBackground() {
  const { width, height } = useWindowDimensions();
  const pitchLine = height * 0.9;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[Colors.background, Colors.backgroundDeep]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width * 0.05, -height * 0.03)} r={width * 0.95} colors={[FLOODLIGHT, FLOODLIGHT_FADE]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width * 0.95, -height * 0.03)} r={width * 0.95} colors={[FLOODLIGHT, FLOODLIGHT_FADE]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width / 2, height * 1.08)} r={width} colors={[PITCH_GLOW, PITCH_FADE]} />
      </Rect>
      <Line p1={vec(0, pitchLine)} p2={vec(width, pitchLine)} color={PITCH_LINE} strokeWidth={2} />
      <Circle cx={width / 2} cy={pitchLine} r={width * 0.28} color={PITCH_LINE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}
