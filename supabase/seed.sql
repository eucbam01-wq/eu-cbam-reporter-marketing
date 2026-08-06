/* ============================================================================
   GrandScope P0.10 deterministic local seed
   Local development and automated test use only.

   Phase 0 represents legal entities with public.organizations. This seed creates
   two importer legal entities, six login personas covering every membership
   role, suppliers, report items used as import lines, supplier requests,
   submissions, evidence metadata, and emissions records.
   ============================================================================ */

begin;

--------------------------------------------------------------------------------
-- 1. Supabase Auth personas
--------------------------------------------------------------------------------
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
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'p010.alpha.owner@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:00:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alpha Owner","persona":"alpha_owner","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:00:00+00',
    '2025-10-01 09:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'p010.alpha.admin@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:01:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alpha Admin","persona":"alpha_admin","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:01:00+00',
    '2025-10-01 09:01:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'p010.alpha.member@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:02:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alpha Member","persona":"alpha_member","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:02:00+00',
    '2025-10-01 09:02:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'p010.beta.owner@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:03:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Beta Owner","persona":"beta_owner","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:03:00+00',
    '2025-10-01 09:03:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'p010.beta.admin@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:04:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Beta Admin","persona":"beta_admin","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:04:00+00',
    '2025-10-01 09:04:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    'p010.beta.member@grandscope.test',
    '$2a$10$4RqNgDgCIdTppRCK9nC0GuMQAAJXE7N.HunoIJnSBdvrErIysENqC',
    '2025-10-01 09:05:00+00',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Beta Member","persona":"beta_member","seed_task":"P0.10"}'::jsonb,
    '2025-10-01 09:05:00+00',
    '2025-10-01 09:05:00+00'
  )
on conflict (id) do update
set
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  email_change = excluded.email_change,
  email_change_token_new = excluded.email_change_token_new,
  recovery_token = excluded.recovery_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  user_id,
  provider,
  provider_id,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'email',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"p010.alpha.owner@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:00:00+00',
    '2025-10-01 09:00:00+00',
    '2025-10-01 09:00:00+00'
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'email',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"p010.alpha.admin@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:01:00+00',
    '2025-10-01 09:01:00+00',
    '2025-10-01 09:01:00+00'
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'email',
    '10000000-0000-4000-8000-000000000003',
    '{"sub":"10000000-0000-4000-8000-000000000003","email":"p010.alpha.member@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:02:00+00',
    '2025-10-01 09:02:00+00',
    '2025-10-01 09:02:00+00'
  ),
  (
    '11000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'email',
    '10000000-0000-4000-8000-000000000004',
    '{"sub":"10000000-0000-4000-8000-000000000004","email":"p010.beta.owner@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:03:00+00',
    '2025-10-01 09:03:00+00',
    '2025-10-01 09:03:00+00'
  ),
  (
    '11000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'email',
    '10000000-0000-4000-8000-000000000005',
    '{"sub":"10000000-0000-4000-8000-000000000005","email":"p010.beta.admin@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:04:00+00',
    '2025-10-01 09:04:00+00',
    '2025-10-01 09:04:00+00'
  ),
  (
    '11000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000006',
    'email',
    '10000000-0000-4000-8000-000000000006',
    '{"sub":"10000000-0000-4000-8000-000000000006","email":"p010.beta.member@grandscope.test","email_verified":true,"phone_verified":false}'::jsonb,
    '2025-10-01 09:05:00+00',
    '2025-10-01 09:05:00+00',
    '2025-10-01 09:05:00+00'
  )
on conflict do nothing;

--------------------------------------------------------------------------------
-- 2. Importer legal entities and memberships
--------------------------------------------------------------------------------
insert into public.organizations (
  id,
  name,
  type,
  created_by,
  created_at,
  eori_number,
  national_competent_authority
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'GrandScope Test Importer Alpha Ltd',
    'importer',
    '10000000-0000-4000-8000-000000000001',
    '2025-10-01 10:00:00+00',
    'GB123456789000',
    'UK HMRC'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'GrandScope Test Importer Beta Ltd',
    'importer',
    '10000000-0000-4000-8000-000000000004',
    '2025-10-01 10:05:00+00',
    'GB987654321000',
    'UK HMRC'
  )
