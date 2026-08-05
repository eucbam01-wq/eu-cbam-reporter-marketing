/* ============================================================================
   P0.12 Restrict supplier evidence storage by tenant and request

   Security outcomes:
   - Supplier evidence paths are exactly <supplier_request_uuid>/<safe-pdf-name>.
   - Supplier browser access uses a short-lived Supabase anonymous-auth session
     that is explicitly bound to one active supplier request token.
   - Permanent authenticated users may read only when they are direct members
     of the owning importer organisation.
   - Unauthenticated anon-key traffic cannot upload, read, update, or delete
     supplier evidence.
   - The bucket remains private, PDF-only, limited to 10 MiB, and append-only
     for all browser roles.
   ============================================================================ */

begin;

--------------------------------------------------------------------------------
-- 1) Private bucket configuration
--------------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'supplier-evidence',
  'supplier-evidence',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

--------------------------------------------------------------------------------
-- 2) Remove legacy and prior P0.12 policies before replacing helpers
--------------------------------------------------------------------------------

drop policy if exists "Importer can read supplier evidence" on storage.objects;
drop policy if exists "Importer can read supplier evidence objects" on storage.objects;
drop policy if exists "service delete supplier evidence" on storage.objects;
drop policy if exists "service read supplier evidence" on storage.objects;
drop policy if exists "supplier evidence upload" on storage.objects;

drop policy if exists p0_12_supplier_token_insert_allow on storage.objects;
drop policy if exists p0_12_supplier_token_insert_guard on storage.objects;
drop policy if exists p0_12_supplier_token_select_allow on storage.objects;
drop policy if exists p0_12_supplier_token_select_guard on storage.objects;
drop policy if exists p0_12_importer_select_allow on storage.objects;
drop policy if exists p0_12_importer_select_guard on storage.objects;
drop policy if exists p0_12_authenticated_insert_guard on storage.objects;
drop policy if exists p0_12_anon_update_guard on storage.objects;
drop policy if exists p0_12_anon_delete_guard on storage.objects;
drop policy if exists p0_12_authenticated_update_guard on storage.objects;
drop policy if exists p0_12_authenticated_delete_guard on storage.objects;

drop policy if exists p0_12_supplier_session_insert_allow on storage.objects;
drop policy if exists p0_12_supplier_session_insert_guard on storage.objects;
drop policy if exists p0_12_supplier_session_select_allow on storage.objects;
drop policy if exists p0_12_authenticated_select_guard on storage.objects;
drop policy if exists p0_12_unauthenticated_insert_guard on storage.objects;
drop policy if exists p0_12_unauthenticated_select_guard on storage.objects;

drop function if exists public.supplier_evidence_token_can_upload(text, jsonb);
drop function if exists public.supplier_evidence_token_can_read(text);

--------------------------------------------------------------------------------
-- 3) Canonical path parser
--------------------------------------------------------------------------------

create or replace function public.supplier_evidence_request_id(
  p_object_name text
)
returns uuid
language plpgsql
immutable
strict
parallel safe
set search_path to 'pg_catalog', 'pg_temp'
as $function$
begin
  -- Exactly one request folder and one conservative PDF filename. This rejects
  -- nested paths, traversal, encoded separators, malformed UUIDs, and non-PDFs.
  if p_object_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9_-][a-z0-9._-]{0,179}\.pdf$' then
    return null;
  end if;

  return split_part(p_object_name, '/', 1)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$function$;

alter function public.supplier_evidence_request_id(text) owner to postgres;
revoke all on function public.supplier_evidence_request_id(text) from public, anon, authenticated, service_role;

--------------------------------------------------------------------------------
-- 4) Short-lived JWT-backed supplier evidence sessions
--------------------------------------------------------------------------------

create table if not exists public.supplier_evidence_sessions (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  supplier_request_id uuid not null references public.supplier_requests(id) on delete cascade,
  bound_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint supplier_evidence_sessions_expiry_chk check (expires_at > bound_at)
);

create index if not exists supplier_evidence_sessions_request_idx
  on public.supplier_evidence_sessions (supplier_request_id, expires_at);

alter table public.supplier_evidence_sessions enable row level security;
revoke all on table public.supplier_evidence_sessions from public, anon, authenticated, service_role;

comment on table public.supplier_evidence_sessions
is 'P0.12 internal mapping from a signed Supabase anonymous-auth user to one active supplier request. No direct API access.';

