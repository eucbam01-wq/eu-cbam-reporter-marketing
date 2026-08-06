-- P0.12 supplier evidence storage isolation and path authorization tests.
-- Covers two importer organisations, JWT-backed anonymous supplier sessions,
-- expired tokens, forged paths, unsupported file types, signed-URL SELECT
-- authorization, permanent importer membership, and append-only policies.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(50);

create table public.p0_12_storage_outcomes (
  name text primary key,
  succeeded boolean not null,
  row_count integer,
  value_uuid uuid,
  sqlstate text,
  message text
);

grant insert, select on public.p0_12_storage_outcomes to anon, authenticated;

--------------------------------------------------------------------------------
-- Catalog, helper, and policy assertions
--------------------------------------------------------------------------------

select ok(
  exists (
    select 1 from storage.buckets
    where id = 'supplier-evidence'
      and name = 'supplier-evidence'
      and public = false
  ),
  'P0.12-STORAGE-001 supplier evidence bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'supplier-evidence'),
  10485760::bigint,
  'P0.12-STORAGE-002 supplier evidence bucket has a 10 MiB object limit'
);

select ok(
  (select allowed_mime_types from storage.buckets where id = 'supplier-evidence') = array['application/pdf']::text[],
  'P0.12-STORAGE-003 supplier evidence bucket permits PDF MIME only'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Importer can read supplier evidence',
        'Importer can read supplier evidence objects',
        'service delete supplier evidence',
        'service read supplier evidence',
        'supplier evidence upload'
      )
  ),
  0,
  'P0.12-STORAGE-004 all bucket-wide legacy policies are removed'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'p0_12_%'
  ),
  11,
  'P0.12-STORAGE-005 exactly eleven P0.12 storage policies are installed'
);

select ok(
  (
    select count(*) from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'p0_12_%'
      and permissive = 'PERMISSIVE'
  ) = 3
  and (
    select count(*) from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'p0_12_%'
      and permissive = 'RESTRICTIVE'
  ) = 8,
  'P0.12-STORAGE-006 permissive allows are bounded by restrictive anti-bypass guards'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_supplier_session_insert_allow'
      and cmd = 'INSERT'
      and roles @> array['authenticated']::name[]
      and coalesce(with_check, '') ~ 'supplier_evidence_session_can_upload'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_supplier_session_insert_guard'
      and permissive = 'RESTRICTIVE'
      and coalesce(with_check, '') ~ 'supplier_evidence_session_can_upload'
  ),
  'P0.12-STORAGE-007 supplier insert requires a bound authenticated anonymous session'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_supplier_session_select_allow'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and coalesce(qual, '') ~ 'supplier_evidence_session_can_read'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_authenticated_select_guard'
      and permissive = 'RESTRICTIVE'
      and coalesce(qual, '') ~ 'supplier_evidence_session_can_read'
      and coalesce(qual, '') ~ 'supplier_evidence_importer_can_read'
  ),
  'P0.12-STORAGE-008 signed-URL SELECT requires a bound supplier session or owning importer'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_importer_select_allow'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and coalesce(qual, '') ~ 'supplier_evidence_importer_can_read'
  ),
  'P0.12-STORAGE-009 importer SELECT is path-bound through the membership helper'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_unauthenticated_insert_guard'
      and roles @> array['anon']::name[]
      and permissive = 'RESTRICTIVE'
      and coalesce(with_check, '') ~ 'bucket_id.*<>.*supplier-evidence'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'p0_12_unauthenticated_select_guard'
      and roles @> array['anon']::name[]
      and permissive = 'RESTRICTIVE'
      and coalesce(qual, '') ~ 'bucket_id.*<>.*supplier-evidence'
  ),
  'P0.12-STORAGE-010 anon key without a signed user session is denied'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'p0_12_anon_update_guard',
        'p0_12_anon_delete_guard',
        'p0_12_authenticated_update_guard',
        'p0_12_authenticated_delete_guard'
      )
      and permissive = 'RESTRICTIVE'
  ),
  4,
  'P0.12-STORAGE-011 supplier evidence is append-only for browser roles'
);

select ok(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'supplier_evidence_sessions'
      and c.relrowsecurity
  )
  and not has_table_privilege('anon', 'public.supplier_evidence_sessions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.supplier_evidence_sessions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.supplier_evidence_sessions', 'INSERT'),
  'P0.12-STORAGE-012 internal supplier session mappings have RLS and no direct API privileges'
);

