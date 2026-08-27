-- Persist the selected primary logo for a saved BrandThat workspace.
-- Idempotent so it can be safely applied to production if the columns already exist.

alter table public.brand_workspaces
  add column if not exists logo_image_url text,
  add column if not exists primary_logo_asset_id uuid,
  add column if not exists primary_logo_updated_at timestamptz,
  add column if not exists logo_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'saved_generations'
  ) then
    begin
      alter table public.brand_workspaces
        add constraint brand_workspaces_primary_logo_asset_id_fkey
        foreign key (primary_logo_asset_id)
        references public.saved_generations(id)
        on delete set null;
    exception
      when duplicate_object then null;
      when invalid_foreign_key then null;
      when datatype_mismatch then null;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
