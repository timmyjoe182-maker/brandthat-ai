-- BrandThat private-pilot memory observability.
-- Additive only. Stores no customer content, prompts, embeddings, emails, raw UUIDs, tokens, or secrets.

create table if not exists public.brand_memory_operational_events (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  event_name text not null,
  request_id text,
  user_hash text,
  workspace_hash text,
  duration_ms integer,
  result_count integer,
  code text,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  constraint brand_memory_operational_event_name_check
    check (event_name ~ '^[a-z0-9_.-]{3,80}$'),
  constraint brand_memory_operational_duration_check
    check (duration_ms is null or duration_ms >= 0),
  constraint brand_memory_operational_count_check
    check (result_count is null or result_count >= 0)
);

alter table public.brand_memory_operational_events enable row level security;

revoke all on table public.brand_memory_operational_events from anon;
revoke all on table public.brand_memory_operational_events from authenticated;
grant select, insert, delete on table public.brand_memory_operational_events to service_role;

create index if not exists brand_memory_operational_events_timestamp_idx
  on public.brand_memory_operational_events (timestamp desc);

create index if not exists brand_memory_operational_events_event_idx
  on public.brand_memory_operational_events (event_name, timestamp desc);

create index if not exists brand_memory_operational_events_code_idx
  on public.brand_memory_operational_events (code, timestamp desc)
  where code is not null;

create index if not exists brand_memory_operational_events_workspace_idx
  on public.brand_memory_operational_events (workspace_hash, timestamp desc)
  where workspace_hash is not null;

create or replace function public.prune_brand_memory_operational_events(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.brand_memory_operational_events
  where timestamp < now() - make_interval(days => greatest(1, least(365, retention_days)))
     or expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.prune_brand_memory_operational_events(integer) from public;
revoke all on function public.prune_brand_memory_operational_events(integer) from anon;
revoke all on function public.prune_brand_memory_operational_events(integer) from authenticated;
grant execute on function public.prune_brand_memory_operational_events(integer) to service_role;

comment on table public.brand_memory_operational_events is
  'Sanitized service-role-only observability events for the private semantic brand memory pilot. Contains only hashed identifiers and operational metrics.';

notify pgrst, 'reload schema';
