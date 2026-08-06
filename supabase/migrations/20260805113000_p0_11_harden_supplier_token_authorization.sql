/* ============================================================================
   P0.11 Harden supplier token hashing and RPC authorization

   Security outcomes:
   - SHA-256 is the only accepted supplier-token hash algorithm.
   - Plaintext legacy tokens are rehashed and removed from supplier_requests.token.
   - Irrecoverable MD5-only hashes are revoked instead of receiving an unsafe
     compatibility fallback.
   - Importer token-issuance RPCs verify direct tenant membership.
   - Anonymous supplier lifecycle RPCs use SHA-256 only.
   ============================================================================ */

begin;

create extension if not exists pgcrypto with schema extensions;

--------------------------------------------------------------------------------
-- 1) Canonical token helpers
--------------------------------------------------------------------------------

create or replace function public.normalize_supplier_portal_token(p_token text)
returns text
language sql
immutable
parallel safe
set search_path to 'pg_catalog', 'pg_temp'
as $function$
  select nullif(
    regexp_replace(
      regexp_replace(btrim(coalesce(p_token, '')), '\?.*$', ''),
      '^.*/',
      ''
    ),
    ''
  );
$function$;

alter function public.normalize_supplier_portal_token(text) owner to postgres;
revoke all on function public.normalize_supplier_portal_token(text) from public, anon, authenticated, service_role;

create or replace function public.supplier_token_sha256(p_token text)
returns text
language sql
immutable
strict
parallel safe
set search_path to 'pg_catalog', 'extensions', 'pg_temp'
as $function$
  select encode(
    extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );
$function$;

alter function public.supplier_token_sha256(text) owner to postgres;
revoke all on function public.supplier_token_sha256(text) from public, anon, authenticated, service_role;

--------------------------------------------------------------------------------
-- 2) Safe one-way migration of legacy token material
--------------------------------------------------------------------------------

create or replace function public._p0_11_migrate_legacy_supplier_token_hashes()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_rehashed_from_token bigint := 0;
  v_rehashed_from_raw_hash bigint := 0;
  v_normalized_sha256 bigint := 0;
  v_revoked_unrecoverable bigint := 0;
begin
  -- A stored plaintext token is authoritative and can be migrated without
  -- breaking the active link. The plaintext copy is removed immediately.
  update public.supplier_requests sr
  set
    token_hash = public.supplier_token_sha256(
      public.normalize_supplier_portal_token(sr.token)
    ),
    token = null
  where public.normalize_supplier_portal_token(sr.token) is not null;

  get diagnostics v_rehashed_from_token = row_count;

  -- Some legacy rows stored the raw token in token_hash. Only non-hex values
  -- can be identified safely. Hex-looking 32-character values are treated as
  -- irrecoverable MD5 because guessing could reactivate the wrong credential.
  update public.supplier_requests sr
  set
    token_hash = public.supplier_token_sha256(
      public.normalize_supplier_portal_token(sr.token_hash)
    ),
    token = null
  where nullif(btrim(sr.token_hash), '') is not null
    and sr.token_hash !~* '^[0-9a-f]{32}$'
    and sr.token_hash !~* '^[0-9a-f]{64}$';

  get diagnostics v_rehashed_from_raw_hash = row_count;

  -- Canonicalize already valid SHA-256 hashes.
  update public.supplier_requests sr
  set
    token_hash = lower(sr.token_hash),
    token = null
  where sr.token_hash ~* '^[0-9a-f]{64}$'
    and sr.token_hash is distinct from lower(sr.token_hash);

  get diagnostics v_normalized_sha256 = row_count;

  -- MD5 cannot be converted to SHA-256 without the original token. Such rows
  -- are revoked and receive a non-usable SHA-256 audit value so no MD5 or raw
  -- token fallback remains in the live schema.
  update public.supplier_requests sr
  set
    token_hash = public.supplier_token_sha256(
      'p0.11-revoked:' || sr.id::text || ':' || coalesce(sr.token_hash, '')
    ),
    token = null,
    revoked_at = coalesce(sr.revoked_at, now()),
    token_expires_at = coalesce(least(sr.token_expires_at, now()), now()),
    expires_at = case
      when sr.expires_at is null then now()
      else least(sr.expires_at, now())
    end,
    status = case
      when coalesce(sr.status, '') in ('draft', 'active', 'sent', 'viewed', 'started', 'expired')
        then 'revoked'
      else sr.status
    end
  where sr.token_hash is null
     or sr.token_hash !~ '^[0-9a-f]{64}$';

  get diagnostics v_revoked_unrecoverable = row_count;

  -- Never retain a plaintext token after this migration.
  update public.supplier_requests
  set token = null
  where token is not null;

  return jsonb_build_object(
    'rehashed_from_plaintext_token', v_rehashed_from_token,
    'rehashed_from_raw_token_hash', v_rehashed_from_raw_hash,
    'normalized_existing_sha256', v_normalized_sha256,
    'revoked_unrecoverable', v_revoked_unrecoverable
  );
