import { use, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { FormRevealContext } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, style, onFocus, onBlur, ...input }: TextFieldProps) {
  const uppercase = useUppercase();
  const reveal = use(FormRevealContext);
  const [offset, setOffset] = useState(0);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field} onLayout={(event) => setOffset(event.nativeEvent.layout.y)}>
      <ThemedText type="label" themeColor={focused ? 'volt' : 'textSecondary'}>
        {uppercase(label)}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={Colors.textSecondary}
        selectionColor={Colors.volt}
        style={[styles.input, focused && styles.inputFocused, style]}
        onFocus={(event) => {
          setFocused(true);
          reveal?.(offset);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...input}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: MinimumTouchSize + Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
    color: Colors.text,
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    paddingHorizontal: Spacing.three,
  },
  inputFocused: {
    borderColor: Colors.volt,
  },
});
