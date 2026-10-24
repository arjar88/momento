import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

export default function Index() {
  const { configured, session, profile, profileError } = useSession();
  if (!configured) return <Redirect href="/setup" />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile && profileError) return null;
  if (!profile?.onboarding_complete) return <Redirect href="/intro" />;
  return <Redirect href="/calendar" />;
}
