-- MAPA DE CÉLULAS + CARROSSEL DE EVENTOS — execute no SQL Editor do Supabase (uma vez).

-- 1) Locais das células -------------------------------------------------------
create table if not exists public.cell_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  schedule text,                -- ex.: "Quintas, 20h"
  address text,
  lat double precision not null,
  lng double precision not null,
  photo text,                   -- foto exibida no pin e nos detalhes
  whatsapp_number text,         -- somente dígitos, com DDI+DDD (5511999999999)
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.cell_locations enable row level security;
drop policy if exists "public read cells" on public.cell_locations;
create policy "public read cells" on public.cell_locations for select using (published = true or auth.uid() is not null);
drop policy if exists "auth insert cells" on public.cell_locations;
create policy "auth insert cells" on public.cell_locations for insert to authenticated with check (true);
drop policy if exists "auth update cells" on public.cell_locations;
create policy "auth update cells" on public.cell_locations for update to authenticated using (true) with check (true);
drop policy if exists "auth delete cells" on public.cell_locations;
create policy "auth delete cells" on public.cell_locations for delete to authenticated using (true);

-- 2) Carrossel do topo da página Eventos ---------------------------------------
-- Lista de URLs de fotos guardada na tabela de configurações do site.
alter table public.site_settings add column if not exists events_carousel jsonb not null default '[]'::jsonb;
