import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StadiumBackground } from '@/components/stadium-background';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
  scroll?: boolean;
}>;

export function Screen({ children, contentStyle, overlay, scroll = false }: ScreenProps) {
  return (
    <View style={styles.container}>
      <StadiumBackground />
      {scroll ? (
        <SafeAreaView style={styles.frame}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
    paddingBottom: Spacing.three,
  },
  grow: {
    flexGrow: 1,
  },
});
