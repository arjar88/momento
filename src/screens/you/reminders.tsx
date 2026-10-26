import { Host, Switch } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { updateProfile } from '@/lib/api';
import { syncReminderNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { spacing, useBrandColors } from '@/theme';
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
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: brand.paper }}
    >
      {needsGoal ? (
        <ThemedText variant="body">
          You chose to decide the pace yourself, so there is no quota to nudge. Pick 1, 2, or 3 on You if you want a reminder when the week is still open.
        </ThemedText>
      ) : (
        <ThemedText variant="body">
          On these days, at this time, Keepsakes can remind you on this device. If the week’s number is still open, the calendar shows a nudge to add a memory.
        </ThemedText>
      )}
      <View style={{ gap: spacing.sm }}>
        {WEEKDAY_NAMES.map((label, index) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="body">{label}</ThemedText>
            <Host matchContents>
              <Switch value={days.includes(index)} onValueChange={(on) => toggle(index, on)} />
            </Host>
          </View>
        ))}
      </View>
      <DateField label="Time" mode="time" value={when} onChange={setWhen} />
      {error ? (
        <ThemedText selectable variant="subhead">
          {error}
        </ThemedText>
      ) : null}
      <Button title="Save reminders" loading={pending} disabled={needsGoal} onPress={save} />
    </ScrollView>
  );
}
