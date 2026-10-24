import * as Crypto from 'expo-crypto';

import type { DraftNotice, DraftPhoto } from './memory-draft';
import { dateKeyFromExif } from '@/utils/exif';
import { todayKey } from '@/utils/dates';

export type IncomingPhoto = {
  uri: string;
  exif?: Record<string, unknown> | null;
  fromCamera?: boolean;
};

export function buildDraftPhotos(
  incoming: IncomingPhoto[],
  options: { lockedDate: string | null; albumStart: string; albumEnd: string },
): { photos: DraftPhoto[]; notice: DraftNotice } {
  const today = todayKey();
  const notice: DraftNotice = { future: 0, wrongDay: 0, outsideAlbum: 0, undated: 0 };
  const photos: DraftPhoto[] = [];

  for (const item of incoming) {
    const takenOn = item.fromCamera ? today : dateKeyFromExif(item.exif);
    if (item.fromCamera && options.lockedDate && options.lockedDate !== today) {
      notice.wrongDay += 1;
      continue;
    }
    if (takenOn && takenOn > today) {
      notice.future += 1;
      continue;
    }
    if (options.lockedDate && takenOn && takenOn !== options.lockedDate) {
      notice.wrongDay += 1;
      continue;
    }
    if (takenOn && (takenOn < options.albumStart || takenOn > options.albumEnd)) {
      notice.outsideAlbum += 1;
      continue;
    }
    if (!takenOn) notice.undated += 1;
    photos.push({
      localId: Crypto.randomUUID(),
      uri: item.uri,
      takenOn: takenOn ?? (options.lockedDate && options.lockedDate <= today ? options.lockedDate : null),
      caption: '',
    });
  }

  return { photos, notice };
}

export function noticeCopy(notice: DraftNotice, lockedDateLabel: string | null): string | null {
  const parts: string[] = [];
  if (notice.future) {
    parts.push(
      notice.future === 1
        ? '1 photo was left out because it is dated in the future.'
        : `${notice.future} photos were left out because they are dated in the future.`,
    );
  }
  if (notice.wrongDay) {
    parts.push(
      notice.wrongDay === 1
        ? `1 photo was left out because it was not taken on ${lockedDateLabel ?? 'that day'}.`
        : `${notice.wrongDay} photos were left out because they were not taken on ${lockedDateLabel ?? 'that day'}.`,
    );
  }
  if (notice.outsideAlbum) {
    parts.push(
      notice.outsideAlbum === 1
        ? '1 photo was left out because it falls outside this album.'
        : `${notice.outsideAlbum} photos were left out because they fall outside this album.`,
    );
  }
  return parts.length ? parts.join(' ') : null;
}
