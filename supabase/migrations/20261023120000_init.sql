-- Keepsakes schema, triggers, row-level security, and private storage.
-- Apply in the Supabase SQL editor or via the CLI. The app uses the anon key only.
-- Do not put the service-role key in the Expo app.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  weekly_goal smallint,
  reminder_enabled boolean not null default false,
  reminder_weekdays smallint[] not null default '{}',
  reminder_time time not null default '09:00',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_weekly_goal_choices check (weekly_goal is null or weekly_goal in (1, 2, 3)),
  constraint profiles_weekdays_valid check (reminder_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint albums_status_values check (status in ('open', 'finished')),
  constraint albums_date_order check (end_date >= start_date),
  constraint albums_name_present check (char_length(btrim(name)) > 0)
);

create table public.album_members (
  album_id uuid not null references public.albums (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (album_id, user_id),
  constraint album_members_role_values check (role in ('owner', 'member'))
);

create table public.album_invites (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint album_invites_email_present check (char_length(email) > 3),
  constraint album_invites_unique_email unique (album_id, email)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  taken_on date not null,
  caption text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint memories_path_present check (char_length(storage_path) > 0)
);

create index album_members_user_idx on public.album_members (user_id);
create index memories_album_taken_idx on public.memories (album_id, taken_on);
create index album_invites_email_idx on public.album_invites (email);
create index albums_updated_idx on public.albums (updated_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_album_member(album uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.album_members
    where album_id = album
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_album_owner(album uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.album_members
    where album_id = album
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- A photo cannot be dated in the future, must sit inside the album, and
-- cannot be added once the album is finished. Members only write as themselves.
create or replace function public.enforce_memory_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  album public.albums%rowtype;
begin
  if new.author_id is distinct from auth.uid() then
    raise exception 'You can only add your own memories';
  end if;

  if not exists (
    select 1
    from public.album_members
    where album_id = new.album_id
      and user_id = new.author_id
  ) then
    raise exception 'Only album members can add memories';
  end if;

  select * into album from public.albums where id = new.album_id;
  if album.id is null then
    raise exception 'Album not found';
  end if;

  -- Allow one day past the database date so a local "today" ahead of UTC
  -- still saves. The app refuses any date after the device's today.
  if new.taken_on > (current_date + 1) then
    raise exception 'A memory cannot be dated in the future';
  end if;

  if new.taken_on < album.start_date or new.taken_on > album.end_date then
    raise exception 'This date is outside the album';
  end if;

  if tg_op = 'INSERT' and album.status = 'finished' then
    raise exception 'This album is finished';
  end if;

  if tg_op = 'UPDATE' then
    if new.album_id is distinct from old.album_id
       or new.author_id is distinct from old.author_id
       or new.storage_path is distinct from old.storage_path
       or new.id is distinct from old.id
    then
      raise exception 'Only the caption and date of a memory can change';
    end if;
  end if;

  return new;
end;
$$;

-- Changing album dates is rejected when a saved memory would fall outside.
create or replace function public.enforce_album_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.end_date < new.start_date then
    raise exception 'The album end date is before the start date';
  end if;

  if new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date then
    if exists (
      select 1
      from public.memories
      where album_id = new.id
        and (taken_on < new.start_date or taken_on > new.end_date)
    ) then
      raise exception 'Saved memories would fall outside the new dates';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.album_members (album_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (album_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function public.touch_album_from_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.albums
  set updated_at = now()
  where id = new.album_id;
  return new;
end;
$$;

-- Existing accounts become members immediately. Everyone else keeps a pending
-- invite that attaches when they sign up with that email. v1 does not send mail.
create or replace function public.attach_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  caller_email text;
begin
  new.email := lower(btrim(new.email));

  if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  select lower(email) into caller_email from auth.users where id = auth.uid();
  if caller_email is not null and caller_email = new.email then
    raise exception 'You are already in this album';
  end if;

  select id into existing
  from auth.users
  where lower(email) = new.email
  limit 1;

  if existing is not null then
    if exists (
      select 1 from public.album_members
      where album_id = new.album_id and user_id = existing
    ) then
      raise exception 'That person is already in this album';
    end if;

    insert into public.album_members (album_id, user_id, role)
    values (new.album_id, existing, 'member');
    return null;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.album_members (album_id, user_id, role)
  select i.album_id, new.id, 'member'
  from public.album_invites i
  where i.email = lower(new.email)
  on conflict (album_id, user_id) do nothing;

  delete from public.album_invites
  where email = lower(new.email);

  return new;
end;
$$;

-- Removes the signed-in person's profile (and cascaded rows) plus the JPEGs
-- they uploaded and the JPEGs in albums they own.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from storage.objects
  where bucket_id = 'memories'
    and (
      name in (select storage_path from public.memories where author_id = uid)
      or split_part(name, '/', 1) in (select id::text from public.albums where owner_id = uid)
    );

  delete from auth.users where id = uid;
end;
$$;

-- Removes the JPEG and the memory row in one transaction. If either delete
-- fails, both roll back, so a photo is never left without its row or the reverse.
create or replace function public.delete_memory(memory_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  row public.memories%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into row from public.memories where id = memory_id;
  if row.id is null then
    raise exception 'Memory not found';
  end if;

  if row.author_id is distinct from auth.uid() and not public.is_album_owner(row.album_id) then
    raise exception 'You cannot remove this memory';
  end if;

  delete from storage.objects
  where bucket_id = 'memories'
    and name = row.storage_path;

  delete from public.memories where id = row.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger albums_touch_updated_at
before update on public.albums
for each row execute function public.touch_updated_at();

create trigger albums_enforce_dates
before update on public.albums
for each row execute function public.enforce_album_dates();

create trigger albums_add_owner
after insert on public.albums
for each row execute function public.add_owner_membership();

create trigger memories_enforce_rules
before insert or update on public.memories
for each row execute function public.enforce_memory_rules();

create trigger memories_touch_album
after insert on public.memories
for each row execute function public.touch_album_from_memory();

create trigger album_invites_attach
before insert on public.album_invites
for each row execute function public.attach_invite();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.album_members enable row level security;
alter table public.album_invites enable row level security;
alter table public.memories enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy albums_select on public.albums
for select to authenticated
using (public.is_album_member(id));

create policy albums_insert on public.albums
for insert to authenticated
with check (owner_id = auth.uid());

create policy albums_update on public.albums
for update to authenticated
using (public.is_album_owner(id))
with check (owner_id = auth.uid() and public.is_album_owner(id));

create policy albums_delete on public.albums
for delete to authenticated
using (public.is_album_owner(id));

create policy album_members_select on public.album_members
for select to authenticated
using (public.is_album_member(album_id));

create policy album_members_delete on public.album_members
for delete to authenticated
using (public.is_album_owner(album_id) and role <> 'owner');

create policy album_invites_select on public.album_invites
for select to authenticated
using (public.is_album_owner(album_id));

create policy album_invites_insert on public.album_invites
for insert to authenticated
with check (public.is_album_owner(album_id) and invited_by = auth.uid());

create policy album_invites_delete on public.album_invites
for delete to authenticated
using (public.is_album_owner(album_id));

create policy memories_select on public.memories
for select to authenticated
using (public.is_album_member(album_id));

create policy memories_insert on public.memories
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.is_album_member(album_id)
);

create policy memories_update on public.memories
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy memories_delete on public.memories
for delete to authenticated
using (author_id = auth.uid() or public.is_album_owner(album_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke all on function public.delete_memory(uuid) from public, anon;
grant execute on function public.delete_memory(uuid) to authenticated;

-- Names for people who share an album. Full profiles stay visible only to their owner.
create view public.profile_names
with (security_barrier = true, security_invoker = false) as
select p.id, p.display_name
from public.profiles p
where p.id = auth.uid()
   or exists (
     select 1
     from public.album_members mine
     join public.album_members theirs on theirs.album_id = mine.album_id
     where mine.user_id = auth.uid()
       and theirs.user_id = p.id
   );

revoke all on public.profile_names from public, anon;
grant select on public.profile_names to authenticated;
grant execute on function public.is_album_member(uuid) to authenticated;
grant execute on function public.is_album_owner(uuid) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.attach_invite() from public, anon, authenticated;
revoke all on function public.enforce_memory_rules() from public, anon, authenticated;
revoke all on function public.enforce_album_dates() from public, anon, authenticated;
revoke all on function public.add_owner_membership() from public, anon, authenticated;
revoke all on function public.touch_album_from_memory() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private bucket. Objects live at {album_id}/{memory_id}.jpg.
-- The app reads them with short-lived signed URLs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 10485760, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy memories_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_album_member(((storage.foldername(name))[1])::uuid)
);

create policy memories_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_album_member(((storage.foldername(name))[1])::uuid)
  and exists (
    select 1
    from public.albums
    where id = ((storage.foldername(name))[1])::uuid
      and status = 'open'
  )
  and exists (
    select 1
    from public.memories
    where storage_path = name
      and author_id = auth.uid()
      and album_id = ((storage.foldername(name))[1])::uuid
  )
);

create policy memories_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    public.is_album_owner(((storage.foldername(name))[1])::uuid)
    or exists (
      select 1
      from public.memories
      where storage_path = name
        and author_id = auth.uid()
    )
  )
);
