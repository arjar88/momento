import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { dateFromKey, DateField } from '@/components/date-field';
import { EmptyState } from '@/components/screen-states';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbum, saveMemory } from '@/lib/api';
import { noticeCopy } from '@/lib/intake';
import { useMemoryDraft } from '@/lib/memory-draft';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { clampDate, formatMonthDay, todayKey, toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

export function ReviewScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const draft = useMemoryDraft();
  const albumQuery = useQuery({
    queryKey: ['album', draft.albumId],
    queryFn: () => fetchAlbum(draft.albumId!),
    enabled: !!draft.albumId,
  });
  const album = albumQuery.data;
  const notice = noticeCopy(draft.notice, draft.lockedDate ? formatMonthDay(draft.lockedDate) : null);
  const suggested = album ? clampDate(todayKey(), album.start_date, album.end_date) : null;
  const latest = album && album.end_date < todayKey() ? album.end_date : todayKey();
  const missingDate = draft.photos.some((photo) => !photo.takenOn);

  const save = useMutation({
    mutationFn: async () => {
      if (!album || !session) throw new Error('The album is missing.');
      if (album.status === 'finished') throw new Error('This album is finished.');
      const saved: string[] = [];
      try {
        for (const photo of draft.photos) {
          if (!photo.takenOn) throw new Error('Choose a date for each photo.');
          if (photo.takenOn > todayKey()) throw new Error('A memory cannot be dated in the future.');
          if (draft.lockedDate && photo.takenOn !== draft.lockedDate) {
            throw new Error(`This photo has to stay on ${formatMonthDay(draft.lockedDate)}.`);
          }
          if (photo.takenOn < album.start_date || photo.takenOn > album.end_date) {
            throw new Error('That date is outside the album.');
          }
          await saveMemory({
            albumId: album.id,
            authorId: session.user.id,
            uri: photo.uri,
            takenOn: photo.takenOn,
            caption: photo.caption,
          });
          saved.push(photo.localId);
        }
      } catch (caught) {
        const keep = draft.photos.filter((photo) => !saved.includes(photo.localId)).map((photo) => photo.localId);
        draft.keepPhotos(keep);
        throw caught;
      }
    },
    onSuccess: async () => {
      draft.clearDraft();
      await queryClient.invalidateQueries({ queryKey: ['memory-dates'] });
      await queryClient.invalidateQueries({ queryKey: ['albums'] });
      await queryClient.invalidateQueries({ queryKey: ['day-memories'] });
      await queryClient.invalidateQueries({ queryKey: ['album-stats'] });
      router.replace('/calendar');
    },
  });

  if (draft.photos.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.paper }}>
        <EmptyState
          title="Nothing to review"
          body={notice ?? 'Choose a photo, or take one, and it will wait here until it saves.'}
          action="Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: brand.paper }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      {notice ? <ThemedText variant="subhead">{notice}</ThemedText> : null}
      {draft.photos.map((photo) => {
        const chosen = photo.takenOn ?? suggested;
        return (
          <View
            key={photo.localId}
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
            <Image
              source={{ uri: photo.uri }}
              style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.paper }}
              contentFit="cover"
            />
            {draft.lockedDate || photo.takenOn ? (
              <ThemedText variant="title">{formatMonthDay(photo.takenOn ?? draft.lockedDate!)}</ThemedText>
            ) : null}
            {!draft.lockedDate && chosen ? (
              <DateField
                label={photo.takenOn ? 'Date' : 'Choose the day'}
                value={dateFromKey(chosen)}
                minimum={album ? dateFromKey(album.start_date) : undefined}
                maximum={dateFromKey(latest)}
                onChange={(next) => draft.updatePhoto(photo.localId, { takenOn: toDateKey(next) })}
              />
            ) : null}
            {!photo.takenOn && !draft.lockedDate && suggested ? (
              <Button
                title="Use this date"
                variant="secondary"
                onPress={() => draft.updatePhoto(photo.localId, { takenOn: suggested })}
              />
            ) : null}
            {!photo.takenOn && !draft.lockedDate && !suggested && album ? (
              <ThemedText variant="subhead">This album has no day yet that can take a photo.</ThemedText>
            ) : null}
            <TextField
              value={photo.caption}
              onChangeText={(caption) => draft.updatePhoto(photo.localId, { caption })}
              placeholder="Caption"
              multiline
            />
          </View>
        );
      })}
      {save.error ? (
        <ThemedText selectable variant="subhead">
          {errorMessage(save.error)} The photos that didn’t save are still here.
        </ThemedText>
      ) : null}
      <Button
        title="Save memories"
        loading={save.isPending}
        disabled={missingDate || !album || album.status === 'finished'}
        onPress={() => save.mutate()}
      />
    </ScrollView>
  );
}

