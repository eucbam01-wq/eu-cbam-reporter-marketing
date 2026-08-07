-- P0.11 supplier-token cryptography, migration, and authorization tests.
-- Role-switched RPC attempts are recorded first. All pgTAP assertions execute
-- after RESET ROLE so the test does not depend on pgTAP grants for anon users.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(24);

create table public.p0_11_auth_outcomes (
  name text primary key,
  succeeded boolean not null,
  sqlstate text,
  message text
);

grant insert, select on public.p0_11_auth_outcomes to authenticated, anon;

select is(
  public.supplier_token_sha256('abc'),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'P0.11-AUTH-001 SHA-256 matches the standard abc test vector'
);

select ok(
  public.supplier_token_sha256('GrandScope P0.11') ~ '^[0-9a-f]{64}$',
  'P0.11-AUTH-002 token helper returns lowercase 64-character SHA-256'
);

select ok(
  to_regprocedure('public.sha256_hex(text)') is null,
  'P0.11-AUTH-003 misleading sha256_hex MD5 helper is removed'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'supplier_requests'
      and c.conname = 'supplier_requests_token_hash_sha256_chk'
      and c.convalidated
  ),
  'P0.11-AUTH-004 validated SHA-256 token-hash constraint exists'
);

select is(
  (
    select count(*)::integer
    from public.supplier_requests
    where id::text like '70000000-0000-4000-8000-00000000000%'
      and token_hash ~ '^[0-9a-f]{64}$'
      and token is null
  ),
  4,
  'P0.11-AUTH-005 seeded supplier tokens are SHA-256 with no plaintext storage'
);

select ok(
  not has_function_privilege('anon', 'public._p0_11_migrate_legacy_supplier_token_hashes()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._p0_11_migrate_legacy_supplier_token_hashes()', 'EXECUTE'),
  'P0.11-AUTH-006 legacy migration helper is not remotely executable'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'public.current_supplier_request_id()'::regprocedure,
      'public.validate_supplier_token(text)'::regprocedure,
      'public.verify_supplier_token(text)'::regprocedure,
      'public.get_supplier_portal_context(text)'::regprocedure,
      'public.mark_supplier_request_viewed(text)'::regprocedure,
      'public.submit_supplier_portal_submission(text,jsonb)'::regprocedure,
      'public.create_supplier_portal_token_for_request(uuid)'::regprocedure,
      'public.create_supplier_request_with_token(uuid,uuid)'::regprocedure
    ]) as f(oid)
    where pg_get_functiondef(f.oid) ~* 'md5\s*\('
       or pg_get_functiondef(f.oid) ~* 'token_hash\s*=\s*p_token'
  ),
  'P0.11-AUTH-007 live token RPCs contain no MD5 or raw-token fallback'
);

select ok(
  pg_get_functiondef('public.create_supplier_portal_token_for_request(uuid)'::regprocedure) ~ 'auth\.uid\(\)'
  and pg_get_functiondef('public.create_supplier_portal_token_for_request(uuid)'::regprocedure) ~ 'is_org_member'
  and pg_get_functiondef('public.create_supplier_request_with_token(uuid,uuid)'::regprocedure) ~ 'auth\.uid\(\)'
  and pg_get_functiondef('public.create_supplier_request_with_token(uuid,uuid)'::regprocedure) ~ 'is_org_member',
  'P0.11-AUTH-008 both importer issuance RPCs contain explicit identity and tenant guards'
);

select ok(
  not has_function_privilege('anon', 'public.create_supplier_portal_token_for_request(uuid)', 'EXECUTE'),
  'P0.11-AUTH-009 anon cannot execute token rotation RPC'
);

select ok(
  not has_function_privilege('anon', 'public.create_supplier_request_with_token(uuid,uuid)', 'EXECUTE'),
  'P0.11-AUTH-010 anon cannot execute token creation RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.create_supplier_portal_token_for_request(uuid)', 'EXECUTE'),
  'P0.11-AUTH-011 authenticated callers can reach guarded token rotation RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.create_supplier_request_with_token(uuid,uuid)', 'EXECUTE'),
  'P0.11-AUTH-012 authenticated callers can reach guarded token creation RPC'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}';
set local role authenticated;

do $test$
begin
  begin
    perform 1
    from public.create_supplier_portal_token_for_request(
      '70000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('beta_rotate', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('beta_rotate', false, sqlstate, sqlerrm);
  end;

  begin
    perform 1
    from public.create_supplier_request_with_token(
      '60000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('beta_create', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('beta_create', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select not succeeded and sqlstate = 'P0001' and message = 'forbidden'
    from public.p0_11_auth_outcomes
    where name = 'beta_rotate'
  ), false),
  'P0.11-AUTH-013 unrelated authenticated tenant cannot rotate an Alpha token'
);

