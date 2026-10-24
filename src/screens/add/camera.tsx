import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbums } from '@/lib/api';
import { buildDraftPhotos } from '@/lib/intake';
import { useMemoryDraft } from '@/lib/memory-draft';
import { useSelectedAlbum } from '@/lib/selected-album';
import { spacing, useBrandColors } from '@/theme';
import { formatMonthDay, isDateKey, todayKey } from '@/utils/dates';

export function CameraScreen({ date }: { date?: string }) {
  const brand = useBrandColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [message, setMessage] = useState<string | null>(null);
  const { albumId } = useSelectedAlbum();
  const draft = useMemoryDraft();
  const albumsQuery = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const album = albumsQuery.data?.find((item) => item.id === albumId) ?? albumsQuery.data?.[0];
  const lockedDate = date && isDateKey(date) ? date : null;
  const cameraMatchesDay = !lockedDate || lockedDate === todayKey();

  const openReview = (photos: ReturnType<typeof buildDraftPhotos>) => {
    if (!album) return;
    draft.replaceDraft({
      albumId: album.id,
      lockedDate,
      photos: [...draft.photos, ...photos.photos],
      notice: photos.notice,
    });
    if (photos.photos.length === 0) {
      setMessage('Nothing from that selection could be kept.');
      return;
    }
    router.push({ pathname: '/add/review', params: lockedDate ? { date: lockedDate } : {} });
  };

  const takePhoto = async () => {
    if (!album || !cameraRef.current) return;
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    const photo = await cameraRef.current.takePictureAsync();
    if (!photo?.uri) return;
    openReview(buildDraftPhotos([{ uri: photo.uri, fromCamera: true }], {
      lockedDate,
      albumStart: album.start_date,
      albumEnd: album.end_date,
    }));
  };

  const choose = async () => {
    if (!album) return;
    const access = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!access.granted) {
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
    openReview(
      buildDraftPhotos(
        result.assets.map((asset) => ({ uri: asset.uri, exif: asset.exif })),
        { lockedDate, albumStart: album.start_date, albumEnd: album.end_date },
      ),
    );
  };

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.paper, justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
        <ThemedText variant="headline">Camera</ThemedText>
        <ThemedText variant="body">Keepsakes uses the camera only after you allow it, and only to take a photo of today.</ThemedText>
        <Button title="Allow camera" onPress={() => requestPermission()} />
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  if (!cameraMatchesDay) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.paper, justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
        <ThemedText variant="headline">This shot would be today</ThemedText>
        <ThemedText variant="body">
          A camera photo is dated today, so it can’t be kept on {lockedDate ? formatMonthDay(lockedDate) : 'another day'}. Choose a photo that was taken then.
        </ThemedText>
        <Button title="Choose from photos" onPress={choose} />
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} mirror={facing === 'front'} />
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.md }}>
        <GlassButton label="Close" onPress={() => router.back()}>
          <Icon ios="xmark" android="close" color="#fffdfb" />
        </GlassButton>
      </View>
      {message ? (
        <View style={{ position: 'absolute', top: insets.top + 64, left: spacing.lg, right: spacing.lg }}>
          <ThemedText variant="subhead" style={{ color: '#fffdfb', textAlign: 'center' }}>
            {message}
          </ThemedText>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + spacing.lg, alignItems: 'center', gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Shutter"
          onPress={takePhoto}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'white' }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <GlassButton label="Library" onPress={choose}>
            <Icon ios="photo" android="photo_library" color="#fffdfb" />
          </GlassButton>
          <GlassButton label="Flip camera" onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}>
            <Icon ios="arrow.triangle.2.circlepath" android="cameraswitch" color="#fffdfb" />
          </GlassButton>
        </View>
      </View>
    </View>
  );
}

function GlassButton({
  children,
  onPress,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <GlassView isInteractive style={{ borderRadius: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ padding: 12 }}>
        {children}
      </Pressable>
    </GlassView>
  );
}
