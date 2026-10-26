import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import type { Database } from './database';

const CHUNK = 1800;

const isWeb = process.env.EXPO_OS === 'web';

function webStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

async function forget(key: string) {
  try {
    if (isWeb) {
      webStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // A missing key is already gone.
  }
}

const secureStore = {
  async getItem(key: string) {
    if (isWeb) {
      return webStorage()?.getItem(key) ?? null;
    }
    const countRaw = await SecureStore.getItemAsync(`${key}.chunks`);
    if (!countRaw) return SecureStore.getItemAsync(key);
    const count = Number(countRaw);
    let value = '';
    for (let index = 0; index < count; index += 1) {
      value += (await SecureStore.getItemAsync(`${key}.${index}`)) ?? '';
    }
    return value;
  },
  async setItem(key: string, value: string) {
    if (isWeb) {
      webStorage()?.setItem(key, value);
      return;
    }
    await secureStore.removeItem(key);
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(`${key}.chunks`, String(count));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(`${key}.${index}`, value.slice(index * CHUNK, (index + 1) * CHUNK));
    }
  },
  async removeItem(key: string) {
    if (isWeb) {
      webStorage()?.removeItem(key);
      return;
    }
    const countRaw = await SecureStore.getItemAsync(`${key}.chunks`);
    if (countRaw) {
      const count = Number(countRaw);
      await forget(`${key}.chunks`);
      for (let index = 0; index < count; index += 1) {
        await forget(`${key}.${index}`);
      }
    }
    await forget(key);
  },
};

function jwtRole(key: string): string | null {
  const part = key.split('.')[1];
  if (!part || typeof globalThis.atob !== 'function') return null;
  try {
    const json = globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfigError = (() => {
  if (!url || !anonKey) {
    return 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.';
  }
  if (anonKey.startsWith('sb_secret_') || jwtRole(anonKey) === 'service_role') {
    return 'That key is a service-role secret. Use the anon key. The service-role key must never ship in the app.';
  }
  return null;
})();

export const isSupabaseConfigured = supabaseConfigError === null;

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        storage: secureStore,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
  return supabase;
}