end;
$function$;

alter function public._p0_11_migrate_legacy_supplier_token_hashes() owner to postgres;
revoke all on function public._p0_11_migrate_legacy_supplier_token_hashes() from public, anon, authenticated, service_role;

select public._p0_11_migrate_legacy_supplier_token_hashes();

alter table public.supplier_requests
  drop constraint if exists supplier_requests_token_hash_sha256_chk;

alter table public.supplier_requests
  add constraint supplier_requests_token_hash_sha256_chk
  check (
    token_hash is not null
    and token_hash ~ '^[0-9a-f]{64}$'
  ) not valid;

alter table public.supplier_requests
  validate constraint supplier_requests_token_hash_sha256_chk;

comment on constraint supplier_requests_token_hash_sha256_chk
on public.supplier_requests
is 'P0.11: supplier token hashes must be lowercase hexadecimal SHA-256.';

comment on column public.supplier_requests.token
is 'Legacy plaintext token column. P0.11 clears this column and token RPCs never write it.';

--------------------------------------------------------------------------------
-- 3) SHA-256-only supplier lifecycle
--------------------------------------------------------------------------------

create or replace function public.current_supplier_request_id()
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
  with supplied_token as (
    select public.normalize_supplier_portal_token(public.supplier_portal_token()) as token
  )
  select sr.id
  from public.supplier_requests sr
  cross join supplied_token st
  where st.token is not null
    and sr.token_hash = public.supplier_token_sha256(st.token)
    and sr.revoked_at is null
    and coalesce(sr.status, '') in ('active', 'sent', 'viewed')
    and (sr.token_expires_at is null or sr.token_expires_at > now())
    and (sr.expires_at is null or sr.expires_at > now())
    and coalesce(sr.used_count, 0) < coalesce(sr.max_uses, 1)
  limit 1;
$function$;

alter function public.current_supplier_request_id() owner to postgres;
revoke all on function public.current_supplier_request_id() from public, anon, authenticated, service_role;
grant execute on function public.current_supplier_request_id() to anon, authenticated, service_role;

create or replace function public.validate_supplier_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_req public.supplier_requests%rowtype;
  v_now timestamptz := now();
  v_token text;
  v_hash text;
begin
  v_token := public.normalize_supplier_portal_token(p_token);
  perform public._cbam_assert(v_token is not null, 'Invalid or expired link.');
  v_hash := public.supplier_token_sha256(v_token);

  select sr.*
  into v_req
  from public.supplier_requests sr
  where sr.token_hash = v_hash
  order by sr.created_at desc
  limit 1;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.status, '') in ('active', 'sent', 'viewed'), 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.used_count, 0) < coalesce(v_req.max_uses, 1), 'Invalid or expired link.');

  update public.supplier_requests
  set
    status = case when status in ('active', 'sent') then 'viewed' else status end,
    last_used_at = v_now
  where id = v_req.id;

  return v_req.id;
