import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { MascotBanner } from '@/components/mascot';
import { TextField } from '@/components/text-field';
import { useOnboardingDraft } from '@/lib/onboarding-draft';
import { spacing, useBrandColors } from '@/theme';

export function NameScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { displayName, setDisplayName } = useOnboardingDraft();
  const ready = displayName.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.lg }}>
      <MascotBanner
        title="What should we call you?"
        subtitle="This is how the calendar greets you, and how friends see you in a shared album."
        mood="happy"
      />
      <TextField
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
      />
      <Button title="Continue" disabled={!ready} onPress={() => router.push('/goal')} />
    </View>
  );
}
