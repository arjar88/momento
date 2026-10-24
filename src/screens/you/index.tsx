import { FieldGroup, Host, Switch } from '@expo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/screen-states';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { deleteAccount, fetchPeople, updateProfile } from '@/lib/api';
import type { WeeklyGoal } from '@/lib/database';
import { ensureNotificationPermission, syncReminderNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { spacing, useBrandColors } from '@/theme';
import { errorMessage } from '@/utils/errors';

const goals: { value: WeeklyGoal; label: string }[] = [
  { value: 1, label: '1 a week' },
  { value: 2, label: '2 a week' },
  { value: 3, label: '3 a week' },
  { value: null, label: 'I’ll decide myself' },
];

export function YouScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile, refreshProfile, signOut } = useSession();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const people = useQuery({
    queryKey: ['people', session?.user.id],
    queryFn: () => fetchPeople(session!.user.id),
    enabled: !!session,
  });

  const saveName = async () => {
    if (!session || !name.trim()) return;
    try {
      const next = await updateProfile(session.user.id, { display_name: name.trim() });
      await refreshProfile();
      setName(next.display_name);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const saveGoal = async (weeklyGoal: WeeklyGoal) => {
    if (!session || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateProfile(session.user.id, { weekly_goal: weeklyGoal });
      await refreshProfile();
      await syncReminderNotifications(next);
      await queryClient.invalidateQueries({ queryKey: ['albums'] });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggleReminders = async (enabled: boolean) => {
    if (!session || !profile) return;
    setError(null);
    try {
      if (!enabled) {
        const next = await updateProfile(session.user.id, { reminder_enabled: false });
        await refreshProfile();
        await syncReminderNotifications(next);
        return;
      }
      const allowed = await ensureNotificationPermission();
      if (!allowed) {
        setError('Reminders stay off until notification permission is allowed.');
        return;
      }
      router.push('/you/reminders');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const removeAccount = () => {
    Alert.alert('Delete your account?', 'Your profile and the photos you added will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            await signOut();
          } catch (caught) {
            setError(errorMessage(caught));
          }
        },
      },
    ]);
  };

  if (!profile) return <LoadingState label="Loading you" />;

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="Name">
          <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
            <TextField value={name} onChangeText={setName} onEndEditing={saveName} placeholder="Your name" autoCapitalize="words" />
          </View>
        </FieldGroup.Section>
        <FieldGroup.Section title="Weekly pace">
          {goals.map((goal) => {
            const selected = profile.weekly_goal === goal.value;
            return (
              <Pressable key={goal.label} accessibilityRole="button" accessibilityState={{ selected }} disabled={busy} onPress={() => saveGoal(goal.value)}>
                <ThemedText variant="body" style={{ color: selected ? brand.terracotta : brand.ink }}>
                  {goal.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </FieldGroup.Section>
        <FieldGroup.Section title="Reminders" >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <ThemedText variant="body">Remind me</ThemedText>
            <Switch value={profile.reminder_enabled} onValueChange={(value) => void toggleReminders(value)} />
          </View>
          {profile.reminder_enabled ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/you/reminders')}>
              <ThemedText variant="body" style={{ color: brand.terracotta }}>
                Days and time
              </ThemedText>
            </Pressable>
          ) : null}
        </FieldGroup.Section>
        <FieldGroup.Section title="People">
          <PeopleBlock query={people} />
        </FieldGroup.Section>
        {error ? (
          <FieldGroup.Section title="Something needs attention">
            <ThemedText selectable variant="subhead">
              {error}
            </ThemedText>
          </FieldGroup.Section>
        ) : null}
        <FieldGroup.Section title="Account">
          <Pressable accessibilityRole="button" onPress={() => signOut()}>
            <ThemedText variant="body">Sign out</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={removeAccount}>
            <ThemedText variant="body" style={{ color: brand.terracotta }}>
              Delete account
            </ThemedText>
          </Pressable>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}

function PeopleBlock({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchPeople>>>>;
}) {
  if (query.data === undefined) {
    if (query.error) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
    if (query.fetchStatus === 'paused') return <ThemedText variant="body">You’re offline. People will load when you’re back.</ThemedText>;
    return <LoadingState label="Loading people" />;
  }
  if (query.data.length === 0) {
    return <ThemedText variant="body">When you share an album, people show up here.</ThemedText>;
  }
  const owned = query.data.filter((album) => album.role === 'owner');
  const shared = query.data.filter((album) => album.role !== 'owner');
  return (
    <View style={{ gap: spacing.md }}>
      {query.error ? (
        <ThemedText selectable variant="caption">
          Couldn’t refresh people.
        </ThemedText>
      ) : null}
      {owned.length > 0 ? <ThemedText variant="smallCaps">Albums you keep</ThemedText> : null}
      {owned.map((album) => (
        <View key={album.id} style={{ gap: 2 }}>
          <ThemedText variant="headline">{album.name}</ThemedText>
          {album.people.map((person) => (
            <ThemedText key={person.id} variant="body">
              {person.name} · {person.role}
            </ThemedText>
          ))}
          {album.pendingEmails.map((email) => (
            <ThemedText key={email} selectable variant="subhead">
              {email} · waiting to sign up
            </ThemedText>
          ))}
        </View>
      ))}
      {shared.length > 0 ? <ThemedText variant="smallCaps">Shared with you</ThemedText> : null}
      {shared.map((album) => (
        <View key={album.id} style={{ gap: 2 }}>
          <ThemedText variant="headline">{album.name}</ThemedText>
          {album.people.map((person) => (
            <ThemedText key={person.id} variant="body">
              {person.name} · {person.role}
            </ThemedText>
          ))}
        </View>
      ))}
    </View>
  );
}
