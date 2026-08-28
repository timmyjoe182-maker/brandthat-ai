-- BrandThat semantic brand memory foundation.
-- Feature use remains disabled until BRAND_MEMORY_ENABLED=true on the server.
-- This migration is additive and does not alter existing generator behavior.

create extension if not exists vector with schema extensions;

create table if not exists public.brand_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.brand_workspaces(id) on delete cascade,
  memory_type text not null check (memory_type in (
    'brand_fact','audience','positioning','voice','visual_direction',
    'product','campaign','saved_output','user_preference','rejected_direction'
  )),
  title text,
  content text not null check (char_length(content) between 1 and 12000),
  content_hash text not null,
  embedding extensions.vector(1536),
  embedding_model text,
  source_type text,
  source_id uuid,
  importance smallint not null default 1 check (importance between 1 and 5),
  status text not null default 'active' check (status in ('active','inactive','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  embedded_at timestamptz
);

create index if not exists brand_memories_workspace_status_idx
  on public.brand_memories (workspace_id, status, memory_type);

create index if not exists brand_memories_user_workspace_idx
  on public.brand_memories (user_id, workspace_id);

create unique index if not exists brand_memories_active_content_unique
  on public.brand_memories (workspace_id, memory_type, content_hash)
  where status = 'active';

create index if not exists brand_memories_embedding_hnsw_idx
  on public.brand_memories
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null and status = 'active';

alter table public.brand_memories enable row level security;

drop policy if exists "brand_memories_select_owned" on public.brand_memories;
create policy "brand_memories_select_owned"
on public.brand_memories for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memories.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memories_insert_owned" on public.brand_memories;
create policy "brand_memories_insert_owned"
on public.brand_memories for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memories.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memories_update_owned" on public.brand_memories;
create policy "brand_memories_update_owned"
on public.brand_memories for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memories.workspace_id
      and workspace.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memories.workspace_id
      and workspace.user_id = auth.uid()
  )
);

drop policy if exists "brand_memories_delete_owned" on public.brand_memories;
create policy "brand_memories_delete_owned"
on public.brand_memories for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.brand_workspaces workspace
    where workspace.id = brand_memories.workspace_id
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
    memory.source_id,
    memory.importance,
    memory.metadata,
    (1 - (memory.embedding <=> query_embedding))::double precision as similarity
  from public.brand_memories memory
  join public.brand_workspaces workspace on workspace.id = memory.workspace_id
  where memory.workspace_id = requested_workspace_id
    and memory.user_id = auth.uid()
    and workspace.user_id = auth.uid()
    and memory.status = 'active'
    and memory.embedding is not null
    and (
      requested_memory_types is null
      or memory.memory_type = any(requested_memory_types)
    )
    and (1 - (memory.embedding <=> query_embedding)) >= greatest(0, least(1, requested_similarity_threshold))
  order by
    (memory.embedding <=> query_embedding) asc,
    memory.importance desc,
    memory.updated_at desc
  limit greatest(1, least(20, requested_match_count));
$$;

revoke all on function public.match_brand_memories(uuid, extensions.vector, text[], integer, double precision) from public;
grant execute on function public.match_brand_memories(uuid, extensions.vector, text[], integer, double precision) to authenticated;


-- Server-only matcher. The service role bypasses RLS, so this function repeats
-- explicit user/workspace ownership checks and is not executable by clients.
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
as $
  select
    memory.id,
    memory.memory_type,
    memory.title,
    memory.content,
    memory.source_type,
    memory.source_id,
    memory.importance,
    memory.metadata,
    (1 - (memory.embedding <=> query_embedding))::double precision as similarity
  from public.brand_memories memory
  join public.brand_workspaces workspace on workspace.id = memory.workspace_id
  where memory.workspace_id = requested_workspace_id
    and memory.user_id = requested_user_id
    and workspace.user_id = requested_user_id
    and memory.status = 'active'
    and memory.embedding is not null
    and (
      requested_memory_types is null
      or memory.memory_type = any(requested_memory_types)
    )
    and (1 - (memory.embedding <=> query_embedding)) >= greatest(0, least(1, requested_similarity_threshold))
  order by
    (memory.embedding <=> query_embedding) asc,
    memory.importance desc,
    memory.updated_at desc
  limit greatest(1, least(20, requested_match_count));
$;

revoke all on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) from public;
revoke all on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) from authenticated;
grant execute on function public.match_brand_memories_admin(uuid, uuid, extensions.vector, text[], integer, double precision) to service_role;

notify pgrst, 'reload schema';
