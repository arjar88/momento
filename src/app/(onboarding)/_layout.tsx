import { Stack } from 'expo-router/stack';

import { usePaperStackOptions } from '@/components/stack-options';
import { OnboardingDraftProvider } from '@/lib/onboarding-draft';

export default function OnboardingLayout() {
  const screenOptions = usePaperStackOptions();
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="intro" options={{ title: 'Welcome' }} />
        <Stack.Screen name="name" options={{ title: 'Your name' }} />
        <Stack.Screen name="goal" options={{ title: 'Weekly pace' }} />
        <Stack.Screen name="album" options={{ title: 'First album' }} />
      </Stack>
    </OnboardingDraftProvider>
  );
}
