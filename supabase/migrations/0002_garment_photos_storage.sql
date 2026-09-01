-- Private storage bucket for garment photos.
-- Path convention: {user_id}/{garment_id}.webp

insert into storage.buckets (id, name, public)
values ('garment-photos', 'garment-photos', false)
on conflict (id) do nothing;

create policy "Users can view own garment photos"
  on storage.objects for select
  using (
    bucket_id = 'garment-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own garment photos"
  on storage.objects for insert
  with check (
    bucket_id = 'garment-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own garment photos"
  on storage.objects for update
  using (
    bucket_id = 'garment-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'garment-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own garment photos"
  on storage.objects for delete
  using (
    bucket_id = 'garment-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
