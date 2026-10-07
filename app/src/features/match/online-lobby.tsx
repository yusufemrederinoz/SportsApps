import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Radius, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

import type { OnlineFailure, OnlinePhase } from './use-online-match';

const PULSE_SIZE = 168;
const PULSE_MILLISECONDS = 1800;
const PULSES = [0, 1, 2];

const FAILURE_KEYS = {
  offline: 'online.failureOffline',
  'signed-out': 'online.failureSignedOut',
  unauthorized: 'online.failureSignedOut',
  'outdated-client': 'online.failureOutdated',
  replaced: 'online.failureReplaced',
  'room-not-found': 'online.failureRoomNotFound',
  'room-closed': 'online.failureRoomClosed',
} as const satisfies Partial<Record<OnlineFailure, string>>;

type KnownFailure = keyof typeof FAILURE_KEYS;

const FINAL_FAILURES: readonly OnlineFailure[] = ['outdated-client', 'replaced', 'room-not-found', 'room-closed'];

function Pulse({ delay }: { delay: number }) {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - progress.get()),
    transform: [{ scale: 0.35 + progress.get() * 0.65 }],
  }));

  useEffect(() => {
    progress.set(
      withDelay(delay, withRepeat(withTiming(1, { duration: PULSE_MILLISECONDS, easing: Easing.out(Easing.quad) }), -1)),
    );
  }, [delay, progress]);

  return <Animated.View style={[styles.pulse, style]} />;
}

interface OnlineLobbyProps {
  phase: Exclude<OnlinePhase, 'playing'>;
  failure: OnlineFailure | null;
  roomCode: string | null;
  gameLabel: string;
  onRetry: () => void;
  onLeave: () => void;
}

export function OnlineLobby({ phase, failure, roomCode, gameLabel, onRetry, onLeave }: OnlineLobbyProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();

  if (phase === 'failed') {
    return (
      <Screen contentStyle={styles.content}>
        <View style={styles.center}>
          <ThemedText type="title" themeColor="negative" style={styles.centered} accessibilityRole="header">
            {uppercase(t('online.failedTitle'))}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t(failure && failure in FAILURE_KEYS ? FAILURE_KEYS[failure as KnownFailure] : 'online.failureGeneric')}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          {failure && FINAL_FAILURES.includes(failure) ? null : <ActionButton label={t('online.retry')} onPress={onRetry} />}
          <ActionButton label={t('match.home')} onPress={onLeave} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const hosting = phase === 'hosting' && roomCode !== null;

  return (
    <Screen contentStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.center}>
        {hosting ? (
          <>
            <ThemedText type="label" themeColor="textSecondary" style={styles.centered}>
              {uppercase(t('online.roomTitle'))}
            </ThemedText>
            <View style={styles.code} accessible accessibilityLabel={`${t('online.roomTitle')}: ${roomCode.split('').join(' ')}`}>
              {roomCode.split('').map((character, index) => (
                <View key={`${character}-${index}`} style={styles.codeCell}>
                  <ThemedText style={styles.codeCharacter}>{character}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {t('online.roomHint')}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="gold" style={styles.centered}>
              {t('friend.createGame', { game: gameLabel })}
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.radar}>
              {PULSES.map((pulse) => (
                <Pulse key={pulse} delay={(pulse * PULSE_MILLISECONDS) / PULSES.length} />
              ))}
              <ThemedText style={styles.versus}>VS</ThemedText>
            </View>
            <ThemedText type="subtitle" themeColor="volt" style={styles.centered} accessibilityLiveRegion="polite">
              {uppercase(t(phase === 'connecting' ? 'online.connecting' : 'online.searching'))}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {t('online.searchingHint')}
            </ThemedText>
          </>
        )}
      </Animated.View>
      <View style={styles.actions}>
        {hosting ? (
          <ActionButton
            label={t('online.roomShare')}
            onPress={() => void Share.share({ message: t('online.roomShareText', { game: gameLabel, code: roomCode }) }).catch(() => undefined)}
          />
        ) : null}
        <ActionButton label={t('online.cancel')} onPress={onLeave} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  center: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.three,
  },
  radar: {
    alignSelf: 'center',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  pulse: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.volt,
  },
  versus: {
    width: PULSE_SIZE,
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 54,
    lineHeight: 58,
    color: Colors.text,
  },
  code: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  codeCell: {
    width: 54,
    height: 68,
    alignItems: 'stretch',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.panel,
  },
  codeCharacter: {
    textAlign: 'center',
    fontFamily: Fonts.heading,
    fontSize: 38,
    lineHeight: 42,
    color: Colors.volt,
  },
});