select ok(
  has_function_privilege('authenticated', 'public.bind_supplier_evidence_session(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.supplier_evidence_session_can_read(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.supplier_evidence_session_can_upload(text,jsonb)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.supplier_evidence_importer_can_read(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.bind_supplier_evidence_session(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.supplier_evidence_session_can_read(text)', 'EXECUTE'),
  'P0.12-STORAGE-013 only authenticated JWT callers receive session and importer helper privileges'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'public.bind_supplier_evidence_session(text)'::regprocedure,
      'public.supplier_evidence_session_can_read(text)'::regprocedure,
      'public.supplier_evidence_session_can_upload(text,jsonb)'::regprocedure,
      'public.supplier_evidence_importer_can_read(text)'::regprocedure
    ]) f(oid)
    join pg_proc p on p.oid = f.oid
    where not p.prosecdef
       or not (coalesce(p.proconfig, array[]::text[]) @> array['row_security=off']::text[])
  ),
  'P0.12-STORAGE-014 authorization helpers are SECURITY DEFINER with row security disabled internally'
);

select ok(
  pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'is_anonymous'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'validate_supplier_token'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'supplier_requests'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'report_items'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'reports'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ 'suppliers'
  and pg_get_functiondef('public.bind_supplier_evidence_session(text)'::regprocedure) ~ '30 minutes',
  'P0.12-STORAGE-015 binding requires an anonymous JWT, active SHA-256 token, canonical tenant scope, and short expiry'
);

select ok(
  pg_get_functiondef('public.supplier_evidence_session_can_read(text)'::regprocedure) ~ 'auth.uid'
  and pg_get_functiondef('public.supplier_evidence_session_can_read(text)'::regprocedure) ~ 'supplier_evidence_sessions'
  and pg_get_functiondef('public.supplier_evidence_session_can_read(text)'::regprocedure) ~ 'is_anonymous'
  and pg_get_functiondef('public.supplier_evidence_session_can_read(text)'::regprocedure) ~ 'revoked_at'
  and pg_get_functiondef('public.supplier_evidence_session_can_read(text)'::regprocedure) ~ 'token_expires_at',
  'P0.12-STORAGE-016 each storage operation rechecks the signed session and active request lifecycle'
);

select ok(
  pg_get_functiondef('public.supplier_evidence_importer_can_read(text)'::regprocedure) ~ 'memberships'
  and pg_get_functiondef('public.supplier_evidence_importer_can_read(text)'::regprocedure) ~ 'auth.uid'
  and pg_get_functiondef('public.supplier_evidence_importer_can_read(text)'::regprocedure) ~ 'is_anonymous'
  and pg_get_functiondef('public.supplier_evidence_importer_can_read(text)'::regprocedure) !~ 'forwarder_clients',
  'P0.12-STORAGE-017 importer access requires a permanent user and direct owning-organisation membership'
);

select is(
  public.supplier_evidence_request_id('71200000-0000-4000-8000-000000000001/valid-proof.pdf'),
  '71200000-0000-4000-8000-000000000001'::uuid,
  'P0.12-STORAGE-018 canonical request PDF path resolves to its request UUID'
);

select is(
  public.supplier_evidence_request_id('71200000-0000-4000-8000-000000000001/nested/forged.pdf'),
  null::uuid,
  'P0.12-STORAGE-019 nested forged paths are rejected'
);

select is(
  public.supplier_evidence_request_id('71200000-0000-4000-8000-000000000001/not-a-pdf.txt'),
  null::uuid,
  'P0.12-STORAGE-020 non-PDF object paths are rejected'
);

--------------------------------------------------------------------------------
-- Two-tenant, expired-token, and malformed-scope fixtures
--------------------------------------------------------------------------------

-- The session table correctly references auth.users. The pgTAP JWT identities
-- below therefore need real transaction-scoped Auth rows, just as live
-- anonymous sign-ins create before bind_supplier_evidence_session is called.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '81200000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'p012.anonymous.alpha@grandscope.test',
    '',
    now(),
    '', '', '', '',
    '{"provider":"anonymous","providers":[]}'::jsonb,
    '{"verification_task":"P0.12","persona":"alpha_supplier_session"}'::jsonb,
    now(),
    now(),
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81200000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'p012.anonymous.beta@grandscope.test',
    '',
    now(),
    '', '', '', '',
    '{"provider":"anonymous","providers":[]}'::jsonb,
    '{"verification_task":"P0.12","persona":"beta_supplier_session"}'::jsonb,
    now(),
    now(),
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81200000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'p012.anonymous.negative@grandscope.test',
    '',
    now(),
    '', '', '', '',
    '{"provider":"anonymous","providers":[]}'::jsonb,
    '{"verification_task":"P0.12","persona":"negative_supplier_session"}'::jsonb,
    now(),
    now(),
    true
  )
