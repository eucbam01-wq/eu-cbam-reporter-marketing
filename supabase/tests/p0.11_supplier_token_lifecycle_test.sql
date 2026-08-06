-- P0.11 positive token lifecycle proof: valid importer issue, anonymous use,
-- single submission, then deterministic rejection of reuse.
-- Role-switched RPC attempts are captured in transaction-scoped tables. All
-- pgTAP assertions execute after RESET ROLE.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(20);

create table public.p0_11_token_result (
  plaintext_token text,
  full_url text,
  supplier_request_id uuid,
  token_hash text,
  expires_at timestamptz,
  token_expires_at timestamptz
);

create table public.p0_11_lifecycle_outcomes (
  name text primary key,
  succeeded boolean not null,
  value text,
  sqlstate text,
  message text
);

grant select, insert on public.p0_11_token_result to authenticated, anon;
grant select, insert on public.p0_11_lifecycle_outcomes to authenticated, anon;

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

do $test$
begin
  begin
    insert into public.p0_11_token_result
    select *
    from public.create_supplier_request_with_token(
      '60000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000002'::uuid
    );

    insert into public.p0_11_lifecycle_outcomes(name, succeeded)
    values ('issue', true);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('issue', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select succeeded
    from public.p0_11_lifecycle_outcomes
    where name = 'issue'
  ), false),
  'P0.11-LIFECYCLE-001 valid importer issues a supplier token'
);

select is(
  (select count(*)::integer from public.p0_11_token_result),
  1,
  'P0.11-LIFECYCLE-002 issuance returns exactly one token record'
);

select ok(
  coalesce((select plaintext_token ~ '^[0-9a-f]{64}$' from public.p0_11_token_result), false),
  'P0.11-LIFECYCLE-003 plaintext token contains 32 random bytes encoded as hex'
);

select ok(
  coalesce((
    select token_hash = public.supplier_token_sha256(plaintext_token)
      and token_hash ~ '^[0-9a-f]{64}$'
    from public.p0_11_token_result
  ), false),
  'P0.11-LIFECYCLE-004 returned hash is real SHA-256 of the issued token'
);

select ok(
  exists (
    select 1
    from public.supplier_requests sr
    join public.p0_11_token_result tr on tr.supplier_request_id = sr.id
    where sr.token_hash = tr.token_hash
  ),
  'P0.11-LIFECYCLE-005 stored token hash matches the returned SHA-256'
);

select ok(
  exists (
    select 1
    from public.supplier_requests sr
    join public.p0_11_token_result tr on tr.supplier_request_id = sr.id
    where sr.token is null
  ),
  'P0.11-LIFECYCLE-006 database stores no plaintext token'
);

select ok(
  exists (
    select 1
    from public.supplier_requests sr
    join public.p0_11_token_result tr on tr.supplier_request_id = sr.id
    where sr.organization_id = '20000000-0000-4000-8000-000000000001'::uuid
      and sr.report_id = '40000000-0000-4000-8000-000000000001'::uuid
      and sr.report_item_id = '60000000-0000-4000-8000-000000000002'::uuid
      and sr.supplier_id = '50000000-0000-4000-8000-000000000002'::uuid
  ),
  'P0.11-LIFECYCLE-007 issued request is bound to the importer tenant and selected scope'
);

do $config$
begin
  perform set_config('p0_11.token', (select plaintext_token from public.p0_11_token_result), true);
  perform set_config('p0_11.full_url', (select full_url from public.p0_11_token_result), true);
  perform set_config('p0_11.request_id', (select supplier_request_id::text from public.p0_11_token_result), true);
end;
$config$;

set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

do $test$
declare
  v_value text;
