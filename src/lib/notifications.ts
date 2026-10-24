import * as Notifications from 'expo-notifications';

import type { Profile } from './database';
import { parseTime } from '@/utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncReminderNotifications(profile: Profile | null) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!profile?.reminder_enabled || !profile.weekly_goal || profile.reminder_weekdays.length === 0) {
    return;
  }

  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { hour, minute } = parseTime(profile.reminder_time);
  await Promise.all(
    profile.reminder_weekdays.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keepsakes',
          body: "There's still room for a memory this week.",
          data: { href: '/add' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday + 1,
          hour,
          minute,
          channelId: 'reminders',
        },
      }),
    ),
  );
}
