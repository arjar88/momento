import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbums } from '@/lib/api';
import { buildDraftPhotos, noticeCopy } from '@/lib/intake';
import { useMemoryDraft } from '@/lib/memory-draft';
import { useSelectedAlbum } from '@/lib/selected-album';
import { spacing, useBrandColors } from '@/theme';
import { formatMonthDay, isDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function AddScreen({ date }: { date?: string }) {
  const brand = useBrandColors();
  const router = useRouter();
  const { albumId } = useSelectedAlbum();
  const draft = useMemoryDraft();
  const lockedDate = date && isDateKey(date) ? date : null;
  const albumsQuery = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const album = albumsQuery.data?.find((item) => item.id === albumId) ?? albumsQuery.data?.[0] ?? null;

  const choose = async () => {
    if (!album) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo library', 'Keepsakes can only use photos after you allow access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 12,
        exif: true,
        quality: 1,
      });
      if (result.canceled) return;
      const built = buildDraftPhotos(
        result.assets.map((asset) => ({ uri: asset.uri, exif: asset.exif })),
        { lockedDate, albumStart: album.start_date, albumEnd: album.end_date },
      );
      draft.replaceDraft({ albumId: album.id, lockedDate, photos: built.photos, notice: built.notice });
      router.push({ pathname: '/add/review', params: lockedDate ? { date: lockedDate } : {} });
    } catch (caught) {
      Alert.alert('Photos', errorMessage(caught));
    }
  };

  return (
    <DataGate
      query={albumsQuery}
      isEmpty={(rows) => rows.length === 0 || !album}
      empty={
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="headline">Choose an album first</ThemedText>
          <ThemedText variant="body">Memories live inside an album. Open one from the calendar or the album list.</ThemedText>
        </View>
      }
    >
      {() => (
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="body">A photo lands on the day it was taken. Camera shots are today.</ThemedText>
          {lockedDate ? (
            <ThemedText variant="subhead">Only photos from {formatMonthDay(lockedDate)} will be kept.</ThemedText>
          ) : null}
          {album?.status === 'finished' ? (
            <ThemedText variant="body">This album is finished. Reopen it before adding photos.</ThemedText>
          ) : (
            <>
              <Button
                title="Take a photo"
                onPress={() => router.push({ pathname: '/add/camera', params: lockedDate ? { date: lockedDate } : {} })}
              />
              <Button title="Choose from photos" variant="secondary" onPress={choose} />
            </>
          )}
        </View>
      )}
    </DataGate>
  );
}
