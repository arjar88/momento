import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MascotBanner } from '@/components/mascot';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbums } from '@/lib/api';
import { buildDraftPhotos } from '@/lib/intake';
import { useMemoryDraft } from '@/lib/memory-draft';
import { useSelectedAlbum } from '@/lib/selected-album';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
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
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, backgroundColor: brand.paper }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        >
          <MascotBanner
            title="Let’s keep a moment!"
            subtitle={
              lockedDate
                ? `Only photos from ${formatMonthDay(lockedDate)} will be kept.`
                : 'A photo lands on the day it was taken. Camera shots are today.'
            }
            mood="happy"
          />

          {album?.status === 'finished' ? (
            <View
              style={{
                backgroundColor: brand.card,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: brand.line,
                padding: spacing.lg,
                boxShadow: bubblyShadow.card,
              }}
            >
              <ThemedText variant="body">This album is finished. Reopen it before adding photos.</ThemedText>
            </View>
          ) : (
            <>
              {/* Headspace Explore-inspired 2x2 Puffy Pill Tiles */}
              <View style={{ flexDirection: 'row', gap: spacing.sm + 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo"
                  onPress={() => router.push({ pathname: '/add/camera', params: lockedDate ? { date: lockedDate } : {} })}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: brand.card,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: brand.line,
                    padding: spacing.md + 4,
                    gap: spacing.sm,
                    alignItems: 'flex-start',
                    boxShadow: bubblyShadow.card,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: brand.terracotta,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon ios="camera.fill" android="photo_camera" color="#fffdfb" size={20} />
                  </View>
                  <ThemedText variant="headline">Take a photo</ThemedText>
                  <ThemedText variant="caption">Dated today</ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose from photos"
                  onPress={choose}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: brand.card,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: brand.line,
                    padding: spacing.md + 4,
                    gap: spacing.sm,
                    alignItems: 'flex-start',
                    boxShadow: bubblyShadow.card,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: brand.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon ios="photo.on.rectangle" android="photo_library" color="#fffdfb" size={20} />
                  </View>
                  <ThemedText variant="headline">Choose from photos</ThemedText>
                  <ThemedText variant="caption">Up to 12 at once</ThemedText>
                </Pressable>
              </View>

              <Button
                title="Take a photo"
                onPress={() => router.push({ pathname: '/add/camera', params: lockedDate ? { date: lockedDate } : {} })}
              />
              <Button title="Choose from photos" variant="secondary" onPress={choose} />
            </>
          )}
        </ScrollView>
      )}
    </DataGate>
  );
}
