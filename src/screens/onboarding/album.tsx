import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { dateFromKey, DateField } from '@/components/date-field';
import { MascotBanner } from '@/components/mascot';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { createAlbum, updateProfile } from '@/lib/api';
import { useOnboardingDraft } from '@/lib/onboarding-draft';
import { useSession } from '@/lib/session';
import { addYears, toDateKey, todayKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

export function FirstAlbumScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { session, refreshProfile } = useSession();
  const { displayName, weeklyGoal, goalChosen } = useOnboardingDraft();
  const today = todayKey();
  const [name, setName] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addYears(today, 1));
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!session || !goalChosen) return;
    setPending(true);
    setError(null);
    try {
      await updateProfile(session.user.id, {
        display_name: displayName.trim(),
        weekly_goal: weeklyGoal,
        onboarding_complete: false,
      });
      const albumId =
        createdId ??
        (
          await createAlbum({
            ownerId: session.user.id,
            name,
            startDate: start,
            endDate: end,
          })
        ).id;
      setCreatedId(albumId);
      await updateProfile(session.user.id, { onboarding_complete: true });
      await refreshProfile();
      router.replace('/calendar');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: brand.paper }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <MascotBanner
        title="Name your first album"
        subtitle="The calendar opens on an album, so this first one is required."
        mood="happy"
      />
      <View
        style={{
          backgroundColor: brand.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: brand.line,
          padding: spacing.md + 2,
          gap: spacing.md,
          boxShadow: bubblyShadow.card,
        }}
      >
        <TextField value={name} onChangeText={setName} placeholder="Album name" autoCapitalize="words" />
        <DateField label="Starts" value={dateFromKey(start)} maximum={dateFromKey(end)} onChange={(date) => setStart(toDateKey(date))} />
        <DateField label="Ends" value={dateFromKey(end)} minimum={dateFromKey(start)} onChange={(date) => setEnd(toDateKey(date))} />
      </View>
      {error ? (
        <ThemedText variant="subhead" selectable>
          {error}
        </ThemedText>
      ) : null}
      <View>
        <Button
          title="Create album"
          loading={pending}
          disabled={!name.trim() || !displayName.trim() || !goalChosen || end < start}
          onPress={submit}
        />
      </View>
    </ScrollView>
  );
}
