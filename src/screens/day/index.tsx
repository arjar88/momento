import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState, ErrorState, InlineError, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { deleteMemory, fetchAlbum, fetchDayMemories, fetchNames, signedUrls } from '@/lib/api';
import type { Memory } from '@/lib/database';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { radius, spacing, useBrandColors } from '@/theme';
import { formatMonthDay, isDateKey, todayKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function DayScreen({ date }: { date: string }) {
  const brand = useBrandColors();
  const { session } = useSession();
  const { albumId } = useSelectedAlbum();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const albumQuery = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => fetchAlbum(albumId!),
    enabled: !!albumId,
  });
  const memoriesQuery = useQuery({
    queryKey: ['day-memories', albumId, date],
    queryFn: async () => {
      const rows = await fetchDayMemories(albumId!, date);
      const urls = await signedUrls(rows.map((row) => row.storage_path));
      const names = await fetchNames([...new Set(rows.map((row) => row.author_id))]);
      return rows.map((row) => ({ ...row, url: urls[row.storage_path] ?? null, author: names[row.author_id] || 'Someone' }));
    },
    enabled: !!albumId && isDateKey(date),
  });

  const remove = useMutation({
    mutationFn: deleteMemory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['day-memories', albumId, date] });
      await queryClient.invalidateQueries({ queryKey: ['memory-dates', albumId] });
      await queryClient.invalidateQueries({ queryKey: ['albums'] });
      await queryClient.invalidateQueries({ queryKey: ['album-stats'] });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (!isDateKey(date)) return <ErrorState message="That day is not a real date." onRetry={() => memoriesQuery.refetch()} />;
  if (!albumId) {
    return <EmptyState title="Open a day from the calendar" body="The day follows the album you are viewing." />;
  }
  if (albumQuery.isLoading || (memoriesQuery.data === undefined && !memoriesQuery.error)) {
    if (albumQuery.fetchStatus === 'paused' || memoriesQuery.fetchStatus === 'paused') {
      return <EmptyState title="You’re offline" body="We’ll try again when you’re back." action="Try again" onAction={() => memoriesQuery.refetch()} />;
    }
    return <LoadingState />;
  }
  if (memoriesQuery.error || albumQuery.error) {
    return (
      <ErrorState
        message={(memoriesQuery.error ?? albumQuery.error)?.message ?? 'Could not load this day.'}
        onRetry={() => {
          void memoriesQuery.refetch();
          void albumQuery.refetch();
        }}
      />
    );
  }

  const album = albumQuery.data;
  const inRange = !!album && date >= album.start_date && date <= album.end_date;
  const canAdd = !!album && album.status === 'open' && inRange && date <= todayKey();
  const rows = memoriesQuery.data;

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1, backgroundColor: brand.paper }}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          {memoriesQuery.isFetching && rows.length > 0 ? <ThemedText variant="caption">Refreshing…</ThemedText> : null}
          {actionError ? <InlineError message={actionError} /> : null}
          {album?.status === 'finished' ? (
            <ThemedText variant="subhead">This album is finished, so it isn’t taking new photos.</ThemedText>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="Nothing kept this day"
          body={canAdd ? 'A photo from this day can land here.' : 'This day is quiet in the album you’re viewing.'}
          action={canAdd ? 'Add a memory' : undefined}
          onAction={canAdd ? undefined : undefined}
        />
      }
      renderItem={({ item }) => (
        <MemoryCard
          memory={item}
          canDelete={item.author_id === session?.user.id || album?.owner_id === session?.user.id}
          deleting={remove.isPending}
          onDelete={() => {
            Alert.alert('Remove this memory?', 'The photo leaves the album.', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(item) },
            ]);
          }}
        />
      )}
      ListFooterComponent={
        canAdd ? (
          <Link href={{ pathname: '/add', params: { date } }}>
            <ThemedText variant="headline" style={{ color: brand.terracotta }}>
              Add a memory
            </ThemedText>
          </Link>
        ) : undefined
      }
    />
  );
}

function MemoryCard({
  memory,
  canDelete,
  deleting,
  onDelete,
}: {
  memory: Memory & { url: string | null; author: string };
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const brand = useBrandColors();
  const [imageLoading, setImageLoading] = useState(Boolean(memory.url));
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={{ gap: spacing.sm }}>
      {memory.url && !imageFailed ? (
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: brand.card,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: memory.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageFailed(true);
            }}
          />
          {imageLoading ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <ActivityIndicator color={brand.terracotta} />
              <ThemedText variant="caption">Loading photo…</ThemedText>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ height: 180, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.card, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText variant="subhead">Photo unavailable</ThemedText>
        </View>
      )}
      {memory.caption ? <ThemedText variant="body" selectable>{memory.caption}</ThemedText> : null}
      <ThemedText variant="caption">{memory.author}</ThemedText>
      {canDelete ? <Button title="Remove" variant="secondary" loading={deleting} onPress={onDelete} /> : null}
    </View>
  );
}
