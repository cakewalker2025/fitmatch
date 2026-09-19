-- Saved (favorited) outfits: one row per outfit a user has chosen to keep,
-- enough to redisplay it later without re-running generation.

create table public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_ids uuid[] not null,
  color_roles jsonb not null,
  harmony_model text not null,
  confidence text not null,
  reasoning text not null,
  occasion text,
  weather text,
  created_at timestamptz not null default now()
);

create index idx_saved_outfits_user_id on public.saved_outfits (user_id);

alter table public.saved_outfits enable row level security;

create policy "Users can view own saved outfits"
  on public.saved_outfits for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved outfits"
  on public.saved_outfits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved outfits"
  on public.saved_outfits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own saved outfits"
  on public.saved_outfits for delete
  using (auth.uid() = user_id);
