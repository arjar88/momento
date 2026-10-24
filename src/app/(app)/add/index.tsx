import { useLocalSearchParams } from 'expo-router';

import { AddScreen } from '@/screens/add';

export default function AddRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <AddScreen date={typeof date === 'string' ? date : undefined} />;
}
