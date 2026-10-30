import type { Side } from '@sportapps/game-core';
import { REACTION_COOLDOWN_MILLISECONDS, REACTION_IDS, type ReactionId } from '@sportapps/protocol';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { ReactionEvent } from '@/features/match/use-online-match';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

import { REACTION_SOUNDS, ReactionArt } from './reaction-art';

const BURST_MILLISECONDS = 2600;
const BURST_SIZE = 120;
const BUTTON_SIZE = 44;
const CELL_SIZE = 64;
const COLUMNS = 4;

const NAME_KEYS = {
  laugh: 'reactions.laugh',
  tease: 'reactions.tease',
  cool: 'reactions.cool',
  shock: 'reactions.shock',
  sweat: 'reactions.sweat',
  cry: 'reactions.cry',
  angry: 'reactions.angry',
  clap: 'reactions.clap',
  'red-card': 'reactions.red-card',
  var: 'reactions.var',
  offside: 'reactions.offside',
  save: 'reactions.save',
} as const satisfies Record<ReactionId, string>;

export interface ReactionControl {
  events: readonly ReactionEvent[];
  ownSide: Side;
  rivalName: string;
  send: (reaction: ReactionId) => boolean;
}

interface ReactionState extends ReactionControl {
  muted: boolean;
  setMuted: (muted: boolean) => void;
}

const ReactionContext = createContext<ReactionState | null>(null);

