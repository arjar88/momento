import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

export function IntroScreen() {
  const brand = useBrandColors();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <View
        style={{
          backgroundColor: brand.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: brand.line,
          padding: spacing.lg + 4,
          gap: spacing.md,
          alignItems: 'center',
          boxShadow: bubblyShadow.card,
        }}
      >
        <Mascot size={68} mood="happy" />
        <ThemedText variant="wordmark" style={{ textAlign: 'center' }}>
          Keepsakes
        </ThemedText>
        <ThemedText variant="tagline" style={{ textAlign: 'center' }}>
          moments worth keeping
        </ThemedText>
        <ThemedText variant="body" style={{ textAlign: 'center' }}>
          Keepsakes is a quiet place for the photos you want to keep. A picture stays on the day it was taken.
        </ThemedText>
        <ThemedText variant="subhead" style={{ textAlign: 'center' }}>
          Your name, a weekly pace, and a first album come next. The home screen is that album.
        </ThemedText>
      </View>
      <Button title="Continue" onPress={() => router.push('/name')} />
      <Button title="Skip intro" variant="secondary" onPress={() => router.push('/name')} />
    </View>
  );
}
