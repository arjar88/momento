import { Stack } from 'expo-router/stack';

import { usePaperStackOptions } from '@/components/stack-options';

export default function CalendarLayout() {
  const screenOptions = usePaperStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Calendar' }} />
      <Stack.Screen name="[date]" options={{ title: 'Day' }} />
    </Stack>
  );
}
