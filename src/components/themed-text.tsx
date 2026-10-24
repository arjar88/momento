import { Text, type TextProps, type TextStyle } from 'react-native';

import { type, useBrandColors } from '@/theme';

type Variant = keyof typeof type;

export function ThemedText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: Variant }) {
  const brand = useBrandColors();
  const token = type[variant];
  const color =
    variant === 'month' || variant === 'screenTitle' || variant === 'wordmark' || variant === 'headline' || variant === 'title' || variant === 'body'
      ? brand.ink
      : variant === 'tagline' || variant === 'subhead' || variant === 'caption' || variant === 'smallCaps'
        ? brand.muted
        : brand.ink;

  return <Text {...props} style={[token as TextStyle, { color }, style]} />;
}