create or replace function public.bind_supplier_evidence_session(
  p_token text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_request_id uuid;
  v_session_expires_at timestamptz;
begin
  if v_auth_user_id is null
     or lower(coalesce(auth.jwt()->>'is_anonymous', 'false')) <> 'true' then
    raise exception using
      errcode = '42501',
      message = 'Anonymous supplier session required.';
  end if;

  -- P0.11 performs SHA-256 validation, active/revoked/expiry/use checks, and
  -- returns only the matching supplier request identifier.
  v_request_id := public.validate_supplier_token(p_token);

  select least(
           sr.token_expires_at,
           coalesce(sr.expires_at, sr.token_expires_at),
           now() + interval '30 minutes'
         )
  into v_session_expires_at
  from public.supplier_requests sr
  join public.report_items ri
    on ri.id = sr.report_item_id
  join public.reports r
    on r.id = ri.report_id
  join public.suppliers s
    on s.id = sr.supplier_id
  where sr.id = v_request_id
    and sr.report_id = r.id
    and sr.organization_id = r.importer_org_id
    and s.importer_org_id = r.importer_org_id
    and sr.revoked_at is null
    and coalesce(sr.status, '') in ('active', 'sent', 'viewed')
    and sr.token_expires_at > now()
    and (sr.expires_at is null or sr.expires_at > now())
    and coalesce(sr.used_count, 0) < coalesce(sr.max_uses, 1);

  if not found or v_session_expires_at is null or v_session_expires_at <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'Invalid or expired link.';
  end if;

  delete from public.supplier_evidence_sessions ses
  where ses.auth_user_id = v_auth_user_id
     or ses.expires_at <= now();

  insert into public.supplier_evidence_sessions (
    auth_user_id,
    supplier_request_id,
    bound_at,
    expires_at
  )
  values (
    v_auth_user_id,
    v_request_id,
    now(),
    v_session_expires_at
  )
  on conflict (auth_user_id) do update
  set
    supplier_request_id = excluded.supplier_request_id,
    bound_at = excluded.bound_at,
    expires_at = excluded.expires_at;

  return v_request_id;
end;
$function$;

alter function public.bind_supplier_evidence_session(text) owner to postgres;
revoke all on function public.bind_supplier_evidence_session(text) from public, anon, authenticated, service_role;
grant execute on function public.bind_supplier_evidence_session(text) to authenticated;

comment on function public.bind_supplier_evidence_session(text)
is 'P0.12 binds the current signed anonymous-auth user to one validated active supplier request for at most 30 minutes.';

create or replace function public.supplier_evidence_session_can_read(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
set row_security to 'off'
as $function$
  with requested as (
    select public.supplier_evidence_request_id(p_object_name) as request_id
  )
  select
    lower(coalesce(auth.jwt()->>'is_anonymous', 'false')) = 'true'
    and auth.uid() is not null
    and exists (
      select 1
      from requested requested_path
      join public.supplier_evidence_sessions ses
        on ses.auth_user_id = auth.uid()
       and ses.supplier_request_id = requested_path.request_id
       and ses.expires_at > now()
      join public.supplier_requests sr
        on sr.id = ses.supplier_request_id
      join public.report_items ri
        on ri.id = sr.report_item_id
      join public.reports r
        on r.id = ri.report_id
      join public.suppliers s
        on s.id = sr.supplier_id
      where requested_path.request_id is not null
        and sr.report_id = r.id
        and sr.organization_id = r.importer_org_id
        and s.importer_org_id = r.importer_org_id
        and sr.revoked_at is null
        and coalesce(sr.status, '') in ('active', 'sent', 'viewed')
        and sr.token_expires_at > now()
        and (sr.expires_at is null or sr.expires_at > now())
        and coalesce(sr.used_count, 0) < coalesce(sr.max_uses, 1)
    );
$function$;

alter function public.supplier_evidence_session_can_read(text) owner to postgres;
revoke all on function public.supplier_evidence_session_can_read(text) from public, anon, authenticated, service_role;
grant execute on function public.supplier_evidence_session_can_read(text) to authenticated;

create or replace function public.supplier_evidence_session_can_upload(
  p_object_name text,
  p_metadata jsonb
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
set row_security to 'off'
as $function$
  select
    public.supplier_evidence_session_can_read(p_object_name)
    and (
      -- Supabase Storage may evaluate INSERT RLS before object metadata is
      -- populated. Absence of metadata must not block a valid bound session.
      -- The private bucket independently enforces application/pdf at the API
      -- boundary. Explicit non-PDF metadata is still rejected here.
      p_metadata is null
      or not (p_metadata ? 'mimetype')
      or lower(coalesce(p_metadata->>'mimetype', '')) = 'application/pdf'
    );
$function$;

alter function public.supplier_evidence_session_can_upload(text, jsonb) owner to postgres;
revoke all on function public.supplier_evidence_session_can_upload(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.supplier_evidence_session_can_upload(text, jsonb) to authenticated;

--------------------------------------------------------------------------------
-- 5) Owning importer authorization
--------------------------------------------------------------------------------

create or replace function public.supplier_evidence_importer_can_read(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
set row_security to 'off'
as $function$
  with requested as (
    select public.supplier_evidence_request_id(p_object_name) as request_id
  )
  select
    lower(coalesce(auth.jwt()->>'is_anonymous', 'false')) <> 'true'
    and auth.uid() is not null
    and exists (
      select 1
      from requested requested_path
      join public.supplier_requests sr
        on sr.id = requested_path.request_id
      join public.report_items ri
        on ri.id = sr.report_item_id
      join public.reports r
        on r.id = ri.report_id
      join public.suppliers s
        on s.id = sr.supplier_id
      join public.memberships m
        on m.org_id = r.importer_org_id
       and m.user_id = auth.uid()
      where requested_path.request_id is not null
        and sr.report_id = r.id
        and sr.organization_id = r.importer_org_id
        and s.importer_org_id = r.importer_org_id
    );
$function$;

alter function public.supplier_evidence_importer_can_read(text) owner to postgres;
revoke all on function public.supplier_evidence_importer_can_read(text) from public, anon, authenticated, service_role;
grant execute on function public.supplier_evidence_importer_can_read(text) to authenticated;

comment on function public.supplier_evidence_request_id(text)
is 'P0.12 parses only canonical supplier evidence PDF paths.';

comment on function public.supplier_evidence_session_can_read(text)
is 'P0.12 permits a signed anonymous-auth session to read only its bound active supplier request path.';

comment on function public.supplier_evidence_session_can_upload(text, jsonb)
is 'P0.12 permits upload only through a signed anonymous-auth session bound to the canonical active request. PDF MIME and size are enforced by the private bucket; explicit non-PDF metadata is rejected when present.';

comment on function public.supplier_evidence_importer_can_read(text)
is 'P0.12 permits permanent users to read only when directly linked to the owning importer membership.';

--------------------------------------------------------------------------------
-- 6) Path-bound allow policies plus restrictive anti-bypass guards
--------------------------------------------------------------------------------

create policy p0_12_supplier_session_insert_allow
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'supplier-evidence'
  and public.supplier_evidence_session_can_upload(name, metadata)
);

create policy p0_12_supplier_session_insert_guard
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id <> 'supplier-evidence'
  or public.supplier_evidence_session_can_upload(name, metadata)
);

create policy p0_12_supplier_session_select_allow
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'supplier-evidence'
  and public.supplier_evidence_session_can_read(name)
);

