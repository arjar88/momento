import { Stack } from 'expo-router/stack';

import { usePaperStackOptions } from '@/components/stack-options';

export default function AuthLayout() {
  const screenOptions = usePaperStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="create-account" options={{ title: 'Create account' }} />
    </Stack>
  );
}