on conflict (id) do update
set
  name = excluded.name,
  type = excluded.type,
  created_by = excluded.created_by,
  created_at = excluded.created_at,
  eori_number = excluded.eori_number,
  national_competent_authority = excluded.national_competent_authority;

insert into public.memberships (user_id, org_id, role, created_at)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'owner',  '2025-10-01 10:10:00+00'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'admin',  '2025-10-01 10:11:00+00'),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'member', '2025-10-01 10:12:00+00'),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'owner',  '2025-10-01 10:13:00+00'),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'admin',  '2025-10-01 10:14:00+00'),
  ('10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'member', '2025-10-01 10:15:00+00')
on conflict (user_id, org_id) do update
set
  role = excluded.role,
  created_at = excluded.created_at;

--------------------------------------------------------------------------------
-- 3. Reference CN data
--------------------------------------------------------------------------------
insert into public.cn_codes (
  id,
  cn_code,
  product_category,
  default_emission_factor,
  unit,
  valid_from,
  valid_to
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '73089000',
    'Iron and steel structures',
    2.150000,
    'tCO2e/t',
    '2025-01-01',
    '2099-12-31'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '76042990',
    'Aluminium alloy bars',
    8.600000,
    'tCO2e/t',
    '2025-01-01',
    '2099-12-31'
  )
on conflict (cn_code) do update
set
  id = excluded.id,
  product_category = excluded.product_category,
  default_emission_factor = excluded.default_emission_factor,
  unit = excluded.unit,
  valid_from = excluded.valid_from,
  valid_to = excluded.valid_to;

insert into public.cn_requirements (id, cn_code, field_key, required, default_value, unit)
values
  ('31000000-0000-4000-8000-000000000001', '73089000', 'scope1.total_tco2e', true, null, 'tCO2e'),
  ('31000000-0000-4000-8000-000000000002', '73089000', 'scope2.electricity_mwh', true, null, 'MWh'),
  ('31000000-0000-4000-8000-000000000003', '76042990', 'scope1.total_tco2e', true, null, 'tCO2e'),
  ('31000000-0000-4000-8000-000000000004', '76042990', 'scope2.electricity_mwh', true, null, 'MWh')
on conflict (cn_code, field_key) do update
set
  id = excluded.id,
  required = excluded.required,
  default_value = excluded.default_value,
  unit = excluded.unit;

--------------------------------------------------------------------------------
-- 4. Reports and report items used as repeatable import lines
--------------------------------------------------------------------------------
insert into public.reports (
  id,
  importer_org_id,
  quarter_year,
  status,
  metadata,
  created_at,
  updated_at
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '2025-Q4',
    'in_review',
    '{"seed_task":"P0.10","fixture":"imports-test-2025Q4.csv","legal_entity":"GrandScope Test Importer Alpha Ltd"}'::jsonb,
    '2025-10-02 08:00:00+00',
    '2025-10-02 08:00:00+00'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '2025-Q4',
    'in_review',
    '{"seed_task":"P0.10","fixture":"imports-test-2025Q4.csv","legal_entity":"GrandScope Test Importer Beta Ltd"}'::jsonb,
    '2025-10-02 08:05:00+00',
    '2025-10-02 08:05:00+00'
  )
on conflict (id) do update
set
  importer_org_id = excluded.importer_org_id,
  quarter_year = excluded.quarter_year,
  status = excluded.status,
  metadata = excluded.metadata,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.suppliers (id, importer_org_id, name, email, created_at)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Hebei Green Steel Co. Ltd', 'alpha.steel.supplier@grandscope.test', '2025-10-02 09:00:00+00'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Anatolia Aluminium AS', 'alpha.aluminium.supplier@grandscope.test', '2025-10-02 09:01:00+00'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Hebei Green Steel Co. Ltd', 'beta.steel.supplier@grandscope.test', '2025-10-02 09:02:00+00'),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Anatolia Aluminium AS', 'beta.aluminium.supplier@grandscope.test', '2025-10-02 09:03:00+00')
