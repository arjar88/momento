import { Stack } from 'expo-router/stack';
import { Link } from 'expo-router';

import { Icon } from '@/components/icon';
import { usePaperStackOptions } from '@/components/stack-options';
import { useBrandColors } from '@/theme';

export default function AlbumsLayout() {
  const screenOptions = usePaperStackOptions();
  const brand = useBrandColors();
  return (
    <Stack screenOptions={{ ...screenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Albums',
          headerRight: () => (
            <Link href="/albums/form" accessibilityLabel="New album">
              <Icon ios="plus" android="add" color={brand.terracotta} />
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: 'Album',
          presentation: 'formSheet',
          sheetAllowedDetents: [0.85, 1],
          sheetGrabberVisible: true,
          headerLargeTitleEnabled: false,
          headerTransparent: true,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="invite/[albumId]" options={{ title: 'Invite', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
