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
