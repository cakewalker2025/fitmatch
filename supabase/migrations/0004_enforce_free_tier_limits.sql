-- Enforce free-tier limits at the database layer so they can't be bypassed
-- by calling Supabase directly instead of going through the app's API routes.

-- Garments: free users (subscription_status <> 'active') capped at 10 rows.
create or replace function public.enforce_garment_limit()
returns trigger as $$
declare
  is_paid boolean;
  current_count integer;
begin
  select subscription_status = 'active' into is_paid
  from public.profiles
  where id = new.user_id;

  if is_paid then
    return new;
  end if;

  select count(*) into current_count
  from public.garments
  where user_id = new.user_id;

  if current_count >= 10 then
    raise exception 'Free plan limit reached (10/10 garments). Upgrade to add more.';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger garments_enforce_limit
  before insert on public.garments
  for each row
  execute function public.enforce_garment_limit();

-- Outfit generation usage: only the service role may write. Users may still
-- read their own usage (e.g. to show "2/3 used this month" in the UI), but
-- may not insert/update/delete it themselves — that would let a free user
-- reset their own count from the browser.
drop policy if exists "Users can insert own outfit generation usage" on public.outfit_generation_usage;
drop policy if exists "Users can update own outfit generation usage" on public.outfit_generation_usage;
drop policy if exists "Users can delete own outfit generation usage" on public.outfit_generation_usage;

create or replace function public.increment_outfit_generation_usage(
  p_user_id uuid,
  p_period_start date
)
returns integer as $$
  insert into public.outfit_generation_usage (user_id, period_start, generations_count)
  values (p_user_id, p_period_start, 1)
  on conflict (user_id, period_start)
  do update set generations_count = outfit_generation_usage.generations_count + 1
  returning generations_count;
$$ language sql;
