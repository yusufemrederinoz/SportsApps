import { DEFAULT_RULES } from '@sportapps/game-core';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { FootballerCard } from '@/features/match/footballer-card';
import { useUppercase } from '@/i18n/uppercase';

const SAMPLE_ROW = 'Real Madrid';
const SAMPLE_COLUMN = 'Barcelona';
const SAMPLE_FOOTBALLER = { id: 0, name: 'Gheorghe Hagi', countryCode: 'RO', role: 'MF' };
const CARD_SIZE = 132;
const LINE_CARD_SIZE = 84;
const LINE_CARDS = [0, 1, 2];

function OnboardingScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { finishOnboarding } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const header = (name: string) => (
    <MetalPlate finish={null} radius={Radius.medium} style={styles.headerPlate}>
      <ThemedText style={styles.headerText}>{uppercase(name)}</ThemedText>
    </MetalPlate>
  );

  const slides: { title: string; body: string; art: ReactNode }[] = [
    {
      title: t('onboarding.readTitle'),
      body: t('onboarding.readBody'),
      art: (
        <View style={styles.pairing}>
          {header(SAMPLE_ROW)}
          <ThemedText style={styles.cross}>×</ThemedText>
          {header(SAMPLE_COLUMN)}
        </View>
      ),
    },
    {
      title: t('onboarding.answerTitle'),
      body: t('onboarding.answerBody', { seconds: DEFAULT_RULES.turnSeconds }),
      art: <FootballerCard footballer={SAMPLE_FOOTBALLER} side="x" size={CARD_SIZE} emphasis="none" />,
    },
    {
      title: t('onboarding.winTitle'),
      body: t('onboarding.winBody'),
      art: (
        <View style={styles.line}>
          {LINE_CARDS.map((card) => (
            <FootballerCard key={card} footballer={null} side="x" size={LINE_CARD_SIZE} emphasis="winner" />
          ))}
        </View>
      ),
    },
  ];
  const last = index === slides.length - 1;

  const advance = () => {
    if (last) {
      void finishOnboarding();
    } else {
      scroll.current?.scrollTo({ x: (index + 1) * pageWidth, animated: true });
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => void finishOnboarding()} style={styles.skip} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('onboarding.skip'))}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.pager} onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        {pageWidth > 0 ? (
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
              setIndex((current) => (current === next ? current : Math.max(0, Math.min(slides.length - 1, next))));
            }}>
            {slides.map((slide, position) => (
              <View key={slide.title} style={[styles.slide, { width: pageWidth }]}>
                <View style={styles.art}>{slide.art}</View>
                <ThemedText style={styles.number}>{`0${position + 1}`}</ThemedText>
                <ThemedText type="title" accessibilityRole="header">
                  {uppercase(slide.title)}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{slide.body}</ThemedText>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.footer}>
        <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: slides.length, now: index + 1 }}>
          {slides.map((slide, position) => (
            <View key={slide.title} style={[styles.dot, position === index && styles.dotActive]} />
          ))}
        </View>
        <ActionButton label={t(last ? 'onboarding.start' : 'onboarding.next')} onPress={advance} />
      </Animated.View>
    </Screen>
  );
}

export default function OnboardingRoute() {
  return (
    <EntryGate allow="onboarding">
      <OnboardingScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  skip: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerPlate: {
    minWidth: 116,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  headerText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  cross: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 42,
    color: Colors.volt,
  },
  line: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  number: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.volt,
  },
  footer: {
    gap: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.stroke,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.volt,
  },
});
