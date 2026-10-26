import { TextInput, type TextInputProps } from 'react-native';

import { bubblyShadow, fonts, radius, spacing, useBrandColors, useSemanticColors } from '@/theme';

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
          fontFamily: fonts.sansSemiBold,
          color: brand.ink,
          backgroundColor: brand.card,
          borderColor: brand.line,
          borderWidth: 1.5,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md + 4,
          paddingVertical: spacing.sm + 6,
          fontSize: 16,
          minHeight: 54,
          boxShadow: bubblyShadow.pill,
        },
        style,
      ]}
      selectionColor={semantic.label}
    />
  );
}
