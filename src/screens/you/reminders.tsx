import { Host, Switch } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { MascotBanner } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { updateProfile } from '@/lib/api';
import { syncReminderNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { parseTime, timeKey, WEEKDAY_NAMES } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function RemindersScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { session, profile, refreshProfile } = useSession();
  const initial = parseTime(profile?.reminder_time ?? '09:00:00');
  const [days, setDays] = useState<number[]>(profile?.reminder_weekdays ?? []);
  const [when, setWhen] = useState(() => {
    const date = new Date();
    date.setHours(initial.hour, initial.minute, 0, 0);
    return date;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const needsGoal = !profile?.weekly_goal;

  const toggle = (day: number, on: boolean) => {
    setDays((current) => (on ? [...new Set([...current, day])].sort() : current.filter((value) => value !== day)));
  };

  const save = async () => {
    if (!session || !profile) return;
    if (days.length === 0) {
      setError('Pick at least one day.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await updateProfile(session.user.id, {
        reminder_enabled: true,
        reminder_weekdays: days,
        reminder_time: timeKey(when.getHours(), when.getMinutes()),
      });
      await refreshProfile();
      await syncReminderNotifications(next);
      router.back();
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
        title="Gentle reminders"
        subtitle={
          needsGoal
            ? 'Pick 1, 2, or 3 on You if you want a reminder when the week is still open.'
            : 'If the week’s number is still open, the calendar shows a nudge to add a memory.'
        }
        mood="calm"
      />
      <View
        style={{
          backgroundColor: brand.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: brand.line,
          padding: spacing.md + 2,
          gap: spacing.sm + 2,
          boxShadow: bubblyShadow.card,
        }}
      >
        {WEEKDAY_NAMES.map((label, index) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="headline">{label}</ThemedText>
            <Host matchContents>
              <Switch value={days.includes(index)} onValueChange={(on) => toggle(index, on)} />
            </Host>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: brand.line, marginVertical: spacing.xs }} />
        <DateField label="Time" mode="time" value={when} onChange={setWhen} />
      </View>
      {error ? (
        <ThemedText selectable variant="subhead">
          {error}
        </ThemedText>
      ) : null}
      <Button title="Save reminders" loading={pending} disabled={needsGoal} onPress={save} />
    </ScrollView>
  );
}
