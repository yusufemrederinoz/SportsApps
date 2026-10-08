import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { CREST_HEIGHT, CREST_WIDTH, RIBBON_HEIGHT, RIBBON_TOP, crestSvg } from '@/features/clubs/crest-svg';
import { crestOf } from '@/features/clubs/crests';

const CODE_SIZE = 0.19;

export function ClubCrest({ clubId, size = 44 }: { clubId: number; size?: number }) {
  const crest = crestOf(clubId);
  const picture = useMemo(() => (crest ? Skia.SVG.MakeFromString(crestSvg(crest)) : null), [crest]);
  const width = (size * CREST_WIDTH) / CREST_HEIGHT;

  if (!crest || !picture) {
    return null;
  }

  return (
    <View style={{ width, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Canvas style={StyleSheet.absoluteFill}>
        <ImageSVG svg={picture} x={0} y={0} width={width} height={size} />
      </Canvas>
      <View
        style={[
          styles.ribbon,
          { top: (size * RIBBON_TOP) / CREST_HEIGHT, height: (size * RIBBON_HEIGHT) / CREST_HEIGHT },
        ]}>
        <Text allowFontScaling={false} style={[styles.code, { fontSize: size * CODE_SIZE, lineHeight: size * CODE_SIZE * 1.15 }]}>
          {crest.code}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    fontFamily: Fonts.heading,
    color: Colors.ink,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
