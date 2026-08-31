-- BrandThat semantic brand memory provenance and workspace controls.
-- Additive only: no customer workspace or saved asset data is deleted or rewritten.

alter table public.brand_memories
  add column if not exists source_asset_id uuid,
  add column if not exists source_generator text,
  add column if not exists original_created_at timestamptz,
  add column if not exists last_confirmed_at timestamptz,
  add column if not exists content_version integer not null default 1,
  add column if not exists confidence numeric(4,3) not null default 0.750,
  add column if not exists supersedes_memory_id uuid,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brand_memories_content_version_check'
      and conrelid = 'public.brand_memories'::regclass
  ) then
    alter table public.brand_memories
      add constraint brand_memories_content_version_check
      check (content_version >= 1) not valid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'saved_generations'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'brand_memories_source_asset_id_fkey'
      and conrelid = 'public.brand_memories'::regclass
  ) then
    begin
      alter table public.brand_memories
        add constraint brand_memories_source_asset_id_fkey
        foreign key (source_asset_id)
        references public.saved_generations(id)
        on delete set null;
    exception
      when invalid_foreign_key then null;
      when datatype_mismatch then null;
    end;
  end if;
end $$;

alter table public.brand_memories
  validate constraint brand_memories_content_version_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brand_memories_confidence_check'
      and conrelid = 'public.brand_memories'::regclass
  ) then
    alter table public.brand_memories
      add constraint brand_memories_confidence_check
      check (confidence >= 0 and confidence <= 1) not valid;
  end if;
end $$;

alter table public.brand_memories
  validate constraint brand_memories_confidence_check;

do $$
begin
  alter table public.brand_memories
    drop constraint if exists brand_memories_status_check;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'brand_memories_supersedes_memory_id_fkey'
      and conrelid = 'public.brand_memories'::regclass
  ) then
    alter table public.brand_memories
      add constraint brand_memories_supersedes_memory_id_fkey
      foreign key (supersedes_memory_id)
      references public.brand_memories(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'brand_memories_status_check_v2'
      and conrelid = 'public.brand_memories'::regclass
  ) then
    alter table public.brand_memories
      add constraint brand_memories_status_check_v2
      check (status in ('active','inactive','deleted','superseded')) not valid;
  end if;
end $$;

create index if not exists brand_memories_provenance_idx
  on public.brand_memories (user_id, workspace_id, source_type, source_asset_id, source_generator, status);

create unique index if not exists brand_memories_active_source_identity_unique
  on public.brand_memories (
    workspace_id,
    memory_type,
    source_type,
    coalesce(source_asset_id, source_id),
    coalesce(metadata->>'source_identity', '')
  )
  where status = 'active';

create table if not exists public.brand_memory_workspace_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.brand_workspaces(id) on delete cascade,
  memory_disabled boolean not null default false,
  disabled_at timestamptz,
  rebuilt_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

alter table public.brand_memory_workspace_settings enable row level security;

drop policy if exists "brand_memory_workspace_settings_select_owned" on public.brand_memory_workspace_settings;
create policy "brand_memory_workspace_settings_select_owned"
on public.brand_memory_workspace_settings for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memory_workspace_settings.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memory_workspace_settings_insert_owned" on public.brand_memory_workspace_settings;
create policy "brand_memory_workspace_settings_insert_owned"
on public.brand_memory_workspace_settings for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memory_workspace_settings.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memory_workspace_settings_update_owned" on public.brand_memory_workspace_settings;
create policy "brand_memory_workspace_settings_update_owned"
on public.brand_memory_workspace_settings for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memory_workspace_settings.workspace_id
      and workspace.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memory_workspace_settings.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memory_workspace_settings_delete_owned" on public.brand_memory_workspace_settings;
create policy "brand_memory_workspace_settings_delete_owned"
on public.brand_memory_workspace_settings for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memory_workspace_settings.workspace_id
      and workspace.user_id = auth.uid()
  )
);

create or replace function public.match_brand_memories(
  requested_workspace_id uuid,
  query_embedding extensions.vector(1536),
  requested_memory_types text[] default null,
  requested_match_count integer default 8,
  requested_similarity_threshold double precision default 0.35
)
returns table (
  id uuid,
  memory_type text,
  title text,
  content text,
  source_type text,
  source_id uuid,
  importance smallint,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    memory.id,
    memory.memory_type,
    memory.title,
    memory.content,
    memory.source_type,
    coalesce(memory.source_asset_id, memory.source_id) as source_id,
    memory.importance,
    memory.metadata,
    (1 - (memory.embedding <=> query_embedding))::double precision as similarity
  from public.brand_memories memory
  join public.brand_workspaces workspace on workspace.id = memory.workspace_id
  left join public.brand_memory_workspace_settings settings
    on settings.workspace_id = memory.workspace_id
    and settings.user_id = memory.user_id
  where memory.workspace_id = requested_workspace_id
    and memory.user_id = auth.uid()
    and workspace.user_id = auth.uid()
    and memory.status = 'active'
    and coalesce(settings.memory_disabled, false) = false
    and memory.embedding is not null
    and (
      requested_memory_types is null
      or memory.memory_type = any(requested_memory_types)
    )
    and (1 - (memory.embedding <=> query_embedding)) >= greatest(0, least(1, requested_similarity_threshold))
  order by
    memory.confidence desc,
    (memory.embedding <=> query_embedding) asc,
    memory.importance desc,
    memory.last_confirmed_at desc nulls last,
    memory.updated_at desc
  limit greatest(1, least(20, requested_match_count));
$$;

create or replace function public.match_brand_memories_admin(
  requested_user_id uuid,
  requested_workspace_id uuid,
  query_embedding extensions.vector(1536),
  requested_memory_types text[] default null,
  requested_match_count integer default 8,
  requested_similarity_threshold double precision default 0.35
)
returns table (
  id uuid,
  memory_type text,
  title text,
  content text,
  source_type text,
  source_id uuid,
  importance smallint,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    memory.id,
    memory.memory_type,
    memory.title,
    memory.content,
    memory.source_type,
    coalesce(memory.source_asset_id, memory.source_id) as source_id,
    memory.importance,
    memory.metadata,
    (1 - (memory.embedding <=> query_embedding))::double precision as similarity
  from public.brand_memories memory
  join public.brand_workspaces workspace on workspace.id = memory.workspace_id
  left join public.brand_memory_workspace_settings settings
    on settings.workspace_id = memory.workspace_id
    and settings.user_id = memory.user_id
  where memory.workspace_id = requested_workspace_id
    and memory.user_id = requested_user_id
    and workspace.user_id = requested_user_id
    and memory.status = 'active'
    and coalesce(settings.memory_disabled, false) = false
    and memory.embedding is not null
    and (
      requested_memory_types is null
      or memory.memory_type = any(requested_memory_types)
    )
    and (1 - (memory.embedding <=> query_embedding)) >= greatest(0, least(1, requested_similarity_threshold))
  order by
    memory.confidence desc,
    (memory.embedding <=> query_embedding) asc,
    memory.importance desc,
    memory.last_confirmed_at desc nulls last,
    memory.updated_at desc
  limit greatest(1, least(20, requested_match_count));
$$;

revoke all on function public.match_brand_memories(uuid, extensions.vector, text[], integer, double precision) from public;
grant execute on function public.match_brand_memories(uuid, extensions.vector, text[], integer, double precision) to authenticated;

revoke all on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) from public;
revoke all on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) from authenticated;
grant execute on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) to service_role;

notify pgrst, 'reload schema';
