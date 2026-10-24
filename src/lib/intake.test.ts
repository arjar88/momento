import { buildDraftPhotos } from './intake';
import { addDays, todayKey } from '../utils/dates';

const today = todayKey();
const range = { lockedDate: null, albumStart: '2000-01-01', albumEnd: '2099-12-31' };
const tomorrow = addDays(today, 1).replaceAll('-', ':');

const future = buildDraftPhotos(
  [{ uri: 'future.jpg', exif: { DateTimeOriginal: `${tomorrow} 12:00:00` } }],
  range,
);
if (future.photos.length !== 0 || future.notice.future !== 1) {
  throw new Error('A future photo was kept');
}

const wrongDay = buildDraftPhotos([{ uri: 'camera.jpg', fromCamera: true }], {
  lockedDate: addDays(today, -1),
  albumStart: '2000-01-01',
  albumEnd: '2099-12-31',
});
if (wrongDay.photos.length !== 0 || wrongDay.notice.wrongDay !== 1) {
  throw new Error('A camera photo was kept on the wrong day');
}

const kept = buildDraftPhotos([{ uri: 'camera.jpg', fromCamera: true }], {
  lockedDate: today,
  albumStart: '2000-01-01',
  albumEnd: '2099-12-31',
});
if (kept.photos.length !== 1 || kept.photos[0]?.takenOn !== today) {
  throw new Error('A camera photo from today was dropped');
}

const outside = buildDraftPhotos(
  [{ uri: 'old.jpg', exif: { DateTimeOriginal: '2001:01:01 00:00:00' } }],
  { lockedDate: null, albumStart: addDays(today, -3), albumEnd: today },
);
if (outside.photos.length !== 0 || outside.notice.outsideAlbum !== 1) {
  throw new Error('A photo outside the album was kept');
}
