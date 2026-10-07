import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, type Finish } from '@/constants/theme';

const SHEEN = 'rgba(255, 255, 255, 0.34)';
const SHEEN_FADE = 'rgba(255, 255, 255, 0)';

export type PlateCut = 'none' | 'left' | 'right';

type MetalPlateProps = PropsWithChildren<{
  finish: Finish | null;
  cut?: PlateCut;
  cutSize?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function platePath(width: number, height: number, radius: number, cut: PlateCut, cutSize: number) {
  const path = Skia.PathBuilder.Make();
  const left = cut === 'left' ? cutSize : 0;
  const right = cut === 'right' ? cutSize : 0;
  path.moveTo(left > 0 ? left : radius, 0);
  path.lineTo(width - (right > 0 ? right : radius), 0);
  if (right > 0) {
    path.lineTo(width, right);
  } else {
    path.quadTo(width, 0, width, radius);
  }
  path.lineTo(width, height - radius);
  path.quadTo(width, height, width - radius, height);
  path.lineTo(radius, height);
  path.quadTo(0, height, 0, height - radius);
  path.lineTo(0, left > 0 ? left : radius);
  if (left > 0) {
    path.lineTo(left, 0);
  } else {
    path.quadTo(0, 0, radius, 0);
  }
  path.close();
  return path.build();
}

export function MetalPlate({ finish, cut = 'none', cutSize = 14, radius = 10, style, children }: MetalPlateProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  };
  const { width, height } = size;
  const path = width > 0 && height > 0 ? platePath(width, height, radius, cut, cutSize) : null;
  const fill = finish ? [finish.light, finish.base, finish.deep] : [Colors.panelRaised, Colors.panel, Colors.ink];
  const edge = finish ? finish.light : Colors.strokeBright;

  return (
    <View style={style} onLayout={onLayout}>
      {path ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path path={path}>
            <LinearGradient start={vec(0, 0)} end={vec(width * 0.35, height)} colors={fill} positions={[0, 0.45, 1]} />
          </Path>
          <Path path={path}>
            <LinearGradient start={vec(0, 0)} end={vec(0, height * 0.55)} colors={[SHEEN, SHEEN_FADE]} />
          </Path>
          <Path path={path} style="stroke" strokeWidth={1.5} color={edge} opacity={finish ? 0.9 : 0.45} />
        </Canvas>
      ) : null}
      {children}
    </View>
  );
}