on conflict (id) do update
set
  importer_org_id = excluded.importer_org_id,
  name = excluded.name,
  email = excluded.email,
  created_at = excluded.created_at;

insert into public.report_items (
  id,
  report_id,
  cn_code_id,
  goods_description,
  quantity,
  net_mass_kg,
  country_of_origin,
  supplier_name,
  supplier_reference,
  created_at,
  updated_at,
  procedure_code,
  cn_code
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Steel structures and parts',
    1000,
    540,
    'CN',
    'Hebei Green Steel Co. Ltd',
    'GS-730890-A',
    '2025-10-02 10:00:00+00',
    '2025-10-02 10:00:00+00',
    '40',
    '73089000'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'Aluminium alloy bars',
    500,
    270,
    'TR',
    'Anatolia Aluminium AS',
    'AL-760429-A',
    '2025-10-02 10:01:00+00',
    '2025-10-02 10:01:00+00',
    '40',
    '76042990'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'Steel structures and parts',
    750,
    405,
    'CN',
    'Hebei Green Steel Co. Ltd',
    'GS-730890-B',
    '2025-10-02 10:02:00+00',
    '2025-10-02 10:02:00+00',
    '40',
    '73089000'
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'Aluminium alloy bars',
    320,
    175,
    'TR',
    'Anatolia Aluminium AS',
    'AL-760429-B',
    '2025-10-02 10:03:00+00',
    '2025-10-02 10:03:00+00',
    '40',
    '76042990'
  )
on conflict (id) do update
set
  report_id = excluded.report_id,
  cn_code_id = excluded.cn_code_id,
  goods_description = excluded.goods_description,
  quantity = excluded.quantity,
  net_mass_kg = excluded.net_mass_kg,
  country_of_origin = excluded.country_of_origin,
  supplier_name = excluded.supplier_name,
  supplier_reference = excluded.supplier_reference,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  procedure_code = excluded.procedure_code,
  cn_code = excluded.cn_code;

--------------------------------------------------------------------------------
-- 5. Supplier requests, evidence metadata, and submissions
--------------------------------------------------------------------------------
insert into public.supplier_requests (
  id,
  report_item_id,
  supplier_id,
  token_hash,
  token_expires_at,
  max_uses,
  used_count,
  last_used_at,
  revoked_at,
  status,
  created_at,
  report_id,
  organization_id,
  token,
  expires_at
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    public.supplier_token_sha256('p010-alpha-submitted-token'),
    '2099-12-31 23:59:59+00',
    1,
    0,
    null,
    null,
    'active',
    '2025-10-03 08:00:00+00',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    '2099-12-31 23:59:59+00'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    public.supplier_token_sha256('p010-alpha-active-token'),
    '2099-12-31 23:59:59+00',
    1,
    0,
    null,
    null,
    'active',
    '2025-10-03 08:01:00+00',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    '2099-12-31 23:59:59+00'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000003',
    public.supplier_token_sha256('p010-beta-submitted-token'),
    '2099-12-31 23:59:59+00',
    1,
    0,
    null,
    null,
    'active',
    '2025-10-03 08:02:00+00',
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    null,
    '2099-12-31 23:59:59+00'
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000004',
    '50000000-0000-4000-8000-000000000004',
    public.supplier_token_sha256('p010-beta-active-token'),
    '2099-12-31 23:59:59+00',
    1,
    0,
    null,
    null,
    'active',
    '2025-10-03 08:03:00+00',
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    null,
    '2099-12-31 23:59:59+00'
  )
