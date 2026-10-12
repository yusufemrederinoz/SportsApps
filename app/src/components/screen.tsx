import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StadiumBackground } from '@/components/stadium-background';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export const SCREEN_BOTTOM_PADDING = Spacing.three;

type ScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
  scroll?: boolean;
  onContentHeight?: (height: number) => void;
}>;

export function Screen({ children, contentStyle, overlay, scroll = false, onContentHeight }: ScreenProps) {
  return (
    <View style={styles.container}>
      <StadiumBackground />
      {scroll ? (
        <SafeAreaView style={styles.frame}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onLayout={(event) => onContentHeight?.(event.nativeEvent.layout.height - SCREEN_BOTTOM_PADDING)}
            contentContainerStyle={[styles.padding, styles.grow, contentStyle]}>
            {children}
          </ScrollView>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.frame, styles.padding, contentStyle]}>{children}</SafeAreaView>
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  frame: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  padding: {
    paddingHorizontal: Spacing.three,
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },
  grow: {
    flexGrow: 1,
  },
});
