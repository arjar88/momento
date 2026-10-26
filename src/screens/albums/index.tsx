import { MenuView } from '@expo/ui/community/menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbumMemoryStats, fetchAlbums, signedUrls, updateAlbum } from '@/lib/api';
import type { Album } from '@/lib/database';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { radius, spacing, useBrandColors } from '@/theme';
import { formatRange, pacePercent } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function AlbumsScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile } = useSession();
  const { setAlbumId } = useSelectedAlbum();
  const albumsQuery = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const statsQuery = useQuery({
    queryKey: ['album-stats', (albumsQuery.data ?? []).map((album) => album.id).join(',')],
    queryFn: async () => {
      const memories = await fetchAlbumMemoryStats((albumsQuery.data ?? []).map((album) => album.id));
      const latest = new Map<string, string>();
      const counts = new Map<string, number>();
      for (const memory of memories) {
        counts.set(memory.album_id, (counts.get(memory.album_id) ?? 0) + 1);
        if (!latest.has(memory.album_id)) latest.set(memory.album_id, memory.storage_path);
      }
      const urls = await signedUrls([...latest.values()]);
      return { counts, latest, urls };
    },
    enabled: !!albumsQuery.data && albumsQuery.data.length > 0,
  });

  const status = useMutation({
    mutationFn: ({ album, next }: { album: Album; next: Album['status'] }) => updateAlbum(album.id, { status: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['albums'] }),
  });

  return (
    <DataGate
      query={albumsQuery}
      isEmpty={(rows) => rows.length === 0}
      empty={
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="headline">No albums yet</ThemedText>
          <ThemedText variant="body">An album is the place a stretch of days lives.</ThemedText>
          <Link href="/albums/form">
            <ThemedText variant="headline" style={{ color: brand.terracotta }}>
              New album
            </ThemedText>
          </Link>
        </View>
      }
    >
      {(albums) => (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, backgroundColor: brand.paper }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
          ListHeaderComponent={
            statsQuery.error ? (
              <View>
                <ThemedText selectable variant="subhead">
                  {statsQuery.error.message}
                </ThemedText>
              </View>
            ) : statsQuery.data === undefined ? (
              <ThemedText variant="caption">
                Counting memories…
              </ThemedText>
            ) : undefined
          }
          renderItem={({ item }) => {
            const count = statsQuery.data?.counts.get(item.id) ?? 0;
            const path = statsQuery.data?.latest.get(item.id);
            const cover = path ? statsQuery.data?.urls[path] : undefined;
            const pace = pacePercent(count, item.start_date, item.end_date, profile?.weekly_goal ?? null);
            const mine = item.owner_id === session?.user.id;
            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: brand.card,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: brand.line,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAlbumId(item.id);
                    router.push('/calendar');
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    gap: spacing.md,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {cover ? (
                    <Image
                      source={{ uri: cover }}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: radius.md,
                        borderCurve: 'continuous',
                        backgroundColor: brand.paper,
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: radius.md,
                        borderCurve: 'continuous',
                        backgroundColor: brand.paper,
                        borderWidth: 1,
                        borderColor: brand.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon ios="rectangle.stack" android="photo_album" color={brand.quiet} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="headline">{item.name}</ThemedText>
                    <ThemedText variant="caption">{formatRange(item.start_date, item.end_date)}</ThemedText>
                    <ThemedText variant="subhead">
                      {count === 1 ? '1 memory' : `${count} memories`}
                      {pace !== null ? ` · ${pace}% of the weekly pace` : ''}
                      {item.status === 'finished' ? ' · Finished' : ''}
                    </ThemedText>
                    {status.error && status.variables?.album.id === item.id ? (
                      <ThemedText selectable variant="caption">
                        {errorMessage(status.error)}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
                {mine ? (
                  <MenuView
                    actions={[
                      { id: 'share', title: 'Share', image: 'square.and.arrow.up' },
                      { id: 'edit', title: 'Edit', image: 'pencil' },
                      item.status === 'open'
                        ? { id: 'finish', title: 'Finish', attributes: { destructive: true } }
                        : { id: 'reopen', title: 'Reopen' },
                    ]}
                    onPressAction={({ nativeEvent }) => {
                      if (nativeEvent.event === 'share') router.push(`/albums/invite/${item.id}`);
                      if (nativeEvent.event === 'edit') router.push({ pathname: '/albums/form', params: { albumId: item.id } });
                      if (nativeEvent.event === 'reopen') status.mutate({ album: item, next: 'open' });
                      if (nativeEvent.event === 'finish') {
                        Alert.alert('Finish this album?', 'People won’t be able to add photos until you reopen it.', [
                          { text: 'Keep open', style: 'cancel' },
                          { text: 'Finish', style: 'destructive', onPress: () => status.mutate({ album: item, next: 'finished' }) },
                        ]);
                      }
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radius.full,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Actions for ${item.name}`}
                    >
                      <Icon ios="ellipsis" android="more_horiz" color={brand.ink} />
                    </View>
                  </MenuView>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </DataGate>
  );
}
