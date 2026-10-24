import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { dateFromKey, DateField } from '@/components/date-field';
import { ErrorState, LoadingState } from '@/components/screen-states';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { createAlbum, fetchAlbum, fetchMemoryDates, updateAlbum } from '@/lib/api';
import { useSession } from '@/lib/session';
import { addYears, toDateKey, todayKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';
import { spacing, useBrandColors } from '@/theme';

export function AlbumFormScreen({ albumId }: { albumId?: string }) {
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const existing = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => fetchAlbum(albumId!),
    enabled: !!albumId,
  });

  if (albumId && existing.data === undefined) {
    if (existing.error) return <ErrorState message={existing.error.message} onRetry={() => existing.refetch()} />;
    if (existing.fetchStatus === 'paused') return <ErrorState message="You’re offline." onRetry={() => existing.refetch()} />;
    return <LoadingState />;
  }
  if (albumId && !existing.data) return <ErrorState message="That album is gone." onRetry={() => existing.refetch()} />;

  return (
    <AlbumFormFields
      key={existing.data?.id ?? 'new'}
      initialName={existing.data?.name ?? ''}
      initialStart={existing.data?.start_date ?? todayKey()}
      initialEnd={existing.data?.end_date ?? addYears(todayKey(), 1)}
      albumId={albumId}
      paper={brand.paper}
      onSubmit={async (name, start, end) => {
        if (albumId) {
          const memories = await fetchMemoryDates(albumId);
          const outside = memories.filter((memory) => memory.taken_on < start || memory.taken_on > end);
          if (outside.length > 0) {
            throw new Error(
              outside.length === 1
                ? 'A saved memory would fall outside those dates.'
                : `${outside.length} saved memories would fall outside those dates.`,
            );
          }
          await updateAlbum(albumId, { name: name.trim(), start_date: start, end_date: end });
        } else if (session) {
          await createAlbum({ ownerId: session.user.id, name, startDate: start, endDate: end });
        }
        await queryClient.invalidateQueries({ queryKey: ['albums'] });
        router.back();
      }}
    />
  );
}

function AlbumFormFields({
  initialName,
  initialStart,
  initialEnd,
  albumId,
  paper,
  onSubmit,
}: {
  initialName: string;
  initialStart: string;
  initialEnd: string;
  albumId?: string;
  paper: string;
  onSubmit: (name: string, start: string, end: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => onSubmit(name, start, end),
    onError: (caught) => setError(errorMessage(caught)),
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: paper, flexGrow: 1 }}
    >
      <ThemedText variant="body">{albumId ? 'Change the name or the stretch of days.' : 'Name the album and the days it covers.'}</ThemedText>
      <TextField value={name} onChangeText={setName} placeholder="Album name" autoCapitalize="words" />
      <DateField label="Starts" value={dateFromKey(start)} maximum={dateFromKey(end)} onChange={(date) => setStart(toDateKey(date))} />
      <DateField label="Ends" value={dateFromKey(end)} minimum={dateFromKey(start)} onChange={(date) => setEnd(toDateKey(date))} />
      {error ? (
        <ThemedText selectable variant="subhead">
          {error}
        </ThemedText>
      ) : null}
      <View>
        <Button
          title={albumId ? 'Save album' : 'Create album'}
          loading={mutation.isPending}
          disabled={!name.trim() || end < start}
          onPress={() => {
            setError(null);
            mutation.mutate();
          }}
        />
      </View>
    </ScrollView>
  );
}
