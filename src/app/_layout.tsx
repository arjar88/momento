import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
    [fonts.serif]: Fraunces_700Bold,
    [fonts.serifBold]: Fraunces_800ExtraBold,
    [fonts.serifItalic]: Fraunces_600SemiBold_Italic,
    [fonts.sans]: Nunito_500Medium,
    [fonts.sansSemiBold]: Nunito_600SemiBold,
    [fonts.sansBold]: Nunito_700Bold,
    [fonts.sansExtraBold]: Nunito_800ExtraBold,
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
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (fontsReady && ready) {
      setBooted(true);
      void SplashScreen.hideAsync();
    }
  }, [fontsReady, ready]);

  useEffect(() => {
    console.log('[auth] RootNavigator state:', {
      booted,
      ready,
      configured,
      hasSession: !!session,
      userId: session?.user.id ?? null,
      hasProfile: !!profile,
      onboarded,
      profileError,
    });
  }, [booted, configured, onboarded, profile, profileError, ready, session]);

  if (!booted && (!fontsReady || !ready)) return null;

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
