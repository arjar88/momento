import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

const sizes = {
  sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, minHeight: 38 },
  md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg, minHeight: 54 },
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
    variant === 'primary' ? brand.terracotta : variant === 'destructive' ? brand.ink : brand.card;
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
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: brand.line,
          boxShadow: variant === 'primary' ? bubblyShadow.float : bubblyShadow.pill,
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
