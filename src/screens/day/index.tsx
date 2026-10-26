import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';

import { Button } from '@/components/button';
import { MascotBanner } from '@/components/mascot';
import { EmptyState, ErrorState, InlineError, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { deleteMemory, fetchAlbum, fetchDayMemories, fetchNames, signedUrls } from '@/lib/api';
import type { Memory } from '@/lib/database';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { isDateKey, todayKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function DayScreen({ date }: { date: string }) {
  const brand = useBrandColors();
  const router = useRouter();
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
      style={{ flex: 1, backgroundColor: brand.paper }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing.xxl * 2,
        gap: spacing.lg,
        flexGrow: 1,
        backgroundColor: brand.paper,
      }}
      ListHeaderComponent={
        rows.length > 0 || memoriesQuery.isFetching || actionError || album?.status === 'finished' ? (
          <View style={{ gap: spacing.sm }}>
            {rows.length > 0 ? (
              <MascotBanner
                title={rows.length === 1 ? '1 moment kept today' : `${rows.length} moments kept today`}
                subtitle={album?.name}
                mood="happy"
              />
            ) : null}
            {memoriesQuery.isFetching && rows.length > 0 ? <ThemedText variant="caption">Refreshing…</ThemedText> : null}
            {actionError ? <InlineError message={actionError} /> : null}
            {album?.status === 'finished' ? (
              <ThemedText variant="subhead">This album is finished, so it isn’t taking new photos.</ThemedText>
            ) : null}
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          title="Nothing kept this day"
          body={canAdd ? 'A photo from this day can land here.' : 'This day is quiet in the album you’re viewing.'}
          action={canAdd ? 'Add a memory' : undefined}
          onAction={canAdd ? () => router.push({ pathname: '/add', params: { date } }) : undefined}
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
        canAdd && rows.length > 0 ? (
          <Link href={{ pathname: '/add', params: { date } }} asChild>
            <Button title="Add a memory" />
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
    <View
      style={{
        backgroundColor: brand.card,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: brand.line,
        padding: spacing.md,
        gap: spacing.sm,
        boxShadow: bubblyShadow.card,
      }}
    >
      {memory.url && !imageFailed ? (
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: brand.paper,
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
        <View style={{ height: 180, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText variant="subhead">Photo unavailable</ThemedText>
        </View>
      )}
      {memory.caption ? <ThemedText variant="body" selectable>{memory.caption}</ThemedText> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            backgroundColor: brand.paper,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: 4,
            borderRadius: radius.full,
          }}
        >
          <ThemedText variant="caption" style={{ color: brand.terracotta }}>
            {memory.author}
          </ThemedText>
        </View>
        {canDelete ? <Button title="Remove" variant="secondary" size="sm" loading={deleting} onPress={onDelete} /> : null}
      </View>
    </View>
  );
}
