import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...input }: TextFieldProps) {
  const uppercase = useUppercase();
  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {uppercase(label)}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={Colors.textSecondary}
        selectionColor={Colors.volt}
        style={[styles.input, style]}
        {...input}
      />
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
});
