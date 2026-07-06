-- Tabla de categorías/álbumes
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

-- Tabla de fotos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cloudinary_url text not null,
  cloudinary_public_id text not null,
  category_id uuid references public.categories(id) on delete set null,
  taken_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_photos_category_id on public.photos (category_id);

-- Trigger para actualizar updated_at automáticamente
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger photos_updated_at
  before update on public.photos
  for each row execute function public.update_updated_at();

-- Helper de autorización: true solo para el email del admin del portfolio,
-- tomado del claim de email del JWT del caller. Actualizar el literal si
-- cambia la cuenta admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'martinrinaudo03@gmail.com';
$$;

comment on function public.is_admin() is
  'True only for the single portfolio admin, identified by the email claim in the caller''s JWT. Update the email literal here if the admin account ever changes.';

-- Habilitar RLS en ambas tablas
alter table public.categories enable row level security;
alter table public.photos enable row level security;

-- Policies de lectura pública
create policy "categories_select_public" on public.categories
  for select using (true);

create policy "photos_select_public" on public.photos
  for select using (true);

-- Policies de escritura restringidas al admin (insert/update/delete
-- explícitos en vez de FOR ALL, para no solapar con la policy de SELECT
-- público)
create policy "categories_insert_admin" on public.categories
  for insert with check (public.is_admin());
create policy "categories_update_admin" on public.categories
  for update using (public.is_admin()) with check (public.is_admin());
create policy "categories_delete_admin" on public.categories
  for delete using (public.is_admin());

create policy "photos_insert_admin" on public.photos
  for insert with check (public.is_admin());
create policy "photos_update_admin" on public.photos
  for update using (public.is_admin()) with check (public.is_admin());
create policy "photos_delete_admin" on public.photos
  for delete using (public.is_admin());