select ok(
  coalesce((
    select not succeeded and sqlstate = 'P0001' and message = 'forbidden'
    from public.p0_11_auth_outcomes
    where name = 'beta_create'
  ), false),
  'P0.11-AUTH-014 unrelated authenticated tenant cannot create an Alpha token'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

do $test$
begin
  begin
    perform 1
    from public.create_supplier_request_with_token(
      '60000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000004'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('alpha_cross_scope', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('alpha_cross_scope', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select not succeeded and sqlstate = 'P0001' and message = 'request_scope_mismatch'
    from public.p0_11_auth_outcomes
    where name = 'alpha_cross_scope'
  ), false),
  'P0.11-AUTH-015 importer cannot combine its report item with another tenant supplier'
);

set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

do $test$
begin
  begin
    perform 1
    from public.create_supplier_portal_token_for_request(
      '70000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('anon_rotate', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('anon_rotate', false, sqlstate, sqlerrm);
  end;

  begin
    perform 1
    from public.create_supplier_request_with_token(
      '60000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('anon_create', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('anon_create', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select not succeeded
      and sqlstate = '42501'
      and message like 'permission denied for function create_supplier_portal_token_for_request%'
    from public.p0_11_auth_outcomes
    where name = 'anon_rotate'
  ), false),
  'P0.11-AUTH-016 anon token-rotation attempt fails'
);

select ok(
  coalesce((
    select not succeeded
      and sqlstate = '42501'
      and message like 'permission denied for function create_supplier_request_with_token%'
    from public.p0_11_auth_outcomes
    where name = 'anon_create'
  ), false),
  'P0.11-AUTH-017 anon token-creation attempt fails'
);

-- Exercise safe conversion of the three possible legacy states. The table
-- constraint is dropped only inside this rolled-back test transaction.
alter table public.supplier_requests
  drop constraint supplier_requests_token_hash_sha256_chk;

insert into public.supplier_requests (
  id, report_item_id, supplier_id, token_hash, token_expires_at,
  max_uses, used_count, status, report_id, organization_id, token, expires_at
)
values
  (
    '7f000000-0000-4000-8000-000000000011',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    md5('legacy-plaintext-token'), now() + interval '1 day',
    1, 0, 'active',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'https://www.grandscope.ai/supplier/legacy-plaintext-token?source=legacy',
    now() + interval '1 day'
  ),
  (
    '7f000000-0000-4000-8000-000000000012',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    'https://www.grandscope.ai/supplier/legacy-raw-token?source=legacy',
    now() + interval '1 day',
    1, 0, 'active',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    now() + interval '1 day'
  ),
  (
    '7f000000-0000-4000-8000-000000000013',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    md5('irrecoverable-token'), now() + interval '1 day',
    1, 0, 'active',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    now() + interval '1 day'
  );

select lives_ok(
  $$select public._p0_11_migrate_legacy_supplier_token_hashes()$$,
  'P0.11-AUTH-018 legacy token migration completes without exposing plaintext'
);

select ok(
  (select token_hash from public.supplier_requests where id = '7f000000-0000-4000-8000-000000000011')
    = public.supplier_token_sha256('legacy-plaintext-token')
  and (select token is null from public.supplier_requests where id = '7f000000-0000-4000-8000-000000000011'),
  'P0.11-AUTH-019 plaintext-backed legacy link is preserved as SHA-256 and cleared'
);

select ok(
  (select token_hash from public.supplier_requests where id = '7f000000-0000-4000-8000-000000000012')
    = public.supplier_token_sha256('legacy-raw-token')
  and public.verify_supplier_token('legacy-raw-token'),
  'P0.11-AUTH-020 identifiable raw-token legacy link is preserved as SHA-256'
);

select ok(
  (select revoked_at is not null from public.supplier_requests where id = '7f000000-0000-4000-8000-000000000013')
  and (select status = 'revoked' from public.supplier_requests where id = '7f000000-0000-4000-8000-000000000013')
  and not public.verify_supplier_token('irrecoverable-token'),
  'P0.11-AUTH-021 irrecoverable MD5-only link is revoked rather than accepted by fallback'
);

select is(
  (
    select count(*)::integer
    from public.supplier_requests
    where id in (
      '7f000000-0000-4000-8000-000000000011',
      '7f000000-0000-4000-8000-000000000012',
      '7f000000-0000-4000-8000-000000000013'
    )
      and token_hash ~ '^[0-9a-f]{64}$'
      and token is null
  ),
  3,
  'P0.11-AUTH-022 every migrated legacy row ends with a SHA-256-shaped hash and no plaintext'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

do $test$
begin
  begin
    perform 1
    from public.create_supplier_portal_token_for_request(
      '70000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_auth_outcomes(name, succeeded)
    values ('alpha_rotate', true);
  exception when others then
    insert into public.p0_11_auth_outcomes(name, succeeded, sqlstate, message)
    values ('alpha_rotate', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select succeeded
    from public.p0_11_auth_outcomes
    where name = 'alpha_rotate'
  ), false),
  'P0.11-AUTH-023 valid importer can rotate its own supplier token'
);

select ok(
  (select token_hash ~ '^[0-9a-f]{64}$' from public.supplier_requests where id = '70000000-0000-4000-8000-000000000002')
  and (select token is null from public.supplier_requests where id = '70000000-0000-4000-8000-000000000002')
  and (select organization_id = '20000000-0000-4000-8000-000000000001'::uuid from public.supplier_requests where id = '70000000-0000-4000-8000-000000000002'),
  'P0.11-AUTH-024 valid importer rotation stores only tenant-bound SHA-256'
);

select * from finish();
rollback;
