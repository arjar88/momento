import { useLocalSearchParams } from 'expo-router';

import { CameraScreen } from '@/screens/add/camera';

export default function CameraRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <CameraScreen date={typeof date === 'string' ? date : undefined} />;
}
