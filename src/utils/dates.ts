export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(parseDateKey(value)) === value;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addYears(key: string, years: number): string {
  const date = parseDateKey(key);
  date.setFullYear(date.getFullYear() + years);
  return toDateKey(date);
}

export function startOfWeek(key: string): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

export function endOfWeek(key: string): string {
  return addDays(startOfWeek(key), 6);
}

/** Sunday-first month grid. October 2026 starts on Thursday, so the first row is blank, blank, blank, blank, 1, 2, 3. */
export function monthGrid(year: number, monthIndex: number): (Date | null)[] {
  const lead = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let index = 0; index < lead; index += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(new Date(year, monthIndex, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthIntersectsAlbum(
  year: number,
  monthIndex: number,
  start: string,
  end: string,
): boolean {
  const first = toDateKey(new Date(year, monthIndex, 1));
  const last = toDateKey(new Date(year, monthIndex + 1, 0));
  return first <= end && last >= start;
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function initialMonth(
  start: string,
  end: string,
  today = todayKey(),
): { year: number; monthIndex: number } {
  const key = today < start ? start : today > end ? end : today;
  const date = parseDateKey(key);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function inclusiveDays(start: string, end: string): number {
  const first = parseDateKey(start).getTime();
  const last = parseDateKey(end).getTime();
  return Math.round((last - first) / 86_400_000) + 1;
}

export function pacePercent(
  memoryCount: number,
  start: string,
  end: string,
  goal: number | null,
): number | null {
  if (!goal) return null;
  const expected = (inclusiveDays(start, end) / 7) * goal;
  if (expected <= 0) return 0;
  return Math.round((memoryCount / expected) * 100);
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatLongDate(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthDay(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function formatRange(start: string, end: string): string {
  const first = parseDateKey(start);
  const last = parseDateKey(end);
  const sameYear = first.getFullYear() === last.getFullYear();
  const left = first.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const right = last.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${left} – ${right}`;
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_LETTERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export function parseTime(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(':').map(Number);
  return { hour: Number.isFinite(hour) ? hour! : 9, minute: Number.isFinite(minute) ? minute! : 0 };
}

export function formatTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function timeKey(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function isAtOrAfterTime(hour: number, minute: number, now = new Date()): boolean {
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

/** A day the album can accept. Null when today falls outside the range, including an album that has not started. */
export function clampDate(key: string, start?: string, end?: string): string | null {
  const today = todayKey();
  let next = key > today ? today : key;
  if (start && next < start) next = start;
  if (end && next > end) next = end;
  if (next > today) return null;
  if (start && next < start) return null;
  if (end && next > end) return null;
  return next;
}

export function asGoal(value: number | null | undefined): 1 | 2 | 3 | null {
  if (value === 1 || value === 2 || value === 3) return value;
  return null;
}
