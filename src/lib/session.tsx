import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchProfile } from './api';
import type { Profile } from './database';
import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from './supabase';
import { errorMessage } from '@/utils/errors';

type SessionValue = {
  ready: boolean;
  configured: boolean;
  configError: string | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [profileReady, setProfileReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const client = requireSupabase();

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
      if (!next) {
        setProfile(null);
        setProfileReady(true);
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!authReady) return;
    if (!session) {
      setProfile(null);
      setProfileError(null);
      setProfileReady(true);
      return;
    }

    let active = true;
    setProfile(null);
    setProfileError(null);
    setProfileReady(false);
    fetchProfile(session.user.id)
      .then((next) => {
        if (!active) return;
        setProfile(next);
        setProfileError(null);
      })
      .catch((caught) => {
        if (!active) return;
        setProfileError(errorMessage(caught, 'Could not load your profile.'));
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });

    return () => {
      active = false;
    };
  }, [authReady, session]);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setProfileError(null);
      return null;
    }
    try {
      const next = await fetchProfile(session.user.id);
      setProfile(next);
      setProfileError(null);
      setProfileReady(true);
      return next;
    } catch (caught) {
      const message = errorMessage(caught, 'Could not load your profile.');
      if (!profile) setProfileError(message);
      setProfileReady(true);
      throw new Error(message);
    }
  }, [profile, session]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await requireSupabase().auth.signOut();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ready: !isSupabaseConfigured || (authReady && (!session || profileReady)),
      configured: isSupabaseConfigured,
      configError: supabaseConfigError,
      session,
      profile,
      profileError,
      refreshProfile,
      signOut,
    }),
    [authReady, profile, profileError, profileReady, refreshProfile, session, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
