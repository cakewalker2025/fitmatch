-- Short, specific item-type description per garment (e.g. "silver chain
-- bracelet"), alongside the existing broad `category` field. Nullable so
-- existing garments analyzed before this change are unaffected.
alter table public.garments
  add column item_type text;
