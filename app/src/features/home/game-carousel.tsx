import type { GameId } from '@sportapps/protocol';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { GAMES, GAME_LABELS, GAME_SUBTITLES } from '@/features/games';
import { GameScene } from '@/features/home/game-scene';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const TEXT_SPACE = 168;
const SCENE_MINIMUM = 120;
const SCENE_MAXIMUM = 340;
const SCENE_WIDTH_SHARE = 0.74;
const DOT_SIZE = 8;
const DOT_STRETCH = 18;
const DOT_TOUCH = 38;
const DOT_SLOP = { top: 6, bottom: 6 };

interface PageProps {
  game: GameId;
  position: number;
  width: number;
  height: number;
  sceneSize: number;
  place: SharedValue<number>;
  active: boolean;
  points: number | null;
}

function GamePage({ game, position, width, height, sceneSize, place, active, points }: PageProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const name = t(GAME_LABELS[game]);
  const subtitle = t(GAME_SUBTITLES[game]);
  const sceneStyle = useAnimatedStyle(() => {
    const progress = place.get() - position;
    return {
      opacity: interpolate(progress, [-1, 0, 1], [0.3, 1, 0.3], Extrapolation.CLAMP),
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(progress, [-1, 0, 1], [40, 0, -40], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(progress, [-1, 0, 1], [0.78, 1, 0.78], Extrapolation.CLAMP) },
      ],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const progress = place.get() - position;
    return {
      opacity: interpolate(progress, [-0.6, 0, 0.6], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(progress, [-1, 0, 1], [-width * 0.25, 0, width * 0.25], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[styles.page, { width, height }]} accessible accessibilityLabel={`${name}. ${subtitle}`}>
      <Animated.View style={[{ width: sceneSize, height: sceneSize }, sceneStyle]}>
        <GameScene game={game} size={sceneSize} active={active} />
      </Animated.View>
      <Animated.View style={[styles.texts, textStyle]}>
        <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.name}>
          {uppercase(name)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={3} style={styles.subtitle}>
          {subtitle}
        </ThemedText>
        {points !== null ? (
          <ThemedText type="label" themeColor="volt">
            {uppercase(t('progress.gamePoints', { points }))}
          </ThemedText>
        ) : null}
      </Animated.View>
    </View>
  );
}

interface DotProps {
  position: number;
  place: SharedValue<number>;
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Dot({ position, place, label, selected, onPress }: DotProps) {
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(place.get() - position));
    return {
      width: DOT_SIZE + DOT_STRETCH * near,
      backgroundColor: interpolateColor(near, [0, 1], [Colors.strokeBright, Colors.volt]),
    };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={DOT_SLOP}
      onPress={onPress}
      style={styles.dotTouch}>
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
}

interface GameCarouselProps {
  index: number;
  onIndexChange: (index: number) => void;
  pointsFor: (game: GameId) => number | null;
}

export function GameCarousel({ index, onIndexChange, pointsFor }: GameCarouselProps) {
  const { t } = useTranslation();
  const scroller = useRef<Animated.ScrollView>(null);
  const place = useSharedValue(index);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const { width, height } = frame;
  const sceneSize = Math.round(Math.max(SCENE_MINIMUM, Math.min(width * SCENE_WIDTH_SHARE, height - TEXT_SPACE, SCENE_MAXIMUM)));
  const onScroll = useAnimatedScrollHandler((event) => {
    if (event.layoutMeasurement.width > 0) {
      place.set(event.contentOffset.x / event.layoutMeasurement.width);
    }
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setFrame((current) =>
      current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight },
    );
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) {
      return;
    }
    const next = Math.min(GAMES.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)));
    if (next !== index) {
      haptics.select();
      onIndexChange(next);
    }
  };
  const jump = (next: number) => {
    haptics.select();
    scroller.current?.scrollTo({ x: next * width, animated: true });
    onIndexChange(next);
  };

  return (
    <View style={styles.root}>
      <View style={styles.viewport} onLayout={onLayout}>
        {width > 0 ? (
          <Animated.ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={settle}
            onContentSizeChange={() => scroller.current?.scrollTo({ x: index * width, animated: false })}
            accessibilityHint={t('home.swipeHint')}>
            {GAMES.map((game, position) => (
              <GamePage
                key={game}
                game={game}
                position={position}
                width={width}
                height={height}
                sceneSize={sceneSize}
                place={place}
                active={position === index}
                points={pointsFor(game)}
              />
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>
      <View style={styles.dots}>
        {GAMES.map((game, position) => (
          <Dot
            key={game}
            position={position}
            place={place}
            label={t(GAME_LABELS[game])}
            selected={position === index}
            onPress={() => jump(position)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: Spacing.one,
  },
  viewport: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  texts: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  name: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dotTouch: {
    width: DOT_TOUCH,
    height: DOT_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