on conflict (id) do update
set
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at,
  is_anonymous = true;

insert into public.supplier_requests (
  id, report_item_id, supplier_id, token_hash, token_expires_at,
  max_uses, used_count, last_used_at, revoked_at, status, created_at,
  report_id, organization_id, token, expires_at
)
values
  (
    '71200000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    public.supplier_token_sha256('p012-alpha-active-token'),
    now() + interval '1 day', 20, 0, null, null, 'active', now(),
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null, now() + interval '1 day'
  ),
  (
    '71200000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000004',
    '50000000-0000-4000-8000-000000000004',
    public.supplier_token_sha256('p012-beta-active-token'),
    now() + interval '1 day', 20, 0, null, null, 'active', now(),
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    null, now() + interval '1 day'
  ),
  (
    '71200000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    public.supplier_token_sha256('p012-alpha-expired-token'),
    now() - interval '1 hour', 20, 0, null, null, 'active', now(),
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null, now() - interval '1 hour'
  ),
  (
    '71200000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    public.supplier_token_sha256('p012-malformed-scope-token'),
    now() + interval '1 day', 20, 0, null, null, 'active', now(),
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    null, now() + interval '1 day'
  );

insert into storage.objects (id, bucket_id, name, metadata)
values
  (
    '91200000-0000-4000-8000-000000000001',
    'supplier-evidence',
    '71200000-0000-4000-8000-000000000001/alpha-existing.pdf',
    '{"mimetype":"application/pdf","size":128}'::jsonb
  ),
  (
    '91200000-0000-4000-8000-000000000002',
    'supplier-evidence',
    '71200000-0000-4000-8000-000000000002/beta-existing.pdf',
    '{"mimetype":"application/pdf","size":128}'::jsonb
  ),
  (
    '91200000-0000-4000-8000-000000000003',
    'supplier-evidence',
    '71200000-0000-4000-8000-000000000003/expired-existing.pdf',
    '{"mimetype":"application/pdf","size":128}'::jsonb
  ),
  (
    '91200000-0000-4000-8000-000000000004',
    'supplier-evidence',
    '71200000-0000-4000-8000-000000000004/malformed-existing.pdf',
    '{"mimetype":"application/pdf","size":128}'::jsonb
  ),
  (
    '91200000-0000-4000-8000-000000000005',
    'supplier-evidence',
    '71200000-0000-4000-8000-000000000001/nested/forged-existing.pdf',
    '{"mimetype":"application/pdf","size":128}'::jsonb
  );

--------------------------------------------------------------------------------
-- Bind signed anonymous-auth sessions to active supplier requests
--------------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_request uuid;
begin
  begin
    v_request := public.bind_supplier_evidence_session('p012-alpha-active-token');
    insert into public.p0_12_storage_outcomes(name, succeeded, value_uuid)
    values ('alpha_bind', true, v_request);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message)
    values ('alpha_bind', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_request uuid;
begin
  begin
    v_request := public.bind_supplier_evidence_session('p012-beta-active-token');
    insert into public.p0_12_storage_outcomes(name, succeeded, value_uuid)
    values ('beta_bind', true, v_request);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message)
    values ('beta_bind', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
begin
  begin
    perform public.bind_supplier_evidence_session('p012-alpha-expired-token');
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('expired_bind', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message)
    values ('expired_bind', false, sqlstate, sqlerrm);
  end;

  begin
    perform public.bind_supplier_evidence_session('p012-malformed-scope-token');
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('malformed_bind', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message)
    values ('malformed_bind', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
begin
  begin
    perform public.bind_supplier_evidence_session('p012-alpha-active-token');
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('permanent_bind', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message)
    values ('permanent_bind', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select ok(
  coalesce((select succeeded and value_uuid = '71200000-0000-4000-8000-000000000001'::uuid from public.p0_12_storage_outcomes where name = 'alpha_bind'), false),
  'P0.12-STORAGE-021 Alpha anonymous JWT binds to Alpha active request'
);

select ok(
  coalesce((select succeeded and value_uuid = '71200000-0000-4000-8000-000000000002'::uuid from public.p0_12_storage_outcomes where name = 'beta_bind'), false),
  'P0.12-STORAGE-022 Beta anonymous JWT binds to Beta active request'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'expired_bind'), false),
  'P0.12-STORAGE-023 expired supplier token cannot bind a storage session'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'malformed_bind'), false),
  'P0.12-STORAGE-024 inconsistent tenant scope cannot bind a storage session'
);

