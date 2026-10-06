import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StadiumBackground } from '@/components/stadium-background';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
}>;

export function Screen({ children, contentStyle, overlay }: ScreenProps) {
  return (
    <View style={styles.container}>
      <StadiumBackground />
      <SafeAreaView style={[styles.content, contentStyle]}>{children}</SafeAreaView>
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
  content: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
