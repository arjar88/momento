import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/screen-states';
import { fonts, spacing, useBrandColors } from '@/theme';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    [fonts.serif]: require('../../assets/fonts/LibreBaskerville-Regular.ttf'),
    [fonts.serifBold]: require('../../assets/fonts/LibreBaskerville-Bold.ttf'),
    [fonts.serifItalic]: require('../../assets/fonts/LibreBaskerville-Italic.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator fontsReady={fontsLoaded || !!fontError} />
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const brand = useBrandColors();
  const { ready, configured, session, profile, profileError, refreshProfile, signOut } = useSession();
  const onboarded = !!profile?.onboarding_complete;

  useEffect(() => {
    if (fontsReady && ready) void SplashScreen.hideAsync();
  }, [fontsReady, ready]);

  if (!fontsReady || !ready) return null;

  if (session && !profile && profileError) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.paper, justifyContent: 'center', gap: spacing.sm, padding: spacing.lg }}>
        <ErrorState message={profileError} onRetry={() => void refreshProfile().catch(() => undefined)} />
        <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!configured}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={configured && !session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={configured && !!session && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={configured && !!session && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
