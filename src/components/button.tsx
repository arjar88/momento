import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { radius, spacing, useBrandColors } from '@/theme';

const sizes = {
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  md: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: keyof typeof sizes;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const brand = useBrandColors();
  const background =
    variant === 'primary' ? brand.terracotta : variant === 'destructive' ? brand.ink : 'transparent';
  const color = variant === 'secondary' ? brand.ink : '#fffdfb';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          opacity: inactive ? 0.45 : pressed ? 0.75 : 1,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: brand.line,
          ...sizes[size],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText variant="headline" style={{ color }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}
