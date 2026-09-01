-- Initial schema for FitMatch: per-user profile and closet (garments).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  skin_undertone text,
  skin_depth text,
  hair_color text,
  eye_color text,
  body_shape text,
  height text,
  occasion text,
  weather text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  primary_color text,
  secondary_colors text[],
  category text,
  pattern text,
  fabric_weight text,
  formality text,
  created_at timestamptz not null default now()
);

create index idx_garments_user_id on public.garments (user_id);

create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.garments enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

create policy "Users can view own garments"
  on public.garments for select
  using (auth.uid() = user_id);

create policy "Users can insert own garments"
  on public.garments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own garments"
  on public.garments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own garments"
  on public.garments for delete
  using (auth.uid() = user_id);