select ok(
  coalesce((select not succeeded and sqlstate = '42501' from public.p0_12_storage_outcomes where name = 'permanent_bind'), false),
  'P0.12-STORAGE-025 permanent authenticated users cannot bind supplier storage sessions'
);

select is(
  (select count(*)::integer from public.supplier_evidence_sessions where auth_user_id = '81200000-0000-4000-8000-000000000003'),
  0,
  'P0.12-STORAGE-026 failed token bindings leave no session mapping'
);

select ok(
  exists (
    select 1 from public.supplier_evidence_sessions
    where auth_user_id = '81200000-0000-4000-8000-000000000001'
      and supplier_request_id = '71200000-0000-4000-8000-000000000001'
      and expires_at > now()
      and expires_at <= now() + interval '30 minutes 5 seconds'
  ),
  'P0.12-STORAGE-027 bound supplier session is short-lived and request-specific'
);

--------------------------------------------------------------------------------
-- Storage INSERT matrix under JWT-backed authenticated roles
--------------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_rows integer;
begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/alpha-upload.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    get diagnostics v_rows = row_count;
    insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_upload_own', true, v_rows);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, row_count, sqlstate, message) values ('alpha_upload_own', false, 0, sqlstate, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000002/alpha-cross.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('alpha_upload_beta', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('alpha_upload_beta', false, sqlstate, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/nested/forged.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('alpha_upload_nested', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('alpha_upload_nested', false, sqlstate, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/not-pdf.txt', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('alpha_upload_extension', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('alpha_upload_extension', false, sqlstate, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/wrong-mime.pdf', '{"mimetype":"text/plain","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('alpha_upload_mime', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('alpha_upload_mime', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_rows integer;
begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000002/beta-upload.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    get diagnostics v_rows = row_count;
    insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('beta_upload_own', true, v_rows);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, row_count, sqlstate, message) values ('beta_upload_own', false, 0, sqlstate, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/beta-cross.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('beta_upload_alpha', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('beta_upload_alpha', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/unbound-upload.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('unbound_upload', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('unbound_upload', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('supplier-evidence', '71200000-0000-4000-8000-000000000001/importer-upload.pdf', '{"mimetype":"application/pdf","size":256}'::jsonb);
    insert into public.p0_12_storage_outcomes(name, succeeded) values ('importer_upload', true);
  exception when others then
    insert into public.p0_12_storage_outcomes(name, succeeded, sqlstate, message) values ('importer_upload', false, sqlstate, sqlerrm);
  end;
end;
$test$;
reset role;

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'alpha_upload_own'), false),
  'P0.12-STORAGE-028 Alpha bound supplier session uploads to Alpha request path'
);

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'beta_upload_own'), false),
  'P0.12-STORAGE-029 Beta bound supplier session uploads to Beta request path'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'alpha_upload_beta'), false),
  'P0.12-STORAGE-030 Alpha supplier session cannot upload to Beta request path'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'beta_upload_alpha'), false),
  'P0.12-STORAGE-031 Beta supplier session cannot upload to Alpha request path'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'alpha_upload_nested'), false),
  'P0.12-STORAGE-032 nested forged upload path is denied'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'alpha_upload_extension'), false),
  'P0.12-STORAGE-033 unsupported file extension is denied'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'alpha_upload_mime'), false),
  'P0.12-STORAGE-034 unsupported MIME type is denied'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'unbound_upload'), false),
  'P0.12-STORAGE-035 unbound anonymous-auth user cannot upload supplier evidence'
);

select ok(
  coalesce((select not succeeded from public.p0_12_storage_outcomes where name = 'importer_upload'), false),
  'P0.12-STORAGE-036 permanent importer cannot upload through the supplier evidence channel'
);

