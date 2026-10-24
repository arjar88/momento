import { Stack, useLocalSearchParams } from 'expo-router';

import { AlbumFormScreen } from '@/screens/albums/form';

export default function AlbumFormRoute() {
  const { albumId } = useLocalSearchParams<{ albumId?: string }>();
  const id = typeof albumId === 'string' ? albumId : undefined;
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit album' : 'New album' }} />
      <AlbumFormScreen albumId={id} />
    </>
  );
}