end;
$function$;

alter function public.validate_supplier_token(text) owner to postgres;

create or replace function public.verify_supplier_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
  with supplied_token as (
    select public.normalize_supplier_portal_token(p_token) as token
  )
  select exists (
    select 1
    from public.supplier_requests sr
    cross join supplied_token st
    where st.token is not null
      and sr.token_hash = public.supplier_token_sha256(st.token)
      and sr.revoked_at is null
      and coalesce(sr.status, '') in ('active', 'sent', 'viewed')
      and (sr.token_expires_at is null or sr.token_expires_at > now())
      and (sr.expires_at is null or sr.expires_at > now())
      and coalesce(sr.used_count, 0) < coalesce(sr.max_uses, 1)
  );
$function$;

alter function public.verify_supplier_token(text) owner to postgres;

create or replace function public.get_supplier_portal_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_req public.supplier_requests%rowtype;
  v_now timestamptz := now();
  v_token text;
  v_hash text;
begin
  v_token := public.normalize_supplier_portal_token(p_token);
  perform public._cbam_assert(v_token is not null, 'Invalid or expired link.');
  v_hash := public.supplier_token_sha256(v_token);

  select sr.*
  into v_req
  from public.supplier_requests sr
  where sr.token_hash = v_hash
  order by sr.created_at desc
  limit 1;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.status, '') in ('active', 'sent', 'viewed'), 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.used_count, 0) < coalesce(v_req.max_uses, 1), 'Invalid or expired link.');

  return jsonb_build_object(
    'supplier_request_id', v_req.id,
    'report_item_id', v_req.report_item_id,
    'supplier_id', v_req.supplier_id,
    'expires_at', coalesce(v_req.expires_at, v_req.token_expires_at),
    'token_expires_at', v_req.token_expires_at
  );
end;
$function$;

alter function public.get_supplier_portal_context(text) owner to postgres;

create or replace function public.mark_supplier_request_viewed(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_token text;
  v_hash text;
begin
  v_token := public.normalize_supplier_portal_token(p_token);

  if v_token is null then
    return;
  end if;

  v_hash := public.supplier_token_sha256(v_token);

  update public.supplier_requests
  set
    status = case when status in ('active', 'sent') then 'viewed' else status end,
    last_used_at = now()
  where token_hash = v_hash
    and revoked_at is null
    and coalesce(status, '') in ('active', 'sent', 'viewed')
    and (token_expires_at is null or token_expires_at > now())
    and (expires_at is null or expires_at > now())
    and coalesce(used_count, 0) < coalesce(max_uses, 1);
end;
$function$;

alter function public.mark_supplier_request_viewed(text) owner to postgres;

create or replace function public.submit_supplier_portal_submission(
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_req public.supplier_requests%rowtype;
  v_token text;
  v_hash text;
  v_now timestamptz := now();
  v_sub_id uuid;
begin
  v_token := public.normalize_supplier_portal_token(p_token);
  perform public._cbam_assert(v_token is not null, 'Invalid or expired link.');
  v_hash := public.supplier_token_sha256(v_token);

  select sr.*
  into v_req
  from public.supplier_requests sr
  where sr.token_hash = v_hash
  order by sr.created_at desc
  limit 1
  for update;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.status, '') in ('active', 'sent', 'viewed'), 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(
    coalesce(v_req.used_count, 0) < coalesce(v_req.max_uses, 1),
    'Supplier token usage limit exceeded'
  );

  perform public.validate_cbam_supplier_payload_v1(p_payload);

  insert into public.supplier_portal_submissions (
    supplier_request_id,
    payload,
    submitted_at
  )
  values (
    v_req.id,
    p_payload,
    v_now
  )
  returning id into v_sub_id;

  update public.supplier_requests
  set
    used_count = coalesce(used_count, 0) + 1,
    last_used_at = v_now,
    status = case
      when (coalesce(used_count, 0) + 1) >= coalesce(max_uses, 1) then 'submitted'
      else status
    end
  where id = v_req.id;

  return jsonb_build_object(
    'ok', true,
    'submission_id', v_sub_id,
    'supplier_request_id', v_req.id
  );
end;
$function$;

alter function public.submit_supplier_portal_submission(text, jsonb) owner to postgres;

create or replace function public.enforce_supplier_token_usage()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_used integer;
  v_max integer;
  v_status text;
  v_expires_at timestamptz;
  v_token_expires_at timestamptz;
  v_revoked_at timestamptz;
begin
  select
    used_count,
    max_uses,
    status,
    expires_at,
    token_expires_at,
    revoked_at
  into
    v_used,
    v_max,
    v_status,
    v_expires_at,
    v_token_expires_at,
    v_revoked_at
  from public.supplier_requests
  where id = new.supplier_request_id
  for update;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_status, '') in ('active', 'sent', 'viewed'), 'Invalid or expired link.');
  perform public._cbam_assert(v_token_expires_at is null or v_token_expires_at > now(), 'Invalid or expired link.');
  perform public._cbam_assert(v_expires_at is null or v_expires_at > now(), 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_used, 0) < coalesce(v_max, 1), 'Supplier token usage limit exceeded');

  return new;
