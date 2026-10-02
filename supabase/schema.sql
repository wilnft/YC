-- ALIANÇA JOVEM — banco + armazenamento Supabase
-- 1) Execute este arquivo inteiro no SQL Editor do Supabase.
-- 2) Depois crie o primeiro usuário em Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  location text,
  price text,
  type text,
  cover_image text,
  registration_enabled boolean not null default false,
  whatsapp_number text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text,
  category text,
  image text,
  excerpt text,
  link text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  title text,
  url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists cover_image text;
alter table public.events add column if not exists registration_enabled boolean not null default false;
alter table public.events add column if not exists whatsapp_number text;

-- Perfil automático para novos usuários.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'editor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.posts enable row level security;
alter table public.instagram_posts enable row level security;

drop policy if exists "public read published events" on public.events;
create policy "public read published events" on public.events for select using (published = true or auth.uid() is not null);
drop policy if exists "public read published posts" on public.posts;
create policy "public read published posts" on public.posts for select using (published = true or auth.uid() is not null);
drop policy if exists "public read published instagram" on public.instagram_posts;
create policy "public read published instagram" on public.instagram_posts for select using (published = true or auth.uid() is not null);

drop policy if exists "authenticated insert events" on public.events;
create policy "authenticated insert events" on public.events for insert to authenticated with check (true);
drop policy if exists "authenticated update events" on public.events;
create policy "authenticated update events" on public.events for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete events" on public.events;
create policy "authenticated delete events" on public.events for delete to authenticated using (true);

drop policy if exists "authenticated insert posts" on public.posts;
create policy "authenticated insert posts" on public.posts for insert to authenticated with check (true);
drop policy if exists "authenticated update posts" on public.posts;
create policy "authenticated update posts" on public.posts for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete posts" on public.posts;
create policy "authenticated delete posts" on public.posts for delete to authenticated using (true);

drop policy if exists "authenticated insert instagram" on public.instagram_posts;
create policy "authenticated insert instagram" on public.instagram_posts for insert to authenticated with check (true);
drop policy if exists "authenticated update instagram" on public.instagram_posts;
create policy "authenticated update instagram" on public.instagram_posts for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete instagram" on public.instagram_posts;
create policy "authenticated delete instagram" on public.instagram_posts for delete to authenticated using (true);

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());


create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  hero_image text,
  posts_bg text,
  about_bg text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select using (true);
drop policy if exists "authenticated insert site settings" on public.site_settings;
create policy "authenticated insert site settings" on public.site_settings for insert to authenticated with check (true);
drop policy if exists "authenticated update site settings" on public.site_settings;
create policy "authenticated update site settings" on public.site_settings for update to authenticated using (true) with check (true);

-- ============================================================
-- ARMAZENAMENTO DE IMAGENS
-- Bucket público: site-media
-- O usuário autenticado pode enviar/excluir imagens; visitantes só podem ler.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read site media" on storage.objects;
create policy "public read site media"
on storage.objects for select
to public
using (bucket_id = 'site-media');

drop policy if exists "authenticated upload site media" on storage.objects;
create policy "authenticated upload site media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media');

drop policy if exists "authenticated update site media" on storage.objects;
create policy "authenticated update site media"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

drop policy if exists "authenticated delete site media" on storage.objects;
create policy "authenticated delete site media"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media');

-- NOTA: a chave service_role NUNCA deve ser colocada no site.
-- ÁLBUM DE EVENTOS — execute no SQL Editor do Supabase (uma vez).
create table if not exists public.event_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  category text,
  caption text,
  photos jsonb not null default '[]'::jsonb,   -- lista de URLs de fotos
  videos jsonb not null default '[]'::jsonb,   -- lista de URLs de vídeos
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.event_albums enable row level security;
drop policy if exists "public read albums" on public.event_albums;
create policy "public read albums" on public.event_albums for select using (published = true or auth.uid() is not null);
drop policy if exists "auth insert albums" on public.event_albums;
create policy "auth insert albums" on public.event_albums for insert to authenticated with check (true);
drop policy if exists "auth update albums" on public.event_albums;
create policy "auth update albums" on public.event_albums for update to authenticated using (true) with check (true);
drop policy if exists "auth delete albums" on public.event_albums;
create policy "auth delete albums" on public.event_albums for delete to authenticated using (true);
