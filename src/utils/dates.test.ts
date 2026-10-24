import {
  addDays,
  clampDate,
  endOfWeek,
  formatMonthYear,
  inclusiveDays,
  monthGrid,
  pacePercent,
  startOfWeek,
  todayKey,
  toDateKey,
} from './dates';

const october = monthGrid(2026, 9).map((date) => (date ? String(date.getDate()) : '.'));
const expected = [
  '.', '.', '.', '.', '1', '2', '3',
  '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17',
  '18', '19', '20', '21', '22', '23', '24',
  '25', '26', '27', '28', '29', '30', '31',
];

if (october.join(',') !== expected.join(',')) {
  throw new Error(`October 2026 grid was ${october.join(',')}`);
}

if (formatMonthYear(2026, 9) !== 'October 2026') {
  throw new Error(`Month title was ${formatMonthYear(2026, 9)}`);
}

if (toDateKey(new Date(2026, 9, 23)) !== '2026-10-23') {
  throw new Error('October 23 key mismatch');
}

if (startOfWeek('2026-10-23') !== '2026-10-18' || endOfWeek('2026-10-23') !== '2026-10-24') {
  throw new Error('Week containing October 23 2026 should be Sunday 18 through Saturday 24');
}

if (inclusiveDays('2026-10-01', '2026-10-31') !== 31) {
  throw new Error('October has 31 days');
}

if (pacePercent(0, '2026-10-01', '2026-10-31', 3) !== 0) {
  throw new Error('Empty album pace should be 0');
}

if (pacePercent(4, '2026-10-01', '2026-10-31', null) !== null) {
  throw new Error('A self-paced album has no percent');
}

const today = todayKey();
if (clampDate(today, addDays(today, 20), addDays(today, 40)) !== null) {
  throw new Error('An album that has not started must not offer today');
}
if (clampDate(today, addDays(today, -20), addDays(today, -5)) !== addDays(today, -5)) {
  throw new Error('An album that already ended should offer its last day');
}
if (clampDate(today, addDays(today, -2), addDays(today, 2)) !== today) {
  throw new Error('Today inside the album should stay');
}
