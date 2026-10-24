import { Stack } from 'expo-router/stack';

import { usePaperStackOptions } from '@/components/stack-options';

export default function YouLayout() {
  const screenOptions = usePaperStackOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: 'You' }} />
      <Stack.Screen name="reminders" options={{ title: 'Reminders', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
