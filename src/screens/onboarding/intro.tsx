import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { spacing, useBrandColors } from '@/theme';

export function IntroScreen() {
  const brand = useBrandColors();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <ThemedText variant="body">
        Keepsakes is a quiet place for the photos you want to keep. A picture stays on the day it was taken.
      </ThemedText>
      <ThemedText variant="body">Your name, a weekly pace, and a first album come next. The home screen is that album.</ThemedText>
      <Button title="Continue" onPress={() => router.push('/name')} />
      <Button title="Skip intro" variant="secondary" onPress={() => router.push('/name')} />
    </View>
  );
}
