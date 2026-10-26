import { Host, Switch } from '@expo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { MascotBanner } from '@/components/mascot';
import { ErrorState, LoadingState } from '@/components/screen-states';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { deleteAccount, fetchPeople, updateProfile } from '@/lib/api';
import type { WeeklyGoal } from '@/lib/database';
import { ensureNotificationPermission, syncReminderNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { errorMessage } from '@/utils/errors';

const goals: { value: WeeklyGoal; label: string; badge: string }[] = [
  { value: 1, label: '1 a week', badge: '1' },
  { value: 2, label: '2 a week', badge: '2' },
  { value: 3, label: '3 a week', badge: '3' },
  { value: null, label: 'I’ll decide myself', badge: '∞' },
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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: brand.paper }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <MascotBanner
        title={`Hi ${profile.display_name || 'friend'}!`}
        subtitle="Your pace, reminders, and shared circles."
        mood="happy"
      />

      <SectionCard title="Name">
        <TextField value={name} onChangeText={setName} onEndEditing={saveName} placeholder="Your name" autoCapitalize="words" />
      </SectionCard>

      <SectionCard title="Weekly pace">
        <View style={{ gap: spacing.sm }}>
          {goals.map((goal) => {
            const selected = profile.weekly_goal === goal.value;
            return (
              <Pressable
                key={goal.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={busy}
                onPress={() => saveGoal(goal.value)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.xs + 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? brand.paper : 'transparent',
                  borderWidth: selected ? 1.5 : 0,
                  borderColor: brand.terracotta,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: selected ? brand.terracotta : brand.paper,
                    borderWidth: 2,
                    borderColor: selected ? '#fffdfb' : brand.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: bubblyShadow.pill,
                  }}
                >
                  <ThemedText
                    variant="headline"
                    style={{ color: selected ? '#fffdfb' : brand.muted, fontVariant: ['tabular-nums'] }}
                  >
                    {goal.badge}
                  </ThemedText>
                </View>
                <ThemedText variant="headline" style={{ color: selected ? brand.terracotta : brand.ink, flex: 1 }}>
                  {goal.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Reminders">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <ThemedText variant="body">Remind me</ThemedText>
          <Host matchContents>
            <Switch value={profile.reminder_enabled} onValueChange={(value) => void toggleReminders(value)} />
          </Host>
        </View>
        {profile.reminder_enabled ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/you/reminders')} style={{ paddingTop: spacing.xs }}>
            <ThemedText variant="headline" style={{ color: brand.terracotta }}>
              Days and time
            </ThemedText>
          </Pressable>
        ) : null}
      </SectionCard>

      <SectionCard title="People">
        <PeopleBlock query={people} />
      </SectionCard>

      {error ? (
        <SectionCard title="Something needs attention">
          <ThemedText selectable variant="subhead">
            {error}
          </ThemedText>
        </SectionCard>
      ) : null}

      <SectionCard title="Account">
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ paddingVertical: spacing.xs }}>
          <ThemedText variant="headline">Sign out</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={removeAccount} style={{ paddingVertical: spacing.xs }}>
          <ThemedText variant="headline" style={{ color: brand.terracotta }}>
            Delete account
          </ThemedText>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const brand = useBrandColors();
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <ThemedText variant="smallCaps">{title}</ThemedText>
      <View
        style={{
          backgroundColor: brand.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: brand.line,
          padding: spacing.md + 2,
          gap: spacing.sm,
          boxShadow: bubblyShadow.card,
        }}
      >
        {children}
      </View>
    </View>
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
