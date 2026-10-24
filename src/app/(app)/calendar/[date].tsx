import { Stack, useLocalSearchParams } from 'expo-router';

import { DayScreen } from '@/screens/day';
import { fonts, useBrandColors } from '@/theme';
import { formatMonthDay, isDateKey } from '@/utils/dates';

export default function DayRoute() {
  const brand = useBrandColors();
  const { date } = useLocalSearchParams<{ date: string }>();
  const value = typeof date === 'string' ? date : '';
  const title = isDateKey(value) ? formatMonthDay(value) : 'Day';

  return (
    <>
      <Stack.Screen options={{ title, headerTitleStyle: { fontFamily: fonts.serif, color: brand.ink } }} />
      <DayScreen date={value} />
    </>
  );
}
