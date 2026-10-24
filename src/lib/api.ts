import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Album, AlbumInvite, Memory, Profile, WeeklyGoal } from './database';
import { requireSupabase } from './supabase';
import { asGoal } from '@/utils/dates';
import { errorMessage } from '@/utils/errors';

const BUCKET = 'memories';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, weekly_goal: asGoal(data.weekly_goal) };
}

export async function updateProfile(userId: string, patch: {
  display_name?: string;
  weekly_goal?: WeeklyGoal;
  reminder_enabled?: boolean;
  reminder_weekdays?: number[];
  reminder_time?: string;
  onboarding_complete?: boolean;
}): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .upsert({ id: userId, ...patch })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { ...data, weekly_goal: asGoal(data.weekly_goal) };
}

export async function fetchAlbums(): Promise<Album[]> {
  const { data, error } = await requireSupabase()
    .from('albums')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAlbum(albumId: string): Promise<Album | null> {
  const { data, error } = await requireSupabase().from('albums').select('*').eq('id', albumId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createAlbum(input: {
  ownerId: string;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<Album> {
  const { data, error } = await requireSupabase()
    .from('albums')
    .insert({
      owner_id: input.ownerId,
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAlbum(
  albumId: string,
  patch: { name?: string; start_date?: string; end_date?: string; status?: Album['status'] },
): Promise<Album> {
  const { data, error } = await requireSupabase()
    .from('albums')
    .update(patch)
    .eq('id', albumId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMemoryDates(albumId: string): Promise<Pick<Memory, 'id' | 'taken_on'>[]> {
  const { data, error } = await requireSupabase()
    .from('memories')
    .select('id, taken_on')
    .eq('album_id', albumId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDayMemories(albumId: string, takenOn: string): Promise<Memory[]> {
  const { data, error } = await requireSupabase()
    .from('memories')
    .select('*')
    .eq('album_id', albumId)
    .eq('taken_on', takenOn)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAlbumMemoryStats(
  albumIds: string[],
): Promise<Pick<Memory, 'album_id' | 'storage_path' | 'created_at'>[]> {
  if (albumIds.length === 0) return [];
  const { data, error } = await requireSupabase()
    .from('memories')
    .select('album_id, storage_path, created_at')
    .in('album_id', albumIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) throw new Error(error.message);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

export async function jpegUri(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

export async function saveMemory(input: {
  albumId: string;
  authorId: string;
  uri: string;
  takenOn: string;
  caption: string;
}): Promise<void> {
  const client = requireSupabase();
  const id = Crypto.randomUUID();
  const path = `${input.albumId}/${id}.jpg`;
  const prepared = await jpegUri(input.uri);
  const { error: insertError } = await client.from('memories').insert({
    id,
    album_id: input.albumId,
    author_id: input.authorId,
    taken_on: input.takenOn,
    caption: input.caption.trim(),
    storage_path: path,
  });
  if (insertError) throw new Error(insertError.message);

  try {
    const response = await fetch(prepared);
    if (!response.ok) throw new Error('Could not read the photo.');
    const bytes = await response.arrayBuffer();
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
  } catch (caught) {
    const { error: cleanupError } = await client.from('memories').delete().eq('id', id);
    const message = errorMessage(caught, 'Could not save the photo.');
    if (cleanupError) throw new Error(`${message} The unfinished memory could not be removed.`);
    throw new Error(message);
  }
}

export async function deleteMemory(memory: Memory): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_memory', { memory_id: memory.id });
  if (error) throw new Error(error.message);
}

export async function fetchMembers(albumId: string) {
  const { data, error } = await requireSupabase()
    .from('album_members')
    .select('album_id, user_id, role, created_at')
    .eq('album_id', albumId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchInvites(albumId: string): Promise<AlbumInvite[]> {
  const { data, error } = await requireSupabase().from('album_invites').select('*').eq('album_id', albumId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function inviteByEmail(albumId: string, invitedBy: string, email: string): Promise<void> {
  const { error } = await requireSupabase().from('album_invites').insert({
    album_id: albumId,
    invited_by: invitedBy,
    email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await requireSupabase().from('profile_names').select('id, display_name').in('id', userIds);
  if (error) throw new Error(error.message);
  const names: Record<string, string> = {};
  for (const profile of data ?? []) names[profile.id] = profile.display_name;
  return names;
}

export type PeopleAlbum = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  people: { id: string; name: string; role: 'owner' | 'member' }[];
  pendingEmails: string[];
};

export async function fetchPeople(userId: string): Promise<PeopleAlbum[]> {
  const memberships = await requireSupabase()
    .from('album_members')
    .select('album_id, role')
    .eq('user_id', userId);
  if (memberships.error) throw new Error(memberships.error.message);
  const mine = memberships.data ?? [];
  if (mine.length === 0) return [];

  const albumIds = mine.map((row) => row.album_id);
  const albums = await requireSupabase().from('albums').select('id, name').in('id', albumIds);
  if (albums.error) throw new Error(albums.error.message);
  const members = await requireSupabase()
    .from('album_members')
    .select('album_id, user_id, role')
    .in('album_id', albumIds);
  if (members.error) throw new Error(members.error.message);

  const names = await fetchNames([...(members.data ?? []).map((row) => row.user_id)]);
  const ownedIds = mine.filter((row) => row.role === 'owner').map((row) => row.album_id);
  const invites = ownedIds.length
    ? await requireSupabase().from('album_invites').select('album_id, email').in('album_id', ownedIds)
    : { data: [], error: null };
  if (invites.error) throw new Error(invites.error.message);

  return (albums.data ?? []).map((album) => {
    const role = mine.find((row) => row.album_id === album.id)?.role ?? 'member';
    return {
      id: album.id,
      name: album.name,
      role,
      people: (members.data ?? [])
        .filter((row) => row.album_id === album.id)
        .map((row) => ({
          id: row.user_id,
          name: row.user_id === userId ? 'You' : names[row.user_id] || 'Someone',
          role: row.role,
        })),
      pendingEmails: (invites.data ?? []).filter((row) => row.album_id === album.id).map((row) => row.email),
    };
  });
}

export async function deleteAccount(): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_account');
  if (error) throw new Error(error.message);
}