on conflict (id) do update
set
  report_item_id = excluded.report_item_id,
  supplier_id = excluded.supplier_id,
  token_hash = excluded.token_hash,
  token_expires_at = excluded.token_expires_at,
  max_uses = excluded.max_uses,
  used_count = excluded.used_count,
  last_used_at = excluded.last_used_at,
  revoked_at = excluded.revoked_at,
  status = excluded.status,
  created_at = excluded.created_at,
  report_id = excluded.report_id,
  organization_id = excluded.organization_id,
  token = excluded.token,
  expires_at = excluded.expires_at;

insert into storage.objects (
  id,
  bucket_id,
  name,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'supplier-evidence',
    '70000000-0000-4000-8000-000000000001/scope2-actual-evidence.pdf',
    '2025-10-03 08:10:00+00',
    '2025-10-03 08:10:00+00',
    '2025-10-03 08:10:00+00',
    '{"mimetype":"application/pdf","size":24576,"original_name":"alpha-scope2-actual-evidence.pdf","seed_task":"P0.10","sha256":"a8c841acf755288f0fd26edf67f49d8f9b6b65d314e48e7f3b981e4012bff1a8"}'::jsonb
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'supplier-evidence',
    '70000000-0000-4000-8000-000000000003/scope2-actual-evidence.pdf',
    '2025-10-03 08:11:00+00',
    '2025-10-03 08:11:00+00',
    '2025-10-03 08:11:00+00',
    '{"mimetype":"application/pdf","size":28672,"original_name":"beta-scope2-actual-evidence.pdf","seed_task":"P0.10","sha256":"de53a7aeb8820da58d3fabfca83aa14d35da46aeaf0ea24ca6bf0b26dd641e74"}'::jsonb
  )
on conflict (bucket_id, name) do update
set
  id = excluded.id,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  last_accessed_at = excluded.last_accessed_at,
  metadata = excluded.metadata;

