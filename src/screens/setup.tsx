import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/lib/session';
import { radius, spacing, useBrandColors } from '@/theme';

export function SetupScreen() {
  const brand = useBrandColors();
  const { configError } = useSession();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: brand.paper, flexGrow: 1 }}
    >
      <ThemedText variant="wordmark">Keepsakes</ThemedText>
      <ThemedText variant="body">
        This app needs a Supabase project before it can keep anything. It compiles without one, and nothing is stored on a server until these are set.
      </ThemedText>
      {configError ? (
        <ThemedText variant="headline" selectable>
          {configError}
        </ThemedText>
      ) : null}
      <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.card }}>
        <ThemedText variant="smallCaps">Add to keepsakes/.env</ThemedText>
        <ThemedText selectable variant="body">
          EXPO_PUBLIC_SUPABASE_URL=
        </ThemedText>
        <ThemedText selectable variant="body">
          EXPO_PUBLIC_SUPABASE_ANON_KEY=
        </ThemedText>
      </View>
      <ThemedText variant="body">
        Use the anon key only. Never put a service-role key in the app. Then run the SQL in supabase/migrations and restart Expo.
      </ThemedText>
    </ScrollView>
  );
}