export function ReactionProvider({ control, children }: { control: ReactionControl | null; children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const heard = useRef<Set<number> | null>(null);
  const events = control?.events;
  const ownSide = control?.ownSide;

  useEffect(() => {
    if (!events) {
      return;
    }
    if (heard.current === null) {
      heard.current = new Set(events.map((event) => event.key));
      return;
    }
    const known = heard.current;
    events
      .filter((event) => !known.has(event.key))
      .forEach((event) => {
        known.add(event.key);
        if (event.side === ownSide) {
          playSound(REACTION_SOUNDS[event.reaction]);
        } else if (!muted) {
          playSound(REACTION_SOUNDS[event.reaction]);
          haptics.tick();
        }
      });
  }, [events, ownSide, muted]);

  return <ReactionContext value={control ? { ...control, muted, setMuted } : null}>{children}</ReactionContext>;
}

function useBursts(reactions: ReactionState | null): ReactionEvent[] {
  const [shown, setShown] = useState<ReactionEvent[]>([]);
  const seen = useRef(new Set<number>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const events = reactions?.events;
  const ownSide = reactions?.ownSide;
  const muted = reactions?.muted ?? false;

  useEffect(() => {
    const time = Date.now();
    (events ?? []).forEach((event) => {
      if (seen.current.has(event.key)) {
        return;
      }
      seen.current.add(event.key);
      const age = time - event.at;
      if (age >= BURST_MILLISECONDS || (event.side !== ownSide && muted)) {
        return;
      }
      setShown((current) => [...current.filter((entry) => entry.side !== event.side), event]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setShown((current) => current.filter((entry) => entry.key !== event.key));
      }, BURST_MILLISECONDS - age);
      timers.current.add(timer);
    });
  }, [events, ownSide, muted]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return shown;
}

export function ReactionBursts() {
  const reactions = use(ReactionContext);
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const insets = useSafeAreaInsets();
  const shown = useBursts(reactions);

  if (!reactions) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shown.map((event) =>
        event.side === reactions.ownSide ? (
          <Animated.View
            key={event.key}
            entering={ZoomIn.duration(Motion.base)}
            exiting={FadeOut.duration(Motion.base)}
            style={[styles.own, { top: insets.top + MinimumTouchSize }]}>
            <ReactionArt reaction={event.reaction} size={BURST_SIZE} play />
          </Animated.View>
        ) : (
          <Animated.View
            key={event.key}
            entering={ZoomIn.duration(Motion.base)}
            exiting={ZoomOut.duration(Motion.base)}
            style={[styles.rival, { top: insets.top + MinimumTouchSize }]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={t('reactions.from', { name: reactions.rivalName, reaction: t(NAME_KEYS[event.reaction]) })}>
            <ReactionArt reaction={event.reaction} size={BURST_SIZE} play />
            <View style={styles.name}>
              <ThemedText style={styles.nameText} numberOfLines={1}>
                {uppercase(reactions.rivalName)}
              </ThemedText>
            </View>
          </Animated.View>
        ),
      )}
    </View>
  );
}

function ReactionTray({ onPick, onClose }: { onPick: (reaction: ReactionId) => void; onClose: () => void }) {
  const reactions = use(ReactionContext);
  const { t } = useTranslation();
  const uppercase = useUppercase();
  if (!reactions) {
    return null;
  }

  return (
    <Animated.View entering={ZoomIn.duration(Motion.base)} exiting={FadeOut.duration(Motion.quick)} style={styles.tray}>
      <View style={styles.grid}>
        {REACTION_IDS.map((reaction) => (
          <Pressable
            key={reaction}
            accessibilityRole="button"
            accessibilityLabel={t(NAME_KEYS[reaction])}
            onPress={() => onPick(reaction)}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}>
            <ReactionArt reaction={reaction} size={CELL_SIZE} />
          </Pressable>
        ))}
      </View>
      <View style={styles.trayFooter}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: reactions.muted }}
          onPress={() => {
            haptics.select();
            reactions.setMuted(!reactions.muted);
          }}
          style={({ pressed }) => [styles.mute, reactions.muted && styles.muteOn, pressed && styles.cellPressed]}>
          <ThemedText style={[styles.muteText, reactions.muted && styles.muteTextOn]} numberOfLines={1}>
            {uppercase(t(reactions.muted ? 'reactions.unmute' : 'reactions.mute'))}
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('reactions.close'))}
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function ReactionLayer() {
  const reactions = use(ReactionContext);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);

  useEffect(() => {
    if (!cooling) {
      return undefined;
    }
    const timer = setTimeout(() => setCooling(false), REACTION_COOLDOWN_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [cooling]);

  if (!reactions) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <ReactionBursts />
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('reactions.close')}
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
      ) : null}
      {open ? (
        <View style={[styles.center, { top: insets.top + MinimumTouchSize + Spacing.one }]} pointerEvents="box-none">
          <ReactionTray
            onClose={() => setOpen(false)}
            onPick={(reaction) => {
              haptics.select();
              if (reactions.send(reaction)) {
                setCooling(true);
              }
              setOpen(false);
            }}
          />
        </View>
      ) : null}
      <Animated.View
        entering={FadeIn.duration(Motion.slow)}
        style={[styles.center, { top: insets.top + (MinimumTouchSize - BUTTON_SIZE) / 2 }]}
        pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('reactions.open')}
          accessibilityState={{ expanded: open, disabled: cooling }}
          disabled={cooling}
          onPress={() => {
            haptics.tick();
            setOpen((current) => !current);
          }}
          style={({ pressed }) => [styles.button, open && styles.buttonOpen, cooling && styles.buttonCooling, pressed && styles.cellPressed]}>
          <ReactionArt reaction="laugh" size={BUTTON_SIZE - Spacing.two} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rival: {
    position: 'absolute',
    right: Spacing.three,
    alignItems: 'center',
  },
  own: {
    position: 'absolute',
    left: Spacing.three,
  },
  name: {
    marginTop: -Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  nameText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    lineHeight: 17,
    color: Colors.gold,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 7, 10, 0.45)',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tray: {
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
  },
  grid: {
    width: COLUMNS * (CELL_SIZE + Spacing.two),
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE + Spacing.two,
    height: CELL_SIZE + Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  cellPressed: {
    opacity: 0.7,
  },
  trayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mute: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  muteOn: {
    borderColor: Colors.negative,
  },
  muteText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  muteTextOn: {
    color: Colors.negative,
  },
  close: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.panelRaised,
  },
  buttonOpen: {
    borderColor: Colors.gold,
  },
  buttonCooling: {
    opacity: 0.45,
  },
});