create policy p0_12_importer_select_allow
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'supplier-evidence'
  and public.supplier_evidence_importer_can_read(name)
);

create policy p0_12_authenticated_select_guard
on storage.objects
as restrictive
for select
to authenticated
using (
  bucket_id <> 'supplier-evidence'
  or public.supplier_evidence_session_can_read(name)
  or public.supplier_evidence_importer_can_read(name)
);

-- A publishable/anon key alone has no supplier-evidence access. The supplier
-- must first obtain a signed anonymous-auth JWT and bind it through the RPC.
create policy p0_12_unauthenticated_insert_guard
on storage.objects
as restrictive
for insert
to anon
with check (bucket_id <> 'supplier-evidence');

create policy p0_12_unauthenticated_select_guard
on storage.objects
as restrictive
for select
to anon
using (bucket_id <> 'supplier-evidence');

-- Evidence is append-only for browser roles. Service-role maintenance bypasses
-- RLS and therefore does not require a browser policy.
create policy p0_12_anon_update_guard
on storage.objects
as restrictive
for update
to anon
using (bucket_id <> 'supplier-evidence')
with check (bucket_id <> 'supplier-evidence');

create policy p0_12_anon_delete_guard
on storage.objects
as restrictive
for delete
to anon
using (bucket_id <> 'supplier-evidence');

create policy p0_12_authenticated_update_guard
on storage.objects
as restrictive
for update
to authenticated
using (bucket_id <> 'supplier-evidence')
with check (bucket_id <> 'supplier-evidence');

create policy p0_12_authenticated_delete_guard
on storage.objects
as restrictive
for delete
to authenticated
using (bucket_id <> 'supplier-evidence');

commit;