end;
$function$;

alter function public.enforce_supplier_token_usage() owner to postgres;

--------------------------------------------------------------------------------
-- 4) Tenant-bound importer token issuance
--------------------------------------------------------------------------------

create or replace function public.create_supplier_portal_token_for_request(
  p_supplier_request_id uuid
)
returns table(
  plaintext_token text,
  full_url text,
  supplier_request_id uuid,
  token_hash text,
  expires_at timestamptz,
  token_expires_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_req public.supplier_requests%rowtype;
  v_report_id uuid;
  v_org_id uuid;
  v_supplier_org_id uuid;
  v_plaintext text;
  v_hash text;
  v_expires_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select sr.*
  into v_req
  from public.supplier_requests sr
  where sr.id = p_supplier_request_id
  for update;

  if not found then
    raise exception 'supplier_request_not_found';
  end if;

  select
    ri.report_id,
    r.importer_org_id,
    s.importer_org_id
  into
    v_report_id,
    v_org_id,
    v_supplier_org_id
  from public.report_items ri
  join public.reports r on r.id = ri.report_id
  join public.suppliers s on s.id = v_req.supplier_id
  where ri.id = v_req.report_item_id;

  if v_report_id is null or v_org_id is null or v_supplier_org_id is null then
    raise exception 'invalid_request_scope';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(v_org_id) then
    raise exception 'forbidden';
  end if;

  if v_supplier_org_id <> v_org_id
     or (v_req.organization_id is not null and v_req.organization_id <> v_org_id)
     or (v_req.report_id is not null and v_req.report_id <> v_report_id) then
    raise exception 'request_scope_mismatch';
  end if;

  if v_req.revoked_at is not null
     or coalesce(v_req.max_uses, 1) <> 1
     or coalesce(v_req.used_count, 0) <> 0
     or coalesce(v_req.status, '') not in ('draft', 'active', 'sent', 'viewed', 'expired') then
    raise exception 'supplier_request_id is not eligible for token issuance';
  end if;

  if exists (
    select 1
    from public.supplier_portal_submissions sps
    where sps.supplier_request_id = p_supplier_request_id
  ) then
    raise exception 'supplier_request_id already has a submission';
  end if;

  v_plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.supplier_token_sha256(v_plaintext);
  v_expires_at := now() + interval '14 days';

  update public.supplier_requests
  set
    organization_id = v_org_id,
    report_id = v_report_id,
    token_hash = v_hash,
    token = null,
    used_count = 0,
    revoked_at = null,
    last_used_at = null,
    status = 'sent',
    expires_at = v_expires_at,
    token_expires_at = v_expires_at
  where id = p_supplier_request_id;

  return query
  select
    v_plaintext,
    'https://www.grandscope.ai/supplier/' || v_plaintext,
    p_supplier_request_id,
    v_hash,
    v_expires_at,
    v_expires_at;
end;
$function$;

alter function public.create_supplier_portal_token_for_request(uuid) owner to postgres;

create or replace function public.create_supplier_request_with_token(
  p_report_item_id uuid,
  p_supplier_id uuid
)
returns table(
  plaintext_token text,
  full_url text,
  supplier_request_id uuid,
  token_hash text,
  expires_at timestamptz,
  token_expires_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_report_id uuid;
  v_org_id uuid;
  v_supplier_org_id uuid;
  v_plaintext text;
  v_hash text;
  v_expires_at timestamptz;
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select
    ri.report_id,
    r.importer_org_id
  into
    v_report_id,
    v_org_id
  from public.report_items ri
  join public.reports r on r.id = ri.report_id
  where ri.id = p_report_item_id;

  if v_report_id is null or v_org_id is null then
    raise exception 'invalid_request_scope';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(v_org_id) then
    raise exception 'forbidden';
  end if;

  select s.importer_org_id
  into v_supplier_org_id
  from public.suppliers s
  where s.id = p_supplier_id;

  if v_supplier_org_id is null or v_supplier_org_id <> v_org_id then
    raise exception 'request_scope_mismatch';
  end if;

  v_plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.supplier_token_sha256(v_plaintext);
  v_expires_at := now() + interval '14 days';

  insert into public.supplier_requests (
    organization_id,
    report_id,
    report_item_id,
    supplier_id,
    token_hash,
    token,
    max_uses,
    used_count,
    status,
    expires_at,
    token_expires_at
  )
  values (
    v_org_id,
    v_report_id,
    p_report_item_id,
    p_supplier_id,
    v_hash,
    null,
    1,
    0,
    'sent',
    v_expires_at,
    v_expires_at
  )
  returning id into v_id;

  return query
  select
    v_plaintext,
    'https://www.grandscope.ai/supplier/' || v_plaintext,
    v_id,
    v_hash,
    v_expires_at,
    v_expires_at;
end;
$function$;

alter function public.create_supplier_request_with_token(uuid, uuid) owner to postgres;

--------------------------------------------------------------------------------
-- 5) Final function privileges and removal of misleading MD5 helper
--------------------------------------------------------------------------------

revoke all on function public.create_supplier_portal_token_for_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_supplier_portal_token_for_request(uuid) to authenticated, service_role;

revoke all on function public.create_supplier_request_with_token(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_supplier_request_with_token(uuid, uuid) to authenticated, service_role;

revoke all on function public.validate_supplier_token(text) from public, anon, authenticated, service_role;
grant execute on function public.validate_supplier_token(text) to anon, authenticated, service_role;

revoke all on function public.verify_supplier_token(text) from public, anon, authenticated, service_role;
grant execute on function public.verify_supplier_token(text) to anon, authenticated, service_role;

revoke all on function public.get_supplier_portal_context(text) from public, anon, authenticated, service_role;
grant execute on function public.get_supplier_portal_context(text) to anon, authenticated, service_role;

revoke all on function public.mark_supplier_request_viewed(text) from public, anon, authenticated, service_role;
grant execute on function public.mark_supplier_request_viewed(text) to anon, authenticated, service_role;

revoke all on function public.submit_supplier_portal_submission(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_supplier_portal_submission(text, jsonb) to anon, authenticated, service_role;

-- current_supplier_request_id no longer depends on sha256_hex, so the helper can
-- be removed without CASCADE. A dependency here must fail the migration.
drop function if exists public.sha256_hex(text);

commit;
