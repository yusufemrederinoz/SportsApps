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
    lineHeight: 23,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: 72,
    lineHeight: 68,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 46,
    lineHeight: 46,
  },
  subtitle: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 0.4,
  },
  label: {
    fontFamily: Fonts.label,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1.4,
  },
  score: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 40,
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
