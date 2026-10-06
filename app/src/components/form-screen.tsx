import { createContext, useRef, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize, Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useUppercase } from '@/i18n/uppercase';

const REVEAL_DELAY_MILLISECONDS = 280;

export const FormRevealContext = createContext<((offset: number) => void) | null>(null);

type FormScreenProps = PropsWithChildren<{
  title: string;
  backLabel: string;
  onBack: () => void;
}>;

export function FormScreen({ title, backLabel, onBack, children }: FormScreenProps) {
  const uppercase = useUppercase();
  const keyboardHeight = useKeyboardHeight();
  const scroll = useRef<ScrollView>(null);

  const reveal = (offset: number) => {
    setTimeout(
      () => scroll.current?.scrollTo({ y: Math.max(0, offset - Spacing.four), animated: true }),
      REVEAL_DELAY_MILLISECONDS,
    );
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.five + keyboardHeight }]}>
        <FormRevealContext value={reveal}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.back} hitSlop={Spacing.two}>
            <ThemedText type="label" themeColor="textSecondary">
              {`‹ ${uppercase(backLabel)}`}
            </ThemedText>
          </Pressable>
          <ThemedText type="title" accessibilityRole="header" style={styles.title}>
            {uppercase(title)}
          </ThemedText>
          {children}
        </FormRevealContext>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    gap: Spacing.three,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: Spacing.two,
  },
});
