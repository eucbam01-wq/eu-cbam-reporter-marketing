/* ============================================================================
   Phase 0 baseline freeze
   File: supabase/migrations/20260113013108_phase0_baseline.sql
   Scope: prod + staging
   ============================================================================ */

--------------------------------------------------------------------------------
-- a) Extensions
--------------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_stat_statements with schema extensions;

--------------------------------------------------------------------------------
-- b) Tables
--------------------------------------------------------------------------------
create table if not exists public.cn_codes (
  id uuid not null default gen_random_uuid(),
  cn_code text not null,
  product_category text,
  default_emission_factor numeric,
  unit text,
  valid_from date,
  valid_to date,
  constraint cn_codes_pkey primary key (id),
  constraint cn_codes_cn_code_key unique (cn_code)
);

create table if not exists public.cn_requirements (
  id uuid not null default gen_random_uuid(),
  cn_code text not null,
  field_key text not null,
  required boolean not null default true,
  default_value numeric,
  unit text,
  constraint cn_requirements_pkey primary key (id),
  constraint cn_req_unique unique (cn_code, field_key)
);

create table if not exists public.organizations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  type text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  eori_number text,
  national_competent_authority text,
  constraint organizations_pkey primary key (id),
  constraint organizations_eori_len_chk check (eori_number is null or char_length(eori_number) <= 17),
  constraint organizations_type_check check (type = any (array['forwarder'::text, 'importer'::text]))
);

create table if not exists public.memberships (
  user_id uuid not null,
  org_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  constraint memberships_pkey primary key (user_id, org_id),
  constraint memberships_role_check check (role = any (array['owner'::text, 'admin'::text, 'member'::text]))
);

create table if not exists public.forwarder_clients (
  forwarder_org_id uuid not null,
  importer_org_id uuid not null,
  status text not null default 'active'::text,
  created_at timestamptz not null default now(),
  constraint forwarder_clients_pkey primary key (forwarder_org_id, importer_org_id)
);

create table if not exists public.reports (
  id uuid not null default gen_random_uuid(),
  importer_org_id uuid not null,
  quarter_year text not null,
  status text not null default 'draft'::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_pkey primary key (id)
);

create table if not exists public.report_items (
  id uuid not null default gen_random_uuid(),
  report_id uuid not null,
  cn_code_id uuid not null,
  goods_description text,
  quantity numeric,
  net_mass_kg numeric,
  country_of_origin text,
  supplier_name text not null,
  supplier_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  procedure_code text default '4000'::text,
  cn_code text,
  constraint report_items_pkey primary key (id),
  constraint report_items_cn_code_len_chk check (cn_code is null or char_length(cn_code) = 8),
  constraint report_items_net_mass_nonneg_chk check (net_mass_kg is null or net_mass_kg >= 0::numeric),
  constraint report_items_procedure_code_len_chk check (procedure_code is null or (char_length(procedure_code) = any (array[2, 4])))
);

create table if not exists public.suppliers (
  id uuid not null default gen_random_uuid(),
  importer_org_id uuid not null,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  constraint suppliers_pkey primary key (id)
);

create table if not exists public.supplier_requests (
  id uuid not null default gen_random_uuid(),
  report_item_id uuid not null,
  supplier_id uuid not null,
  token_hash text not null,
  token_expires_at timestamptz not null,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'active'::text,
  created_at timestamptz not null default now(),
  report_id uuid,
  organization_id uuid,
  token text,
  expires_at timestamptz,
  constraint supplier_requests_pkey primary key (id),
  constraint supplier_requests_token_key unique (token),
  constraint supplier_requests_id_not_report_item_id check (id is distinct from report_item_id)
);

create table if not exists public.supplier_portal_submissions (
  id uuid not null default gen_random_uuid(),
  supplier_request_id uuid not null,
  payload jsonb not null,
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,
  constraint supplier_portal_submissions_pkey primary key (id)
);

create table if not exists public.supplier_emissions (
  id uuid not null default gen_random_uuid(),
  report_item_id uuid not null,
  methodology text,
  embedded_emissions_tco2e numeric,
  direct_emissions_tco2e numeric,
  indirect_emissions_tco2e numeric,
  electricity_mwh numeric,
  notes text,
  updated_by_supplier boolean not null default false,
  updated_at timestamptz not null default now(),
  precursor_emissions_tco2e numeric default 0,
  production_process_id text,
  direct_emissions numeric,
  indirect_emissions numeric,
  precursor_emissions numeric,
  constraint supplier_emissions_pkey primary key (id),
  constraint supplier_emissions_report_item_id_key unique (report_item_id)
);

