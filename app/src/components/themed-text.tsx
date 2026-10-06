import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, type ThemeColor } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'display' | 'title' | 'subtitle' | 'label' | 'score' | 'small' | 'smallBold';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor = 'text', ...rest }: ThemedTextProps) {
  return <Text style={[{ color: Colors[themeColor] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: 1,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    fontFamily: Fonts.displayMedium,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  score: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
});
