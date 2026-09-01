-- Stripe subscription tracking on profiles, plus a separate table for
-- metering free-tier outfit-generation usage per calendar month.

alter table public.profiles
  add column stripe_customer_id text unique,
  add column subscription_status text not null default 'none',
  add column current_period_end timestamptz;

create table public.outfit_generation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  generations_count integer not null default 0,
  primary key (user_id, period_start)
);

alter table public.outfit_generation_usage enable row level security;

create policy "Users can view own outfit generation usage"
  on public.outfit_generation_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own outfit generation usage"
  on public.outfit_generation_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own outfit generation usage"
  on public.outfit_generation_usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own outfit generation usage"
  on public.outfit_generation_usage for delete
  using (auth.uid() = user_id);
