import { MenuView } from '@expo/ui/community/menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Mascot, MascotBanner } from '@/components/mascot';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbumMemoryStats, fetchAlbums, signedUrls, updateAlbum } from '@/lib/api';
import type { Album } from '@/lib/database';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { formatRange, pacePercent } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function AlbumsScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile } = useSession();
  const { albumId, setAlbumId } = useSelectedAlbum();
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
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, justifyContent: 'center' }}>
          <View
            style={{
              backgroundColor: brand.card,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: brand.line,
              padding: spacing.lg,
              gap: spacing.md,
              alignItems: 'center',
              boxShadow: bubblyShadow.card,
            }}
          >
            <Mascot size={60} mood="happy" />
            <ThemedText variant="title">No albums yet</ThemedText>
            <ThemedText variant="body" style={{ textAlign: 'center', color: brand.muted }}>
              An album is the place a stretch of days lives.
            </ThemedText>
            <Link href="/albums/form" asChild>
              <Button title="New album" style={{ alignSelf: 'stretch' }} />
            </Link>
          </View>
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
            <View style={{ gap: spacing.md, paddingBottom: spacing.xs }}>
              <MascotBanner
                title="For Memory Keepers like you"
                subtitle="Every stretch of days has its own cozy home."
                mood="calm"
              />
              {statsQuery.error ? (
                <ThemedText selectable variant="subhead">
                  {statsQuery.error.message}
                </ThemedText>
              ) : statsQuery.data === undefined ? (
                <ThemedText variant="caption">Counting memories…</ThemedText>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => {
            const count = statsQuery.data?.counts.get(item.id) ?? 0;
            const path = statsQuery.data?.latest.get(item.id);
            const cover = path ? statsQuery.data?.urls[path] : undefined;
            const pace = pacePercent(count, item.start_date, item.end_date, profile?.weekly_goal ?? null);
            const mine = item.owner_id === session?.user.id;
            const isSelected = item.id === albumId || (!albumId && index === 0);
            const isLast = index === albums.length - 1;

            return (
              <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
                {/* Headspace-inspired left timeline spine */}
                <View style={{ width: 24, alignItems: 'center', paddingTop: spacing.md + 4 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor:
                        item.status === 'finished'
                          ? brand.ink
                          : isSelected
                            ? brand.terracotta
                            : brand.card,
                      borderWidth: 2,
                      borderColor:
                        item.status === 'finished'
                          ? brand.ink
                          : isSelected
                            ? brand.terracotta
                            : brand.quiet,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.status === 'finished' ? (
                      <Icon ios="checkmark" android="check" size={12} color="#fffdfb" />
                    ) : isSelected ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fffdfb' }} />
                    ) : null}
                  </View>
                  {!isLast ? (
                    <View
                      style={{
                        flex: 1,
                        width: 2,
                        marginTop: 6,
                        backgroundColor: brand.line,
                        borderRadius: 1,
                      }}
                    />
                  ) : null}
                </View>

                {/* Puffy Headspace-style card with right-side rounded square thumbnail */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: brand.card,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: isSelected ? brand.terracotta : brand.line,
                    padding: spacing.md + 2,
                    gap: spacing.sm,
                    boxShadow: bubblyShadow.card,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAlbumId(item.id);
                      router.push('/calendar');
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: spacing.md,
                      alignItems: 'center',
                      opacity: pressed ? 0.78 : 1,
                    })}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <ThemedText variant="title">{item.name}</ThemedText>
                      <ThemedText variant="caption">{formatRange(item.start_date, item.end_date)}</ThemedText>
                      <ThemedText variant="subhead">
                        {count === 1 ? '1 memory' : `${count} memories`}
                        {pace !== null ? ` · ${pace}% pace` : ''}
                        {item.status === 'finished' ? ' · Finished' : ''}
                      </ThemedText>
                      {status.error && status.variables?.album.id === item.id ? (
                        <ThemedText selectable variant="caption">
                          {errorMessage(status.error)}
                        </ThemedText>
                      ) : null}
                    </View>

                    {cover ? (
                      <Image
                        source={{ uri: cover }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: radius.md,
                          borderCurve: 'continuous',
                          backgroundColor: brand.paper,
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: radius.md,
                          borderCurve: 'continuous',
                          backgroundColor: brand.paper,
                          borderWidth: 1.5,
                          borderColor: brand.line,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon ios="rectangle.stack" android="photo_album" color={brand.terracotta} size={26} />
                      </View>
                    )}
                  </Pressable>

                  {mine ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                      <View
                        style={{
                          backgroundColor: brand.paper,
                          paddingHorizontal: spacing.sm + 2,
                          paddingVertical: 4,
                          borderRadius: radius.full,
                        }}
                      >
                        <ThemedText variant="caption" style={{ color: brand.terracotta }}>
                          {item.status === 'finished' ? 'Completed' : 'Active album'}
                        </ThemedText>
                      </View>
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
                            width: 34,
                            height: 34,
                            borderRadius: radius.full,
                            backgroundColor: brand.paper,
                            borderWidth: 1,
                            borderColor: brand.line,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Actions for ${item.name}`}
                        >
                          <Icon ios="ellipsis" android="more_horiz" color={brand.ink} size={18} />
                        </View>
                      </MenuView>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </DataGate>
  );
}