--------------------------------------------------------------------------------
-- c) Foreign keys
--------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cn_requirements_cn_code_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.cn_requirements
      add constraint cn_requirements_cn_code_fkey foreign key (cn_code) references public.cn_codes(cn_code) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'forwarder_clients_forwarder_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.forwarder_clients
      add constraint forwarder_clients_forwarder_org_id_fkey foreign key (forwarder_org_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'forwarder_clients_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.forwarder_clients
      add constraint forwarder_clients_importer_org_id_fkey foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'memberships_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.memberships
      add constraint memberships_org_id_fkey foreign key (org_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'memberships_user_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.memberships
      add constraint memberships_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'organizations_created_by_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.organizations
      add constraint organizations_created_by_fkey foreign key (created_by) references auth.users(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'report_items_cn_code_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.report_items
      add constraint report_items_cn_code_id_fkey foreign key (cn_code_id) references public.cn_codes(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'report_items_report_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.report_items
      add constraint report_items_report_id_fkey foreign key (report_id) references public.reports(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'reports_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.reports
      add constraint reports_importer_org_id_fkey foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_emissions_report_item_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_emissions
      add constraint supplier_emissions_report_item_id_fkey foreign key (report_item_id) references public.report_items(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_portal_submissions_supplier_request_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_portal_submissions
      add constraint supplier_portal_submissions_supplier_request_id_fkey foreign key (supplier_request_id) references public.supplier_requests(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_requests_organization_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_requests
      add constraint supplier_requests_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_requests_report_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_requests
      add constraint supplier_requests_report_id_fkey foreign key (report_id) references public.reports(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_requests_report_item_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_requests
      add constraint supplier_requests_report_item_id_fkey foreign key (report_item_id) references public.report_items(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supplier_requests_supplier_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_requests
      add constraint supplier_requests_supplier_id_fkey foreign key (supplier_id) references public.suppliers(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'suppliers_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.suppliers
      add constraint suppliers_importer_org_id_fkey foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;
end $$;

--------------------------------------------------------------------------------
-- d) Indexes
--------------------------------------------------------------------------------
create index if not exists idx_cn_requirements_cn_code
  on public.cn_requirements using btree (cn_code);

create index if not exists supplier_portal_submissions_request_id_idx
  on public.supplier_portal_submissions using btree (supplier_request_id);

create index if not exists idx_supplier_requests_token
  on public.supplier_requests using btree (token);

create index if not exists supplier_requests_organization_id_idx
  on public.supplier_requests using btree (organization_id);

create index if not exists supplier_requests_report_id_idx
  on public.supplier_requests using btree (report_id);

create index if not exists supplier_requests_token_expires_idx
  on public.supplier_requests using btree (token_expires_at);

create index if not exists supplier_requests_token_hash_idx
  on public.supplier_requests using btree (token_hash);

--------------------------------------------------------------------------------
-- e) View
--------------------------------------------------------------------------------
create or replace view public.cn_required_fields as
select
  cn_code,
  field_key,
  required,
  default_value,
  unit
from public.cn_requirements;

--------------------------------------------------------------------------------
-- f) Functions
--------------------------------------------------------------------------------
-- P0.8 ordering note: function definitions below are dependency ordered so a fresh
-- database reset does not depend on disabling PostgreSQL function-body checks.
CREATE OR REPLACE FUNCTION public._cbam_assert(cond boolean, msg text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION '%', msg USING ERRCODE = '22023';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public._cbam_has_max_decimals(val numeric, max_decimals integer)
 RETURNS boolean
 LANGUAGE sql
AS $function$
  SELECT
    CASE
      WHEN val IS NULL THEN true
      ELSE
        (scale(val) <= max_decimals)
    END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.org_id = target_org
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_importer(target_importer uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_org_member(target_importer)
    or exists (
      select 1
      from public.memberships fm
      join public.forwarder_clients fc
        on fc.forwarder_org_id = fm.org_id
      where fm.user_id = auth.uid()
        and fc.importer_org_id = target_importer
        and fc.status = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.sha256_hex(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select md5(coalesce(p_text, ''));
$function$;

CREATE OR REPLACE FUNCTION public.supplier_portal_token()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select nullif(
    (current_setting('request.headers', true)::jsonb ->> 'x-supplier-token'),
    ''
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_supplier_request_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select sr.id
  from public.supplier_requests sr
  where sr.token_hash = public.sha256_hex(public.supplier_portal_token())
    and sr.token_expires_at > now()
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_supplier_request_active(req_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.supplier_requests r
    where r.id = req_id
      and r.revoked_at is null
      and r.status = 'active'
      and now() < r.token_expires_at
      and r.used_count < r.max_uses
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_cbam_supplier_payload_v1(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_identity jsonb;
  v_goods jsonb;
  v_scope1 jsonb;
  v_scope2 jsonb;
  v_precursors jsonb;
  v_carbon jsonb;
  v_derived jsonb;
  v_evidence jsonb;

  v_unlocode text;
  v_lat numeric;
  v_lng numeric;

  v_cn text;
  v_qty_tonnes numeric;

  v_scope1_total numeric;
  v_specific_direct numeric;

  v_scope2_source text;
  v_scope2_mwh numeric;
  v_scope2_factor numeric;
  v_has_scope2_evidence boolean;

  v_prec_used boolean;
BEGIN
  PERFORM public._cbam_assert(p_payload ? 'identity', 'payload.identity is required');
  PERFORM public._cbam_assert(p_payload ? 'goods', 'payload.goods is required');
  PERFORM public._cbam_assert(p_payload ? 'scope1', 'payload.scope1 is required');
  PERFORM public._cbam_assert(p_payload ? 'scope2', 'payload.scope2 is required');
  PERFORM public._cbam_assert(p_payload ? 'precursors', 'payload.precursors is required');
  PERFORM public._cbam_assert(p_payload ? 'carbon_price', 'payload.carbon_price is required');
  PERFORM public._cbam_assert(p_payload ? 'derived', 'payload.derived is required');
  PERFORM public._cbam_assert(p_payload ? 'evidence_files', 'payload.evidence_files is required');

  v_identity := p_payload->'identity';
  v_goods := p_payload->'goods';
  v_scope1 := p_payload->'scope1';
  v_scope2 := p_payload->'scope2';
  v_precursors := p_payload->'precursors';
  v_carbon := p_payload->'carbon_price';
  v_evidence := p_payload->'evidence_files';

  PERFORM public._cbam_assert(coalesce(nullif(v_identity->>'operator_legal_name',''), '') <> '', 'identity.operator_legal_name is required');
  PERFORM public._cbam_assert(coalesce(nullif(v_identity->>'installation_name',''), '') <> '', 'identity.installation_name is required');

  PERFORM public._cbam_assert((v_identity ? 'installation_address'), 'identity.installation_address is required');
  PERFORM public._cbam_assert(coalesce(nullif(v_identity#>>'{installation_address,street}',''), '') <> '', 'identity.installation_address.street is required');
  PERFORM public._cbam_assert(coalesce(nullif(v_identity#>>'{installation_address,city}',''), '') <> '', 'identity.installation_address.city is required');
  PERFORM public._cbam_assert(coalesce(nullif(v_identity#>>'{installation_address,country}',''), '') <> '', 'identity.installation_address.country is required');

  PERFORM public._cbam_assert(coalesce(nullif(v_identity->>'nace_code',''), '') <> '', 'identity.nace_code is required');
  PERFORM public._cbam_assert(length(v_identity->>'nace_code') = 4 AND (v_identity->>'nace_code') ~ '^[0-9]{4}$', 'identity.nace_code must be 4 digits');

  v_unlocode := nullif(v_identity->>'unlocode','');
  IF v_unlocode IS NULL THEN
    PERFORM public._cbam_assert((v_identity ? 'coordinates'), 'identity.coordinates required when identity.unlocode missing');
    v_lat := NULLIF(v_identity#>>'{coordinates,lat}', '')::numeric;
    v_lng := NULLIF(v_identity#>>'{coordinates,lng}', '')::numeric;

    PERFORM public._cbam_assert(v_lat IS NOT NULL AND v_lng IS NOT NULL, 'identity.coordinates.lat and .lng required when identity.unlocode missing');
    PERFORM public._cbam_assert(public._cbam_has_max_decimals(v_lat, 6), 'identity.coordinates.lat max 6 decimals');
    PERFORM public._cbam_assert(public._cbam_has_max_decimals(v_lng, 6), 'identity.coordinates.lng max 6 decimals');
  END IF;

  v_cn := nullif(v_goods->>'cn_code','');
  PERFORM public._cbam_assert(v_cn IS NOT NULL, 'goods.cn_code is required');
  PERFORM public._cbam_assert(v_cn ~ '^[0-9]{6,8}$', 'goods.cn_code must be 6-8 digits');

  PERFORM public._cbam_assert(coalesce(nullif(v_goods->>'trade_name',''), '') <> '', 'goods.trade_name is required');
  PERFORM public._cbam_assert(coalesce(nullif(v_goods->>'production_route',''), '') <> '', 'goods.production_route is required');

  v_qty_tonnes := NULLIF(v_goods->>'quantity_tonnes','')::numeric;
  PERFORM public._cbam_assert(v_qty_tonnes IS NOT NULL AND v_qty_tonnes > 0, 'goods.quantity_tonnes must be > 0');

  v_scope1_total := NULLIF(v_scope1->>'total_tco2e','')::numeric;
  PERFORM public._cbam_assert(v_scope1_total IS NOT NULL AND v_scope1_total >= 0, 'scope1.total_tco2e must be >= 0');
  PERFORM public._cbam_assert((v_scope1 ? 'source_streams'), 'scope1.source_streams is required (can be empty array)');
  PERFORM public._cbam_assert(jsonb_typeof(v_scope1->'source_streams') = 'array', 'scope1.source_streams must be array');

  v_specific_direct := v_scope1_total / v_qty_tonnes;

  v_scope2_mwh := NULLIF(v_scope2->>'electricity_mwh','')::numeric;
  PERFORM public._cbam_assert(v_scope2_mwh IS NOT NULL AND v_scope2_mwh >= 0, 'scope2.electricity_mwh must be >= 0');

  v_scope2_source := nullif(v_scope2->>'source_type','');
  PERFORM public._cbam_assert(v_scope2_source IN ('grid_average','actual'), 'scope2.source_type must be grid_average or actual');

  IF v_scope2_source = 'actual' THEN
    v_scope2_factor := NULLIF(v_scope2->>'emission_factor_tco2e_per_mwh','')::numeric;
    PERFORM public._cbam_assert(v_scope2_factor IS NOT NULL AND v_scope2_factor >= 0, 'scope2.emission_factor_tco2e_per_mwh required and must be >= 0 when source_type=actual');

    v_has_scope2_evidence := EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_evidence) AS e(item)
      WHERE coalesce(item->>'purpose','') = 'scope2_actual_evidence'
    );

    PERFORM public._cbam_assert(v_has_scope2_evidence, 'evidence_files must include purpose=scope2_actual_evidence when scope2.source_type=actual');
  END IF;

  v_prec_used := (v_precursors->>'used')::boolean;
  IF v_prec_used THEN
    PERFORM public._cbam_assert(jsonb_typeof(v_precursors->'items') = 'array', 'precursors.items must be array');
    PERFORM public._cbam_assert(jsonb_array_length(v_precursors->'items') > 0, 'precursors.items must have at least 1 row when used=true');
  END IF;

  IF coalesce(nullif(v_carbon->>'scheme_name',''), '') <> '' THEN
    PERFORM public._cbam_assert(coalesce(nullif(v_carbon->>'amount_paid',''), '') <> '', 'carbon_price.amount_paid required when scheme_name provided');
    PERFORM public._cbam_assert(coalesce(nullif(v_carbon->>'currency',''), '') <> '', 'carbon_price.currency required when scheme_name provided');
    PERFORM public._cbam_assert(coalesce(nullif(v_carbon->>'quantity_covered_tco2e',''), '') <> '', 'carbon_price.quantity_covered_tco2e required when scheme_name provided');
  END IF;

  v_derived := jsonb_build_object(
    'specific_direct_tco2e_per_tonne', to_jsonb(v_specific_direct)
  );

  RETURN jsonb_set(
           jsonb_set(p_payload, '{derived}', v_derived, true),
           '{_payload_version}', to_jsonb('v1'::text), true
         );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_supplier_token(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
declare
  v_req public.supplier_requests%rowtype;
  v_now timestamptz := now();
begin
  select *
  into v_req
  from public.supplier_requests
  where token_hash = md5(p_token)
     or token_hash = p_token;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.used_count,0) < coalesce(v_req.max_uses,1), 'Invalid or expired link.');

  return v_req.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_supplier_token(p_token text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.supplier_requests sr
    where sr.token_hash = md5(coalesce(p_token, ''))
      and sr.token_expires_at > now()
      and sr.status = 'active'
      and sr.revoked_at is null
      and sr.used_count < sr.max_uses
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_cn_requirements(p_cn_code text)
 RETURNS TABLE(field_key text, required boolean, default_value numeric, unit text)
 LANGUAGE sql
AS $function$
  select field_key, required, default_value, unit
  from cn_requirements
  where cn_code = p_cn_code
  order by field_key;
$function$;

CREATE OR REPLACE FUNCTION public.get_supplier_portal_context(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
declare
  v_req public.supplier_requests%rowtype;
  v_now timestamptz := now();
begin
  select *
  into v_req
  from public.supplier_requests
  where token_hash = md5(p_token);

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.used_count,0) < coalesce(v_req.max_uses,1), 'Invalid or expired link.');

  return jsonb_build_object(
    'supplier_request_id', v_req.id,
    'report_item_id', v_req.report_item_id,
    'supplier_id', v_req.supplier_id,
    'expires_at', v_req.expires_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_report_items_for_importer()
 RETURNS TABLE(report_item_id uuid, report_id uuid, cn_code text, goods_description text, supplier_name text, quantity numeric, net_mass_kg numeric, country_of_origin text, procedure_code text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    ri.id as report_item_id,
    ri.report_id,
    ri.cn_code,
    ri.goods_description,
    ri.supplier_name,
    ri.quantity,
    ri.net_mass_kg,
    ri.country_of_origin,
    ri.procedure_code
  from public.report_items ri
  join public.reports r on r.id = ri.report_id
  where public.can_access_importer(r.importer_org_id)
  order by ri.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.list_supplier_requests_for_importer()
 RETURNS TABLE(supplier_request_id uuid, report_id uuid, report_item_id uuid, supplier_id uuid, supplier_name text, supplier_email text, cn_code text, goods_description text, quantity numeric, net_mass_kg numeric, country_of_origin text, procedure_code text, status text, used_count integer, max_uses integer, last_used_at timestamp with time zone, revoked_at timestamp with time zone, expires_at timestamp with time zone, token_expires_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    sr.id as supplier_request_id,
    ri.report_id,
    sr.report_item_id,
    sr.supplier_id,
    coalesce(ri.supplier_name, s.name) as supplier_name,
    s.email as supplier_email,
    ri.cn_code,
    ri.goods_description,
    ri.quantity,
    ri.net_mass_kg,
    ri.country_of_origin,
    ri.procedure_code,
    sr.status,
    sr.used_count,
    sr.max_uses,
    sr.last_used_at,
    sr.revoked_at,
    sr.expires_at,
    sr.token_expires_at,
    sr.created_at
  from public.supplier_requests sr
  join public.report_items ri on ri.id = sr.report_item_id
  join public.reports r on r.id = ri.report_id
  left join public.suppliers s on s.id = sr.supplier_id
  where public.can_access_importer(r.importer_org_id);
$function$;

CREATE OR REPLACE FUNCTION public.list_supplier_submissions_for_importer(p_supplier_request_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(submission_id uuid, supplier_request_id uuid, submitted_at timestamp with time zone, scope2_source_type text, evidence_file_count integer, evidence_files jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    sps.id as submission_id,
    sps.supplier_request_id,
    sps.submitted_at,
    (sps.payload->'scope2'->>'source_type') as scope2_source_type,
    jsonb_array_length(coalesce(sps.payload->'evidence_files','[]'::jsonb))::int as evidence_file_count,
    sps.payload->'evidence_files' as evidence_files
  from public.supplier_portal_submissions sps
  join public.supplier_requests sr on sr.id = sps.supplier_request_id
  join public.report_items ri on ri.id = sr.report_item_id
  join public.reports r on r.id = ri.report_id
  where public.can_access_importer(r.importer_org_id)
    and (p_supplier_request_id is null or sps.supplier_request_id = p_supplier_request_id)
  order by sps.submitted_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.list_suppliers_for_importer()
 RETURNS TABLE(supplier_id uuid, supplier_name text, supplier_email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id as supplier_id,
    s.name as supplier_name,
    s.email as supplier_email
  from public.suppliers s
  where public.can_access_importer(s.importer_org_id)
  order by s.name asc;
$function$;

CREATE OR REPLACE FUNCTION public.create_supplier_portal_token_for_request(p_supplier_request_id uuid)
 RETURNS TABLE(plaintext_token text, full_url text, supplier_request_id uuid, token_hash text, expires_at timestamp with time zone, token_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_plaintext text;
  v_hash text;
  v_expires_at timestamptz;
  v_token_expires_at timestamptz;
begin
  perform 1
  from public.supplier_requests sr
  where sr.id = p_supplier_request_id
  for update;

  if not exists (
    select 1
    from public.supplier_requests sr
    where sr.id = p_supplier_request_id
      and sr.revoked_at is null
      and coalesce(sr.max_uses, 1) = 1
      and coalesce(sr.used_count, 0) = 0
      and (sr.expires_at is null or now() < sr.expires_at)
      and (sr.token_expires_at is null or now() < sr.token_expires_at)
  ) then
    raise exception 'supplier_request_id is not eligible for token issuance';
  end if;

  if exists (
    select 1
    from public.supplier_portal_submissions sps
    where sps.supplier_request_id = p_supplier_request_id
    limit 1
  ) then
    raise exception 'supplier_request_id already has a submission';
  end if;

  if exists (
    select 1
    from public.supplier_requests sr
    where sr.id = p_supplier_request_id
      and sr.token_hash is not null
    limit 1
  ) then
    raise exception 'token already issued for this supplier_request_id';
  end if;

  v_plaintext := encode(gen_random_bytes(16), 'hex');
  v_hash := md5(v_plaintext);
  v_expires_at := now() + interval '7 days';
  v_token_expires_at := v_expires_at;

  update public.supplier_requests sr
  set
    token_hash = v_hash,
    used_count = 0,
    revoked_at = null,
    last_used_at = null,
    expires_at = v_expires_at,
    token_expires_at = v_token_expires_at
  where sr.id = p_supplier_request_id;

  return query
  select
    v_plaintext as plaintext_token,
    'https://www.grandscope.ai/supplier/' || v_plaintext as full_url,
    p_supplier_request_id as supplier_request_id,
    v_hash as token_hash,
    v_expires_at as expires_at,
    v_token_expires_at as token_expires_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_supplier_request_with_token(p_report_item_id uuid, p_supplier_id uuid)
 RETURNS TABLE(plaintext_token text, full_url text, supplier_request_id uuid, token_hash text, expires_at timestamp with time zone, token_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_plaintext text;
  v_hash text;
  v_expires_at timestamptz;
  v_token_expires_at timestamptz;
  v_id uuid;
begin
  v_plaintext := encode(gen_random_bytes(16), 'hex');
  v_hash := md5(v_plaintext);
  v_expires_at := now() + interval '7 days';
  v_token_expires_at := v_expires_at;

  insert into public.supplier_requests (
    report_item_id,
    supplier_id,
    token_hash,
    max_uses,
    used_count,
    status,
    expires_at,
    token_expires_at
  )
  values (
    p_report_item_id,
    p_supplier_id,
    v_hash,
    1,
    0,
    'active',
    v_expires_at,
    v_token_expires_at
  )
  returning id into v_id;

  return query
  select
    v_plaintext as plaintext_token,
    'https://www.grandscope.ai/supplier/' || v_plaintext as full_url,
    v_id as supplier_request_id,
    v_hash as token_hash,
    v_expires_at as expires_at,
    v_token_expires_at as token_expires_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_supplier_portal_submission(p_token text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_req public.supplier_requests%rowtype;
  v_token_hash text;
  v_now timestamptz := now();
  v_sub_id uuid;
begin
  v_token_hash := md5(p_token);

  select *
  into v_req
  from public.supplier_requests r
  where r.token_hash = v_token_hash
  for update;

  perform public._cbam_assert(found, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.revoked_at is null, 'Invalid or expired link.');
  perform public._cbam_assert(coalesce(v_req.status,'') = 'active', 'Invalid or expired link.');
  perform public._cbam_assert(v_req.token_expires_at is null or v_req.token_expires_at > v_now, 'Invalid or expired link.');
  perform public._cbam_assert(v_req.expires_at is null or v_req.expires_at > v_now, 'Invalid or expired link.');

  perform public._cbam_assert(
    coalesce(v_req.used_count,0) < coalesce(v_req.max_uses,1),
    'Supplier token usage limit exceeded'
  );

  perform public.validate_cbam_supplier_payload_v1(p_payload);

  insert into public.supplier_portal_submissions (supplier_request_id, payload, submitted_at)
  values (v_req.id, p_payload, v_now)
  returning id into v_sub_id;

  update public.supplier_requests
  set
    used_count = coalesce(used_count,0) + 1,
    last_used_at = v_now,
    status = case
      when (coalesce(used_count,0) + 1) >= coalesce(max_uses,1) then 'used'
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

CREATE OR REPLACE FUNCTION public.attach_supplier_evidence_files_to_submission()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_source_type text;
  v_obj record;
begin
  v_source_type := lower(coalesce(new.payload->'scope2'->>'source_type',''));

  if v_source_type <> 'actual' then
    new.payload := new.payload - 'evidence_files';
    return new;
  end if;

  select
    o.name as path,
    o.bucket_id as bucket,
    o.created_at,
    o.metadata->>'mimetype' as mimetype,
    (o.metadata->>'size')::bigint as size
  into v_obj
  from storage.objects o
  where o.bucket_id = 'supplier-evidence'
    and o.name like (new.supplier_request_id::text || '/%')
  order by o.created_at desc
  limit 1;

  if v_obj.path is null then
    raise exception 'Scope2 actual requires evidence file in storage before submission';
  end if;

  new.payload := jsonb_set(
    coalesce(new.payload, '{}'::jsonb),
    '{evidence_files}',
    jsonb_build_array(
      jsonb_build_object(
        'purpose','scope2_actual_evidence',
        'bucket', v_obj.bucket,
        'path', v_obj.path,
        'created_at', to_jsonb(v_obj.created_at),
        'mimetype', v_obj.mimetype,
        'size', v_obj.size
      )
    ),
    true
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.backfill_supplier_submission_evidence_files(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
 SET row_security TO 'off'
AS $function$
declare
  v_supplier_request_id uuid;
  v_files_json jsonb;
begin
  select s.supplier_request_id
    into v_supplier_request_id
  from public.supplier_portal_submissions s
  where s.id = p_submission_id;

  if v_supplier_request_id is null then
    raise exception 'submission not found: %', p_submission_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'purpose', 'scope2_actual_evidence',
        'bucket', o.bucket_id,
        'path', o.name,
        'created_at', o.created_at,
        'mimetype', coalesce(o.metadata->>'mimetype', null),
        'size', coalesce((o.metadata->>'size')::int, null)
      )
      order by o.created_at asc
    ),
    '[]'::jsonb
  )
  into v_files_json
  from storage.objects o
  where o.bucket_id = 'supplier-evidence'
    and o.name like (v_supplier_request_id::text || '/%');

  update public.supplier_portal_submissions s
  set payload = jsonb_set(
    coalesce(s.payload, '{}'::jsonb),
    '{evidence_files}',
    v_files_json,
    true
  )
  where s.id = p_submission_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_carbon_price_rebate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.payload->'carbon_price'->>'rebate_or_free_allocation' = 'REBATE' then
    if new.payload->'carbon_price'->>'rebate_amount' is null then
      raise exception 'Carbon price rebate selected but rebate_amount is missing';
    end if;

    if new.payload->'carbon_price'->>'currency' = 'OTHER'
       and new.payload->'carbon_price'->>'currency_other' is null then
      raise exception 'Currency OTHER requires currency_other field';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_no_storage_evidence_when_scope2_not_actual()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_source_type text;
  v_cnt int;
begin
  v_source_type := lower(coalesce(new.payload->'scope2'->>'source_type',''));

  if v_source_type <> 'actual' then
    select count(*)
    into v_cnt
    from storage.objects o
    where o.bucket_id = 'supplier-evidence'
      and o.name like (new.supplier_request_id::text || '/%');

    if v_cnt > 0 then
      raise exception 'Scope2 not actual: evidence file exists in storage for this supplier_request_id';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_precursor_items()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  item jsonb;
begin
  if (new.payload->'precursors'->>'used')::boolean = true then
    if jsonb_array_length(new.payload->'precursors'->'items') = 0 then
      raise exception 'Precursors marked as used but no items provided';
    end if;

    for item in
      select * from jsonb_array_elements(new.payload->'precursors'->'items')
    loop
      if item->>'cn_code' is null
         or item->>'quantity_tonnes' is null
         or item->>'embedded_emissions_tco2e_per_tonne' is null then
        raise exception 'Each precursor item must include CN code, quantity, and embedded emissions';
      end if;
    end loop;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_scope2_actual_requirements()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_source_type text;
  v_has_evidence boolean;
begin
  v_source_type := new.payload->'scope2'->>'source_type';

  if lower(coalesce(v_source_type, '')) = 'actual' or v_source_type = 'ACTUAL_PPA' then
    select exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'supplier-evidence'
        and o.name like (new.supplier_request_id::text || '/%')
      limit 1
    ) into v_has_evidence;

    if not v_has_evidence then
      raise exception 'Scope2 actual requires at least one evidence PDF uploaded before submission';
    end if;
  end if;

  if v_source_type = 'ACTUAL_PPA' then
    if new.payload->'scope2'->>'emission_factor_tco2e_per_mwh' is null
       or new.payload->'scope2'->>'evidence' is null
       or new.payload->'scope2'->'evidence'->>'uploaded' <> 'true' then
      raise exception 'Scope2 Actual (PPA) requires emission factor and evidence upload';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_scope2_evidence_storage_single_object()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_source_type text;
  v_cnt int;
begin
  v_source_type := lower(coalesce(new.payload->'scope2'->>'source_type',''));

  if v_source_type = 'actual' then
    select count(*)
    into v_cnt
    from storage.objects o
    where o.bucket_id = 'supplier-evidence'
      and o.name like (new.supplier_request_id::text || '/%');

    if v_cnt > 1 then
      raise exception 'Invariant violation: more than one evidence object exists in storage for this supplier_request_id';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_single_scope2_evidence_file()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_count int;
begin
  if new.payload->'scope2'->>'source_type' = 'actual' then
    v_count := coalesce(jsonb_array_length(new.payload->'evidence_files'), 0);

    if v_count > 1 then
      raise exception 'Invariant violation: more than one Scope2 evidence file attached';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_supplier_token_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_used int;
  v_max int;
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
  perform public._cbam_assert(coalesce(v_status,'') = 'active', 'Invalid or expired link.');
  perform public._cbam_assert(v_token_expires_at is null or v_token_expires_at > now(), 'Invalid or expired link.');
  perform public._cbam_assert(v_expires_at is null or v_expires_at > now(), 'Invalid or expired link.');

  v_used := coalesce(v_used, 0);
  v_max := coalesce(v_max, 1);

  perform public._cbam_assert(v_used < v_max, 'Supplier token usage limit exceeded');

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_evidence_mutation_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.payload->'evidence_files' is distinct from old.payload->'evidence_files' then
    raise exception 'Evidence files are immutable after submission';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_report_item_supplier_name_from_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_req public.supplier_requests%rowtype;
  v_name text;
begin
  select *
  into v_req
  from public.supplier_requests
  where id = new.supplier_request_id;

  if not found then
    return new;
  end if;

  v_name := nullif(btrim(coalesce(new.payload->'contact'->>'name','')), '');
  if v_name is null then
    v_name := nullif(btrim(coalesce(new.payload->'identity'->>'operator_legal_name','')), '');
  end if;

  if v_name is not null then
    update public.report_items
    set supplier_name = v_name
    where id = v_req.report_item_id;
  end if;

  return new;
end;
$function$;

--------------------------------------------------------------------------------
-- g) Triggers
--------------------------------------------------------------------------------
drop trigger if exists trg_attach_supplier_evidence_files_to_submission on public.supplier_portal_submissions;
create trigger trg_attach_supplier_evidence_files_to_submission
after insert on public.supplier_portal_submissions
for each row execute function public.attach_supplier_evidence_files_to_submission();

drop trigger if exists trg_enforce_carbon_price on public.supplier_portal_submissions;
create trigger trg_enforce_carbon_price
before insert on public.supplier_portal_submissions
for each row execute function public.enforce_carbon_price_rebate();

drop trigger if exists trg_enforce_no_storage_evidence_when_scope2_not_actual on public.supplier_portal_submissions;
create trigger trg_enforce_no_storage_evidence_when_scope2_not_actual
after insert on public.supplier_portal_submissions
for each row execute function public.enforce_no_storage_evidence_when_scope2_not_actual();

drop trigger if exists trg_enforce_precursors on public.supplier_portal_submissions;
create trigger trg_enforce_precursors
before insert on public.supplier_portal_submissions
for each row execute function public.enforce_precursor_items();

drop trigger if exists trg_enforce_scope2_actual on public.supplier_portal_submissions;
create trigger trg_enforce_scope2_actual
before insert on public.supplier_portal_submissions
for each row execute function public.enforce_scope2_actual_requirements();

drop trigger if exists trg_enforce_scope2_evidence_storage_single_object on public.supplier_portal_submissions;
create trigger trg_enforce_scope2_evidence_storage_single_object
after insert on public.supplier_portal_submissions
for each row execute function public.enforce_scope2_evidence_storage_single_object();

drop trigger if exists trg_enforce_single_scope2_evidence_file on public.supplier_portal_submissions;
create trigger trg_enforce_single_scope2_evidence_file
after insert on public.supplier_portal_submissions
for each row execute function public.enforce_single_scope2_evidence_file();

drop trigger if exists trg_enforce_supplier_token_usage on public.supplier_portal_submissions;
create trigger trg_enforce_supplier_token_usage
after insert on public.supplier_portal_submissions
for each row execute function public.enforce_supplier_token_usage();

drop trigger if exists trg_prevent_evidence_mutation_after_insert on public.supplier_portal_submissions;
create trigger trg_prevent_evidence_mutation_after_insert
before update on public.supplier_portal_submissions
for each row execute function public.prevent_evidence_mutation_after_insert();

drop trigger if exists trg_sync_supplier_name on public.supplier_portal_submissions;
create trigger trg_sync_supplier_name
after insert on public.supplier_portal_submissions
for each row execute function public.sync_report_item_supplier_name_from_submission();

--------------------------------------------------------------------------------
-- h) RLS enablement
--------------------------------------------------------------------------------
alter table public.cn_codes enable row level security;
alter table public.forwarder_clients enable row level security;
alter table public.memberships enable row level security;
alter table public.organizations enable row level security;
alter table public.report_items enable row level security;
alter table public.reports enable row level security;
alter table public.supplier_emissions enable row level security;
alter table public.supplier_portal_submissions enable row level security;
alter table public.supplier_requests enable row level security;
alter table public.suppliers enable row level security;
-- cn_requirements remains without RLS enabled in baseline

--------------------------------------------------------------------------------
-- i) Public RLS policies
--------------------------------------------------------------------------------
drop policy if exists cn_codes_read_all on public.cn_codes;
create policy cn_codes_read_all
on public.cn_codes
as permissive
for select
to authenticated
using (true);

drop policy if exists forwarder_clients_select_member on public.forwarder_clients;
create policy forwarder_clients_select_member
on public.forwarder_clients
as permissive
for select
to authenticated
using (is_org_member(forwarder_org_id) OR is_org_member(importer_org_id));

drop policy if exists memberships_select_self on public.memberships;
create policy memberships_select_self
on public.memberships
as permissive
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists org_select_member on public.organizations;
create policy org_select_member
on public.organizations
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where (m.user_id = auth.uid() and m.org_id = organizations.id)
  )
);

drop policy if exists report_items_delete_importer_only on public.report_items;
create policy report_items_delete_importer_only
on public.report_items
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.reports r
    where (r.id = report_items.report_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists report_items_mutate_importer_only on public.report_items;
create policy report_items_mutate_importer_only
on public.report_items
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reports r
    where (r.id = report_items.report_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists report_items_no_direct_delete on public.report_items;
create policy report_items_no_direct_delete
on public.report_items
as permissive
for delete
to public
using (false);

drop policy if exists report_items_no_direct_write on public.report_items;
create policy report_items_no_direct_write
on public.report_items
as permissive
for update
to public
using (false)
with check (false);

drop policy if exists report_items_select_access on public.report_items;
create policy report_items_select_access
on public.report_items
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.reports r
    where (r.id = report_items.report_id and can_access_importer(r.importer_org_id))
  )
);

drop policy if exists report_items_update_importer_only on public.report_items;
create policy report_items_update_importer_only
on public.report_items
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.reports r
    where (r.id = report_items.report_id and is_org_member(r.importer_org_id))
  )
)
with check (
  exists (
    select 1
    from public.reports r
    where (r.id = report_items.report_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists reports_delete_importer_only on public.reports;
create policy reports_delete_importer_only
on public.reports
as permissive
for delete
to authenticated
using (is_org_member(importer_org_id));

drop policy if exists reports_mutate_importer_only on public.reports;
create policy reports_mutate_importer_only
on public.reports
as permissive
for insert
to authenticated
with check (is_org_member(importer_org_id));

drop policy if exists reports_select_access on public.reports;
create policy reports_select_access
on public.reports
as permissive
for select
to authenticated
using (can_access_importer(importer_org_id));

drop policy if exists reports_update_importer_only on public.reports;
create policy reports_update_importer_only
on public.reports
as permissive
for update
to authenticated
using (is_org_member(importer_org_id))
with check (is_org_member(importer_org_id));

drop policy if exists supplier_emissions_select_access on public.supplier_emissions;
create policy supplier_emissions_select_access
on public.supplier_emissions
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_emissions.report_item_id and can_access_importer(r.importer_org_id))
  )
);

drop policy if exists supplier_emissions_update_importer_only on public.supplier_emissions;
create policy supplier_emissions_update_importer_only
on public.supplier_emissions
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_emissions.report_item_id and is_org_member(r.importer_org_id))
  )
)
with check (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_emissions.report_item_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists "Allow Public Insert for Portal Submissions" on public.supplier_portal_submissions;
create policy "Allow Public Insert for Portal Submissions"
on public.supplier_portal_submissions
as permissive
for insert
to anon, authenticated
with check (true);

drop policy if exists "allow supplier insert via rpc" on public.supplier_portal_submissions;
create policy "allow supplier insert via rpc"
on public.supplier_portal_submissions
as permissive
for insert
to public
with check (true);

drop policy if exists supplier_portal_submissions_insert_with_token on public.supplier_portal_submissions;
create policy supplier_portal_submissions_insert_with_token
on public.supplier_portal_submissions
as permissive
for insert
to anon
with check (supplier_request_id = current_supplier_request_id());

drop policy if exists supplier_portal_submissions_no_direct_access on public.supplier_portal_submissions;
create policy supplier_portal_submissions_no_direct_access
on public.supplier_portal_submissions
as permissive
for select
to public
using (false);

drop policy if exists supplier_portal_submissions_no_direct_delete on public.supplier_portal_submissions;
create policy supplier_portal_submissions_no_direct_delete
on public.supplier_portal_submissions
as permissive
for delete
to public
using (false);

drop policy if exists supplier_portal_submissions_no_direct_insert on public.supplier_portal_submissions;
create policy supplier_portal_submissions_no_direct_insert
on public.supplier_portal_submissions
as permissive
for insert
to public
with check (false);

drop policy if exists supplier_portal_submissions_no_direct_update on public.supplier_portal_submissions;
create policy supplier_portal_submissions_no_direct_update
on public.supplier_portal_submissions
as permissive
for update
to public
using (false);

drop policy if exists supplier_token_insert_submission on public.supplier_portal_submissions;
create policy supplier_token_insert_submission
on public.supplier_portal_submissions
as permissive
for insert
to authenticated
with check (
  ((auth.jwt() ->> 'role'::text) = 'supplier_token'::text)
  and (supplier_request_id = ((auth.jwt() ->> 'supplier_request_id'::text))::uuid)
  and is_supplier_request_active(supplier_request_id)
);

drop policy if exists supplier_requests_mutate_importer_only on public.supplier_requests;
create policy supplier_requests_mutate_importer_only
on public.supplier_requests
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_requests.report_item_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists supplier_requests_no_direct_access on public.supplier_requests;
create policy supplier_requests_no_direct_access
on public.supplier_requests
as permissive
for select
to public
using (false);

drop policy if exists supplier_requests_select_access on public.supplier_requests;
create policy supplier_requests_select_access
on public.supplier_requests
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_requests.report_item_id and can_access_importer(r.importer_org_id))
  )
);

drop policy if exists supplier_requests_update_importer_only on public.supplier_requests;
create policy supplier_requests_update_importer_only
on public.supplier_requests
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_requests.report_item_id and is_org_member(r.importer_org_id))
  )
)
with check (
  exists (
    select 1
    from (public.report_items i join public.reports r on (r.id = i.report_id))
    where (i.id = supplier_requests.report_item_id and is_org_member(r.importer_org_id))
  )
);

drop policy if exists suppliers_delete_importer_only on public.suppliers;
create policy suppliers_delete_importer_only
on public.suppliers
as permissive
for delete
to authenticated
using (is_org_member(importer_org_id));

drop policy if exists suppliers_mutate_importer_only on public.suppliers;
create policy suppliers_mutate_importer_only
on public.suppliers
as permissive
for insert
to authenticated
with check (is_org_member(importer_org_id));

drop policy if exists suppliers_select_access on public.suppliers;
create policy suppliers_select_access
on public.suppliers
as permissive
for select
to authenticated
using (can_access_importer(importer_org_id));

drop policy if exists suppliers_update_importer_only on public.suppliers;
create policy suppliers_update_importer_only
on public.suppliers
as permissive
for update
to authenticated
using (is_org_member(importer_org_id))
with check (is_org_member(importer_org_id));

--------------------------------------------------------------------------------
-- j) Storage bucket row + storage policies
--------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('supplier-evidence', 'supplier-evidence', false)
on conflict (id) do update
set name = excluded.name, public = excluded.public;


drop policy if exists "Importer can read supplier evidence" on storage.objects;
create policy "Importer can read supplier evidence"
on storage.objects
as permissive
for select
to authenticated
using ((bucket_id = 'supplier-evidence'::text));

drop policy if exists "Importer can read supplier evidence objects" on storage.objects;
create policy "Importer can read supplier evidence objects"
on storage.objects
as permissive
for select
to authenticated
using ((bucket_id = 'supplier-evidence'::text));

drop policy if exists "service delete supplier evidence" on storage.objects;
create policy "service delete supplier evidence"
on storage.objects
as permissive
for delete
to service_role
using ((bucket_id = 'supplier-evidence'::text));

drop policy if exists "service read supplier evidence" on storage.objects;
create policy "service read supplier evidence"
on storage.objects
as permissive
for select
to service_role
using ((bucket_id = 'supplier-evidence'::text));

drop policy if exists "supplier evidence upload" on storage.objects;
create policy "supplier evidence upload"
on storage.objects
as permissive
for insert
to anon
with check ((bucket_id = 'supplier-evidence'::text));