insert into public.supplier_portal_submissions (
  id,
  supplier_request_id,
  payload,
  submitted_at,
  processed_at,
  processed_by
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    public.validate_cbam_supplier_payload_v1(
      $json$
      {
        "contact": {
          "name": "Hebei Green Steel Co. Ltd",
          "email": "alpha.steel.supplier@grandscope.test"
        },
        "identity": {
          "operator_legal_name": "Hebei Green Steel Co. Ltd",
          "installation_name": "Shijiazhuang Steel Fabrication Plant",
          "installation_address": {
            "street": "88 Industrial Road",
            "city": "Shijiazhuang",
            "country": "CN"
          },
          "nace_code": "2511",
          "unlocode": "CNSJW"
        },
        "goods": {
          "cn_code": "73089000",
          "trade_name": "Steel structures and parts",
          "production_route": "Integrated steel fabrication",
          "quantity_tonnes": 0.540
        },
        "scope1": {
          "total_tco2e": 0.810,
          "source_streams": [
            {
              "name": "Natural gas combustion",
              "quantity": 1500,
              "unit": "Nm3",
              "emissions_tco2e": 0.810
            }
          ]
        },
        "scope2": {
          "electricity_mwh": 1.250,
          "source_type": "actual",
          "emission_factor_tco2e_per_mwh": 0.540
        },
        "precursors": {
          "used": false,
          "items": []
        },
        "carbon_price": {
          "scheme_name": "China ETS",
          "amount_paid": 120.00,
          "currency": "CNY",
          "quantity_covered_tco2e": 0.300
        },
        "derived": {},
        "evidence_files": [
          {
            "purpose": "scope2_actual_evidence",
            "bucket": "supplier-evidence",
            "path": "70000000-0000-4000-8000-000000000001/scope2-actual-evidence.pdf",
            "created_at": "2025-10-03T08:10:00Z",
            "mimetype": "application/pdf",
            "size": 24576,
            "sha256": "a8c841acf755288f0fd26edf67f49d8f9b6b65d314e48e7f3b981e4012bff1a8"
          }
        ]
      }
      $json$::jsonb
    ),
    '2025-10-03 08:15:00+00',
    '2025-10-03 08:20:00+00',
    'seed:P0.10'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000003',
    public.validate_cbam_supplier_payload_v1(
      $json$
      {
        "contact": {
          "name": "Hebei Green Steel Co. Ltd",
          "email": "beta.steel.supplier@grandscope.test"
        },
        "identity": {
          "operator_legal_name": "Hebei Green Steel Co. Ltd",
          "installation_name": "Tangshan Steel Components Plant",
          "installation_address": {
            "street": "18 Port Industry Avenue",
            "city": "Tangshan",
            "country": "CN"
          },
          "nace_code": "2511",
          "unlocode": "CNTGS"
        },
        "goods": {
          "cn_code": "73089000",
          "trade_name": "Steel structures and parts",
          "production_route": "Electric arc furnace and fabrication",
          "quantity_tonnes": 0.405
        },
        "scope1": {
          "total_tco2e": 0.486,
          "source_streams": [
            {
              "name": "Process fuel",
              "quantity": 900,
              "unit": "Nm3",
              "emissions_tco2e": 0.486
            }
          ]
        },
        "scope2": {
          "electricity_mwh": 0.900,
          "source_type": "actual",
          "emission_factor_tco2e_per_mwh": 0.480
        },
        "precursors": {
          "used": true,
          "items": [
            {
              "cn_code": "72071210",
              "quantity_tonnes": 0.300,
              "embedded_emissions_tco2e_per_tonne": 1.250
            }
          ]
        },
        "carbon_price": {
          "scheme_name": "China ETS",
          "amount_paid": 95.00,
          "currency": "CNY",
          "quantity_covered_tco2e": 0.250
        },
        "derived": {},
        "evidence_files": [
          {
            "purpose": "scope2_actual_evidence",
            "bucket": "supplier-evidence",
            "path": "70000000-0000-4000-8000-000000000003/scope2-actual-evidence.pdf",
            "created_at": "2025-10-03T08:11:00Z",
            "mimetype": "application/pdf",
            "size": 28672,
            "sha256": "de53a7aeb8820da58d3fabfca83aa14d35da46aeaf0ea24ca6bf0b26dd641e74"
          }
        ]
      }
      $json$::jsonb
    ),
    '2025-10-03 08:16:00+00',
    '2025-10-03 08:21:00+00',
    'seed:P0.10'
  )
on conflict (id) do update
set
  supplier_request_id = excluded.supplier_request_id,
  payload = excluded.payload,
  submitted_at = excluded.submitted_at,
  processed_at = excluded.processed_at,
  processed_by = excluded.processed_by;

update public.supplier_requests
set
  used_count = 1,
  last_used_at = case
    when id = '70000000-0000-4000-8000-000000000001' then '2025-10-03 08:15:00+00'::timestamptz
    else '2025-10-03 08:16:00+00'::timestamptz
  end,
  status = 'used'
where id in (
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000003'
);

