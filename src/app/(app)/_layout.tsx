import { NativeTabs } from 'expo-router/native-tabs';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { MemoryDraftProvider } from '@/lib/memory-draft';
import { SelectedAlbumProvider } from '@/lib/selected-album';
import { useBrandColors } from '@/theme';

export default function AppLayout() {
  const brand = useBrandColors();
  const router = useRouter();

  useEffect(() => {
    if (process.env.EXPO_OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/add');
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <SelectedAlbumProvider>
      <MemoryDraftProvider>
        <NativeTabs
          tintColor={brand.terracotta}
          backgroundColor={brand.paper}
          iconColor={{ default: brand.muted, selected: brand.terracotta }}
          labelStyle={{
            default: { color: brand.muted },
            selected: { color: brand.terracotta },
          }}
        >
          <NativeTabs.Trigger name="calendar">
            <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
            <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="albums">
            <NativeTabs.Trigger.Icon sf="rectangle.stack" md="photo_album" />
            <NativeTabs.Trigger.Label>Albums</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="add">
            <NativeTabs.Trigger.Icon sf="plus" md="add" />
            <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="you">
            <NativeTabs.Trigger.Icon sf="person" md="person" />
            <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </MemoryDraftProvider>
    </SelectedAlbumProvider>
  );
}
