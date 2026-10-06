import { BlurMask, Canvas, Group, LinearGradient, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const SKY_TOP = '#101722';
const BEAM = 'rgba(214, 232, 255, 0.16)';
const BEAM_FADE = 'rgba(214, 232, 255, 0)';
const HAZE = 'rgba(200, 255, 46, 0.10)';
const HAZE_FADE = 'rgba(200, 255, 46, 0)';
const VIGNETTE = 'rgba(5, 7, 10, 0.78)';
const VIGNETTE_FADE = 'rgba(5, 7, 10, 0)';
const BREATH_MILLISECONDS = 5200;

function beamPath(width: number, height: number, fromLeft: boolean) {
  const flip = (x: number) => (fromLeft ? x : width - x);
  const path = Skia.Path.Make();
  path.moveTo(flip(-width * 0.2), -height * 0.05);
  path.lineTo(flip(width * 0.16), -height * 0.05);
  path.lineTo(flip(width * 0.86), height * 0.82);
  path.lineTo(flip(width * 0.38), height * 0.82);
  path.close();
  return path;
}

export function StadiumBackground() {
  const { width, height } = useWindowDimensions();
  const breath = useSharedValue(0);
  const beamOpacity = useDerivedValue(() => 0.55 + breath.get() * 0.45);

  useEffect(() => {
    breath.set(withRepeat(withTiming(1, { duration: BREATH_MILLISECONDS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breath]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[SKY_TOP, Colors.background, Colors.ink]} />
      </Rect>
      <Group opacity={beamOpacity}>
        <Path path={beamPath(width, height, true)}>
          <LinearGradient start={vec(0, 0)} end={vec(width * 0.6, height * 0.8)} colors={[BEAM, BEAM_FADE]} />
          <BlurMask blur={26} style="normal" />
        </Path>
        <Path path={beamPath(width, height, false)}>
          <LinearGradient start={vec(width, 0)} end={vec(width * 0.4, height * 0.8)} colors={[BEAM, BEAM_FADE]} />
          <BlurMask blur={26} style="normal" />
        </Path>
      </Group>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width / 2, height * 1.05)} r={width * 0.95} colors={[HAZE, HAZE_FADE]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, height * 0.45)}
          r={Math.max(width, height) * 0.78}
          colors={[VIGNETTE_FADE, VIGNETTE_FADE, VIGNETTE]}
          positions={[0, 0.55, 1]}
        />
      </Rect>
    </Canvas>
  );
}