--------------------------------------------------------------------------------
-- 6. Emissions records linked to every import line
--------------------------------------------------------------------------------
insert into public.supplier_emissions (
  id,
  report_item_id,
  methodology,
  embedded_emissions_tco2e,
  direct_emissions_tco2e,
  indirect_emissions_tco2e,
  electricity_mwh,
  notes,
  updated_by_supplier,
  updated_at,
  precursor_emissions_tco2e,
  production_process_id,
  direct_emissions,
  indirect_emissions,
  precursor_emissions
)
values
  ('a0000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'supplier_actual', 1.860, 0.810, 0.675, 1.250, 'Validated P0.10 supplier submission with evidence metadata.', true,  '2025-10-03 08:20:00+00', 0.375, 'steel-fabrication-alpha', 0.810, 0.675, 0.375),
  ('a0000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'default_factor', 2.322, 1.161, 1.161, null, 'Awaiting supplier response.', false, '2025-10-03 08:21:00+00', 0.000, 'aluminium-bars-alpha', 1.161, 1.161, 0.000),
  ('a0000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', 'supplier_actual', 1.293, 0.486, 0.432, 0.900, 'Validated P0.10 supplier submission with precursor and evidence metadata.', true,  '2025-10-03 08:22:00+00', 0.375, 'steel-fabrication-beta', 0.486, 0.432, 0.375),
  ('a0000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', 'default_factor', 1.505, 0.7525, 0.7525, null, 'Awaiting supplier response.', false, '2025-10-03 08:23:00+00', 0.000, 'aluminium-bars-beta', 0.7525, 0.7525, 0.000)
on conflict (report_item_id) do update
set
  id = excluded.id,
  methodology = excluded.methodology,
  embedded_emissions_tco2e = excluded.embedded_emissions_tco2e,
  direct_emissions_tco2e = excluded.direct_emissions_tco2e,
  indirect_emissions_tco2e = excluded.indirect_emissions_tco2e,
  electricity_mwh = excluded.electricity_mwh,
  notes = excluded.notes,
  updated_by_supplier = excluded.updated_by_supplier,
  updated_at = excluded.updated_at,
  precursor_emissions_tco2e = excluded.precursor_emissions_tco2e,
  production_process_id = excluded.production_process_id,
  direct_emissions = excluded.direct_emissions,
  indirect_emissions = excluded.indirect_emissions,
  precursor_emissions = excluded.precursor_emissions;

--------------------------------------------------------------------------------
-- 7. Seed integrity gate. Any failure aborts supabase db reset.
--------------------------------------------------------------------------------
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from auth.users
  where id::text like '10000000-0000-4000-8000-00000000000%';
  if v_count <> 6 then
    raise exception 'P0.10 expected 6 auth personas, found %', v_count;
  end if;

  select count(*) into v_count
  from auth.identities
  where user_id::text like '10000000-0000-4000-8000-00000000000%'
    and provider = 'email';
  if v_count <> 6 then
    raise exception 'P0.10 expected 6 email identities, found %', v_count;
  end if;

  select count(*) into v_count
  from public.organizations
  where id in (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  )
    and type = 'importer'
    and eori_number is not null;
  if v_count <> 2 then
    raise exception 'P0.10 expected 2 importer legal entities, found %', v_count;
  end if;

  select count(distinct role) into v_count
  from public.memberships
  where user_id::text like '10000000-0000-4000-8000-00000000000%'
    and role in ('owner', 'admin', 'member');
  if v_count <> 3 then
    raise exception 'P0.10 expected owner, admin, and member roles';
  end if;

  select count(*) into v_count
  from public.suppliers
  where id::text like '50000000-0000-4000-8000-00000000000%';
  if v_count <> 4 then
    raise exception 'P0.10 expected 4 suppliers, found %', v_count;
  end if;

  select count(*) into v_count
  from public.report_items
  where id::text like '60000000-0000-4000-8000-00000000000%';
  if v_count <> 4 then
    raise exception 'P0.10 expected 4 import lines, found %', v_count;
  end if;

  select count(*) into v_count
  from public.supplier_portal_submissions
  where id in (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002'
  )
    and jsonb_array_length(coalesce(payload->'evidence_files', '[]'::jsonb)) = 1;
  if v_count <> 2 then
    raise exception 'P0.10 expected 2 submissions with evidence metadata, found %', v_count;
  end if;

  select count(*) into v_count
  from public.supplier_requests
  where id::text like '70000000-0000-4000-8000-00000000000%'
    and token_hash ~ '^[0-9a-f]{64}$'
    and token is null;
  if v_count <> 4 then
    raise exception 'P0.11 expected 4 SHA-256 supplier token hashes with no plaintext token, found %', v_count;
  end if;

  select count(*) into v_count
  from storage.objects
  where id in (
    '90000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000002'
  )
    and bucket_id = 'supplier-evidence'
    and metadata->>'mimetype' = 'application/pdf';
  if v_count <> 2 then
    raise exception 'P0.10 expected 2 storage evidence metadata rows, found %', v_count;
  end if;
end $$;

commit;