--------------------------------------------------------------------------------
-- Supplier SELECT matrix used by Storage signed URL creation
--------------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_own integer; v_cross integer; v_expired integer; v_malformed integer; v_nested integer;
begin
  select count(*)::integer into v_own from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  select count(*)::integer into v_cross from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000002/beta-existing.pdf';
  select count(*)::integer into v_expired from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000003/expired-existing.pdf';
  select count(*)::integer into v_malformed from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000004/malformed-existing.pdf';
  select count(*)::integer into v_nested from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/nested/forged-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_select_own', true, v_own);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_select_beta', true, v_cross);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_select_expired', true, v_expired);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_select_malformed', true, v_malformed);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_select_nested', true, v_nested);
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_own integer; v_cross integer;
begin
  select count(*)::integer into v_own from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000002/beta-existing.pdf';
  select count(*)::integer into v_cross from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('beta_select_own', true, v_own);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('beta_select_alpha', true, v_cross);
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_rows integer;
begin
  select count(*)::integer into v_rows from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('unbound_select', true, v_rows);
end;
$test$;
reset role;

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'alpha_select_own'), false),
  'P0.12-STORAGE-037 Alpha supplier session can authorize a signed URL for Alpha evidence'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_select_beta'), false),
  'P0.12-STORAGE-038 Alpha supplier session cannot authorize a signed URL for Beta evidence'
);

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'beta_select_own'), false),
  'P0.12-STORAGE-039 Beta supplier session can authorize a signed URL for Beta evidence'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'beta_select_alpha'), false),
  'P0.12-STORAGE-040 Beta supplier session cannot authorize a signed URL for Alpha evidence'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'unbound_select'), false),
  'P0.12-STORAGE-041 unbound anonymous-auth user cannot authorize signed URLs'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_select_expired'), false),
  'P0.12-STORAGE-042 active supplier session cannot access another expired request'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_select_malformed'), false),
  'P0.12-STORAGE-043 inconsistent tenant scope is inaccessible to supplier sessions'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_select_nested'), false),
  'P0.12-STORAGE-044 nested forged evidence path is inaccessible to supplier sessions'
);

update public.supplier_evidence_sessions
set expires_at = now() - interval '1 second',
    bound_at = now() - interval '2 seconds'
where auth_user_id = '81200000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '81200000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81200000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare v_rows integer;
begin
  select count(*)::integer into v_rows from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('expired_session_select', true, v_rows);
end;
$test$;
reset role;

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'expired_session_select'), false),
  'P0.12-STORAGE-045 expired bound session cannot authorize a signed URL'
);

--------------------------------------------------------------------------------
-- Permanent importer SELECT matrix
--------------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
declare v_active integer; v_expired integer; v_cross integer; v_malformed integer; v_nested integer;
begin
  select count(*)::integer into v_active from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  select count(*)::integer into v_expired from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000003/expired-existing.pdf';
  select count(*)::integer into v_cross from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000002/beta-existing.pdf';
  select count(*)::integer into v_malformed from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000004/malformed-existing.pdf';
  select count(*)::integer into v_nested from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/nested/forged-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_importer_active', true, v_active);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_importer_expired', true, v_expired);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_importer_beta', true, v_cross);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_importer_malformed', true, v_malformed);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('alpha_importer_nested', true, v_nested);
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
declare v_own integer; v_cross integer;
begin
  select count(*)::integer into v_own from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000002/beta-existing.pdf';
  select count(*)::integer into v_cross from storage.objects
  where bucket_id = 'supplier-evidence' and name = '71200000-0000-4000-8000-000000000001/alpha-existing.pdf';
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('beta_importer_own', true, v_own);
  insert into public.p0_12_storage_outcomes(name, succeeded, row_count) values ('beta_importer_alpha', true, v_cross);
end;
$test$;
reset role;

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'alpha_importer_active'), false),
  'P0.12-STORAGE-046 Alpha importer can authorize a signed URL for Alpha active evidence'
);

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'alpha_importer_expired'), false),
  'P0.12-STORAGE-047 Alpha importer retains access to its own expired-request evidence'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_importer_beta'), false),
  'P0.12-STORAGE-048 Alpha importer cannot authorize a signed URL for Beta evidence'
);

select ok(
  coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_importer_malformed'), false)
  and coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'alpha_importer_nested'), false),
  'P0.12-STORAGE-049 importer cannot access inconsistent or noncanonical evidence paths'
);

select ok(
  coalesce((select succeeded and row_count = 1 from public.p0_12_storage_outcomes where name = 'beta_importer_own'), false)
  and coalesce((select succeeded and row_count = 0 from public.p0_12_storage_outcomes where name = 'beta_importer_alpha'), false),
  'P0.12-STORAGE-050 Beta importer can read only Beta evidence'
);

select * from finish();
rollback;
