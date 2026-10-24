import { isDateKey } from './dates';

export function dateKeyFromExif(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null;
  const nested = exif['{Exif}'];
  const candidates = [
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>).DateTimeOriginal
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const match = candidate.match(/(\d{4})[:\-.](\d{2})[:\-.](\d{2})/);
    if (!match) continue;
    const key = `${match[1]}-${match[2]}-${match[3]}`;
    if (isDateKey(key)) return key;
  }

  return null;
}
