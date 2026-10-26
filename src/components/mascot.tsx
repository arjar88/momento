import { View } from 'react-native';

import { ThemedText } from './themed-text';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

export function Mascot({
  size = 48,
  mood = 'happy',
}: {
  size?: number;
  mood?: 'happy' | 'calm';
}) {
  const brand = useBrandColors();
  const eyeSize = Math.max(4, Math.round(size * 0.1));
  const eyeGap = Math.round(size * 0.22);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.46,
        borderCurve: 'continuous',
        backgroundColor: brand.terracotta,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: bubblyShadow.pill,
      }}
    >
      <View style={{ flexDirection: 'row', gap: eyeGap, marginBottom: Math.round(size * 0.06) }}>
        {mood === 'calm' ? (
          <>
            <View
              style={{
                width: eyeSize * 1.5,
                height: eyeSize * 0.8,
                borderBottomWidth: 2,
                borderColor: '#fffdfb',
                borderRadius: eyeSize,
              }}
            />
            <View
              style={{
                width: eyeSize * 1.5,
                height: eyeSize * 0.8,
                borderBottomWidth: 2,
                borderColor: '#fffdfb',
                borderRadius: eyeSize,
              }}
            />
          </>
        ) : (
          <>
            <View style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#fffdfb' }} />
            <View style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#fffdfb' }} />
          </>
        )}
      </View>
      <View
        style={{
          width: Math.round(size * 0.26),
          height: Math.round(size * 0.13),
          borderBottomWidth: 2.2,
          borderLeftWidth: 1.5,
          borderRightWidth: 1.5,
          borderColor: '#fffdfb',
          borderBottomLeftRadius: size * 0.2,
          borderBottomRightRadius: size * 0.2,
        }}
      />
    </View>
  );
}

export function MascotBanner({
  title,
  subtitle,
  mood = 'happy',
}: {
  title: string;
  subtitle?: string;
  mood?: 'happy' | 'calm';
}) {
  const brand = useBrandColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: brand.card,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: brand.line,
        boxShadow: bubblyShadow.card,
      }}
    >
      <Mascot size={46} mood={mood} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline">{title}</ThemedText>
        {subtitle ? <ThemedText variant="subhead">{subtitle}</ThemedText> : null}
      </View>
    </View>
  );
}
