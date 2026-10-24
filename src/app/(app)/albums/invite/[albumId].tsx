import { useLocalSearchParams } from 'expo-router';

import { InviteScreen } from '@/screens/albums/invite';

export default function InviteRoute() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  return <InviteScreen albumId={typeof albumId === 'string' ? albumId : ''} />;
}
