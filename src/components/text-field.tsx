import { TextInput, type TextInputProps } from 'react-native';

import { radius, spacing, useBrandColors, useSemanticColors } from '@/theme';

export function TextField({ style, ...props }: TextInputProps) {
  const brand = useBrandColors();
  const semantic = useSemanticColors();

  return (
    <TextInput
      placeholderTextColor={brand.quiet}
      autoCorrect={false}
      {...props}
      style={[
        {
          color: brand.ink,
          backgroundColor: brand.card,
          borderColor: brand.line,
          borderWidth: 1,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
          fontSize: 17,
          minHeight: 48,
        },
        style,
      ]}
      selectionColor={semantic.label}
    />
  );
}