begin
  begin
    select public.verify_supplier_token(current_setting('p0_11.token'))::text
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('verify_before', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('verify_before', false, sqlstate, sqlerrm);
  end;

  begin
    select public.validate_supplier_token(current_setting('p0_11.token'))::text
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('validate_before', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('validate_before', false, sqlstate, sqlerrm);
  end;

  begin
    select public.get_supplier_portal_context(current_setting('p0_11.token'))->>'supplier_request_id'
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('context_before', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('context_before', false, sqlstate, sqlerrm);
  end;

  begin
    select public.verify_supplier_token(
      current_setting('p0_11.full_url') || '?source=p0.11-test'
    )::text
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('verify_url', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('verify_url', false, sqlstate, sqlerrm);
  end;

  begin
    perform public.mark_supplier_request_viewed(current_setting('p0_11.token'));

    insert into public.p0_11_lifecycle_outcomes(name, succeeded)
    values ('mark_viewed', true);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('mark_viewed', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select succeeded and value = 'true'
    from public.p0_11_lifecycle_outcomes
    where name = 'verify_before'
  ), false),
  'P0.11-LIFECYCLE-008 anonymous supplier can verify the fresh token'
);

select is(
  (
    select value
    from public.p0_11_lifecycle_outcomes
    where name = 'validate_before' and succeeded
  ),
  current_setting('p0_11.request_id'),
  'P0.11-LIFECYCLE-009 anonymous supplier validates the token without an account'
);

select is(
  (
    select value
    from public.p0_11_lifecycle_outcomes
    where name = 'context_before' and succeeded
  ),
  current_setting('p0_11.request_id'),
  'P0.11-LIFECYCLE-010 token exposes only its own supplier-request context'
);

select ok(
  coalesce((
    select succeeded and value = 'true'
    from public.p0_11_lifecycle_outcomes
    where name = 'verify_url'
  ), false),
  'P0.11-LIFECYCLE-011 full supplier URL normalizes to the same token'
);

select ok(
  coalesce((
    select succeeded
    from public.p0_11_lifecycle_outcomes
    where name = 'mark_viewed'
  ), false),
  'P0.11-LIFECYCLE-012 viewed tracking accepts the active SHA-256 token'
);

select is(
  (
    select sr.status
    from public.supplier_requests sr
    join public.p0_11_token_result tr on tr.supplier_request_id = sr.id
  ),
  'viewed',
  'P0.11-LIFECYCLE-013 request reaches viewed state before submission'
);

set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

do $test$
begin
  begin
    perform public.submit_supplier_portal_submission(
      current_setting('p0_11.token'),
      $payload$
      {
        "contact": {
          "name": "P0.11 Lifecycle Supplier",
          "email": "p011.lifecycle@grandscope.test"
        },
        "identity": {
          "operator_legal_name": "P0.11 Lifecycle Supplier Ltd",
          "installation_name": "P0.11 Test Installation",
          "installation_address": {
            "street": "1 Test Road",
            "city": "Glasgow",
            "country": "GB"
          },
          "nace_code": "2511",
          "unlocode": "GBGLW"
        },
        "goods": {
          "cn_code": "76042990",
          "trade_name": "Aluminium alloy bars",
          "production_route": "Extrusion",
          "quantity_tonnes": 1.0
        },
        "scope1": {
          "total_tco2e": 0.5,
          "source_streams": []
        },
        "scope2": {
          "electricity_mwh": 1.0,
          "source_type": "grid_average"
        },
        "precursors": {
          "used": false,
          "items": []
        },
        "carbon_price": {},
        "derived": {},
        "evidence_files": []
      }
      $payload$::jsonb
    );

    insert into public.p0_11_lifecycle_outcomes(name, succeeded)
    values ('submit', true);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('submit', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select succeeded
    from public.p0_11_lifecycle_outcomes
    where name = 'submit'
  ), false),
  'P0.11-LIFECYCLE-014 anonymous supplier submits one valid payload'
);

select ok(
  exists (
    select 1
    from public.supplier_portal_submissions sps
    where sps.supplier_request_id = current_setting('p0_11.request_id')::uuid
      and sps.payload->'goods'->>'cn_code' = '76042990'
  ),
  'P0.11-LIFECYCLE-015 submission RPC persists the validated supplier payload'
);

select ok(
  exists (
    select 1
    from public.supplier_requests sr
    join public.p0_11_token_result tr on tr.supplier_request_id = sr.id
    where sr.status = 'submitted'
      and sr.used_count = 1
      and sr.last_used_at is not null
  )
  and (
    select count(*)
    from public.supplier_portal_submissions sps
    join public.p0_11_token_result tr on tr.supplier_request_id = sps.supplier_request_id
  ) = 1,
  'P0.11-LIFECYCLE-016 submission consumes the single-use token exactly once'
);

set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

do $test$
declare
  v_value text;
begin
  begin
    select public.verify_supplier_token(current_setting('p0_11.token'))::text
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('verify_after', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('verify_after', false, sqlstate, sqlerrm);
  end;

  begin
    select public.validate_supplier_token(current_setting('p0_11.token'))::text
    into v_value;

    insert into public.p0_11_lifecycle_outcomes(name, succeeded, value)
    values ('validate_after', true, v_value);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('validate_after', false, sqlstate, sqlerrm);
  end;

  begin
    perform public.submit_supplier_portal_submission(
      current_setting('p0_11.token'),
      '{"identity":{},"goods":{},"scope1":{},"scope2":{},"precursors":{},"carbon_price":{},"derived":{},"evidence_files":[]}'::jsonb
    );

    insert into public.p0_11_lifecycle_outcomes(name, succeeded)
    values ('submit_after', true);
  exception when others then
    insert into public.p0_11_lifecycle_outcomes(name, succeeded, sqlstate, message)
    values ('submit_after', false, sqlstate, sqlerrm);
  end;
end;
$test$;

reset role;

select ok(
  coalesce((
    select succeeded and value = 'false'
    from public.p0_11_lifecycle_outcomes
    where name = 'verify_after'
  ), false),
  'P0.11-LIFECYCLE-017 consumed token no longer verifies'
);

select ok(
  coalesce((
    select not succeeded
      and sqlstate = '22023'
      and message = 'Invalid or expired link.'
    from public.p0_11_lifecycle_outcomes
    where name = 'validate_after'
  ), false),
  'P0.11-LIFECYCLE-018 consumed token cannot be validated again'
);

select ok(
  coalesce((
    select not succeeded
      and sqlstate = '22023'
      and message = 'Invalid or expired link.'
    from public.p0_11_lifecycle_outcomes
    where name = 'submit_after'
  ), false),
  'P0.11-LIFECYCLE-019 consumed token cannot submit a second payload'
);

select is(
  (
    select count(*)::integer
    from public.supplier_portal_submissions sps
    join public.p0_11_token_result tr on tr.supplier_request_id = sps.supplier_request_id
  ),
  1,
  'P0.11-LIFECYCLE-020 lifecycle ends with exactly one immutable submission'
);

select * from finish();
rollback;
