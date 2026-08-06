-- Phase 1 Item 1: organisation groups and legal entities (non-breaking)
-- P0.8: renamed from .txt to an ordered timestamped SQL migration.

begin;

-- 1) Account and group level
create table if not exists public.org_groups (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint org_groups_pkey primary key (id)
);

alter table public.org_groups enable row level security;

-- 2) Bridge existing organizations into groups. Keep nullable during migration.
alter table public.organizations
  add column if not exists group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_group_id_fkey'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.organizations
      add constraint organizations_group_id_fkey
      foreign key (group_id) references public.org_groups(id);
  end if;
end
$$;

-- 3) Legal entities under a group
create table if not exists public.legal_entities (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null,
  display_name text not null,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  constraint legal_entities_pkey primary key (id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'legal_entities_group_id_fkey'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.legal_entities
      add constraint legal_entities_group_id_fkey
      foreign key (group_id) references public.org_groups(id) on delete cascade;
  end if;
end
$$;

alter table public.legal_entities enable row level security;

-- 4) Optional back-reference to keep baseline flows alive
alter table public.organizations
  add column if not exists default_legal_entity_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_default_legal_entity_id_fkey'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.organizations
      add constraint organizations_default_legal_entity_id_fkey
      foreign key (default_legal_entity_id) references public.legal_entities(id);
  end if;
end
$$;

-- 5) Minimal helper for group membership, used later by RLS
create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.org_id
    where m.user_id = auth.uid()
      and o.group_id = target_group
  );
$$;

commit;
