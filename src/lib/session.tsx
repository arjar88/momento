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
  refreshProfile: (userId?: string) => Promise<Profile | null>;
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

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      console.log('[auth] initial getSession:', {
        hasSession: !!data.session,
        userId: data.session?.user.id ?? null,
        email: data.session?.user.email ?? null,
        error: error?.message ?? null,
      });
      if (data.session) {
        setProfileReady(false);
      }
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: subscription } = client.auth.onAuthStateChange((event, next) => {
      console.log('[auth] onAuthStateChange:', {
        event,
        hasSession: !!next,
        userId: next?.user.id ?? null,
        email: next?.user.email ?? null,
      });
      setSession((prev) => {
        if (next && next.user.id !== prev?.user.id) {
          setProfileReady(false);
        }
        return next;
      });
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

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!authReady) return;
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      setProfileReady(true);
      return;
    }

    let active = true;
    setProfile(null);
    setProfileError(null);
    setProfileReady(false);
    console.log('[auth] fetching profile for userId:', userId);
    fetchProfile(userId)
      .then((next) => {
        if (!active) return;
        console.log('[auth] fetchProfile result:', next);
        setProfile(next);
        setProfileError(null);
      })
      .catch((caught) => {
        if (!active) return;
        const msg = errorMessage(caught, 'Could not load your profile.');
        console.error('[auth] fetchProfile error:', msg);
        setProfileError(msg);
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });

    return () => {
      active = false;
    };
  }, [authReady, userId]);

  const refreshProfile = useCallback(async (explicitUserId?: string) => {
    let targetUserId = explicitUserId ?? session?.user.id;
    if (!targetUserId && isSupabaseConfigured) {
      const { data } = await requireSupabase().auth.getSession();
      if (data.session) {
        setSession(data.session);
        targetUserId = data.session.user.id;
      }
    }
    if (!targetUserId) {
      setProfile(null);
      setProfileError(null);
      return null;
    }
    try {
      const next = await fetchProfile(targetUserId);
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
