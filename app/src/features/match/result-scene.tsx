import { Image } from 'expo-image';
import { useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import goalWin from '@/assets/animations/goal-win.webp';
import trophyLoss from '@/assets/animations/trophy-loss.webp';
import { Motion, Spacing } from '@/constants/theme';

const SCENES = {
  win: { source: goalWin, ratio: 600 / 469 },
  loss: { source: trophyLoss, ratio: 600 / 425 },
} as const;
const MAX_WIDTH = 340;
const MAX_HEIGHT_SHARE = 0.24;

export function ResultScene({ tone }: { tone: keyof typeof SCENES }) {
  const { width, height } = useWindowDimensions();
  const scene = SCENES[tone];
  const sceneWidth = Math.min(width - Spacing.four * 2, MAX_WIDTH);
  const sceneHeight = Math.min(sceneWidth / scene.ratio, height * MAX_HEIGHT_SHARE);

  return (
    <Animated.View entering={FadeIn.duration(Motion.slow)} pointerEvents="none">
      <Image
        source={scene.source}
        style={{ width: sceneHeight * scene.ratio, height: sceneHeight }}
        contentFit="contain"
        autoplay
        accessible={false}
      />
    </Animated.View>
  );
}
