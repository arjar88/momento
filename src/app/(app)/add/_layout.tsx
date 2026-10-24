import { Stack } from 'expo-router/stack';

import { usePaperStackOptions } from '@/components/stack-options';

export default function AddLayout() {
  const screenOptions = usePaperStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Add a memory' }} />
      <Stack.Screen name="camera" options={{ headerShown: false, title: 'Camera' }} />
      <Stack.Screen name="review" options={{ title: 'Review' }} />
    </Stack>
  );
}
