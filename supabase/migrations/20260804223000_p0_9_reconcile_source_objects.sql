/* ============================================================================
   P0.9 Reconcile source references against database objects
   Generated from linked public schema dump:
   Development/P0.9/schema-source/p0.9-linked-public-schema.sql
   Scope: referenced application objects, dependencies, RLS, grants and RPCs
   ============================================================================ */

begin;

--------------------------------------------------------------------------------
-- 1) Compatibility columns and membership role values present in live schema
--------------------------------------------------------------------------------

alter table public.legal_entities
  add column if not exists eori text;

alter table public.suppliers
  add column if not exists default_language text;

alter table public.memberships
  drop constraint if exists memberships_role_check;

alter table public.memberships
  add constraint memberships_role_check
  check (role = any (array[
    'owner'::text,
    'admin'::text,
    'member'::text,
    'forwarder_admin'::text,
    'forwarder_member'::text
  ]));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'legal_entities_eori_format_chk'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.legal_entities
      add constraint legal_entities_eori_format_chk
      check (eori is null or eori ~ '^[A-Z]{2}[A-Z0-9]{1,15}$');
  end if;
end
$$;

--------------------------------------------------------------------------------
-- 2) Referenced tables and supporting tables recovered from linked schema
--------------------------------------------------------------------------------

create table if not exists public.cbam_alerts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  alert_type text not null,
  severity text not null,
  message text not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  delivered_in_app boolean not null default false,
  delivered_email boolean not null default false,
  constraint cbam_alerts_alert_type_check
    check (alert_type = any (array['deadline'::text, 'missing_data'::text])),
  constraint cbam_alerts_severity_check
    check (severity = any (array['info'::text, 'warning'::text, 'critical'::text]))
);

create table if not exists public.cbam_audit_log (
  id uuid not null default gen_random_uuid(),
  event_time timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text,
  importer_org_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  prev_event_hash text,
  event_hash text not null
);

create table if not exists public.emissions_calculation_logs (
  id uuid not null default gen_random_uuid(),
  report_item_id uuid not null,
  source text not null,
  calculation_payload jsonb not null,
  calculated_values jsonb not null,
  calculated_at timestamptz not null default now(),
  inputs_hash text,
  formula_version text,
  actor text
);

create table if not exists public.eu_ets_prices (
  id uuid not null default gen_random_uuid(),
  year integer not null,
  price_per_tonne_eur numeric not null,
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cbam_certificate_purchases (
  id uuid not null default gen_random_uuid(),
  importer_org_id uuid not null,
  purchase_date date not null,
  year integer not null,
  certificates_purchased numeric not null,
  unit_price_eur numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint cbam_certificate_purchases_certificates_purchased_check
    check (certificates_purchased >= 0::numeric),
  constraint cbam_certificate_purchases_unit_price_eur_check
    check (unit_price_eur is null or unit_price_eur >= 0::numeric)
);

create table if not exists public.cbam_risk_scores (
  id uuid not null default gen_random_uuid(),
  importer_org_id uuid not null,
  report_id uuid,
  quarter_year text,
  risk_score integer not null,
  risk_band text not null,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint cbam_risk_scores_risk_band_check
    check (risk_band = any (array['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  constraint cbam_risk_scores_risk_score_check
    check (risk_score >= 0 and risk_score <= 100)
);

create table if not exists public.imports (
  id uuid not null default gen_random_uuid(),
  importer_org_id uuid not null,
  import_ref text,
  import_date date
);

create table if not exists public.import_lines (
  id uuid not null default gen_random_uuid(),
  import_id uuid not null,
  importer_org_id uuid not null,
  product_sku text not null,
  cn_code text not null,
  quantity numeric,
  net_mass_kg numeric,
  customs_value_eur numeric,
  country_of_origin text,
  procedure_code text,
  supplier_id uuid,
  supplier_portal_submission_id uuid not null,
  constraint import_lines_cn_code_format_check
    check (cn_code ~ '^[0-9]{6,8}$')
);

create table if not exists public.invite_audit (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  invited_email text not null,
  invited_user_id uuid,
  invited_role text not null,
  invited_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_entity_addresses (
  legal_entity_id uuid not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text,
  postal_code text,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_entity_addresses_country_code_chk
    check (country_code ~ '^[A-Z]{2}$')
);

create table if not exists public.supplier_request_campaigns (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  created_by uuid not null,
  name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  constraint supplier_request_campaigns_status_check
    check (status = any (array['draft'::text, 'active'::text, 'paused'::text, 'completed'::text]))
);

create table if not exists public.supplier_request_campaign_items (
  id uuid not null default gen_random_uuid(),
  campaign_id uuid not null,
  supplier_request_id uuid not null,
  last_sent_at timestamptz,
  reminder_count integer not null default 0,
  escalated_at timestamptz
);

alter table public.cbam_alerts owner to postgres;
alter table public.cbam_audit_log owner to postgres;
alter table public.emissions_calculation_logs owner to postgres;
alter table public.eu_ets_prices owner to postgres;
alter table public.cbam_certificate_purchases owner to postgres;
alter table public.cbam_risk_scores owner to postgres;
alter table public.imports owner to postgres;
alter table public.import_lines owner to postgres;
alter table public.invite_audit owner to postgres;
alter table public.legal_entity_addresses owner to postgres;
alter table public.supplier_request_campaigns owner to postgres;
alter table public.supplier_request_campaign_items owner to postgres;

--------------------------------------------------------------------------------
-- 3) Keys and foreign keys, guarded for repeatability
--------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cbam_alerts_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.cbam_alerts add constraint cbam_alerts_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cbam_audit_log_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.cbam_audit_log add constraint cbam_audit_log_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'emissions_calculation_logs_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.emissions_calculation_logs add constraint emissions_calculation_logs_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eu_ets_prices_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.eu_ets_prices add constraint eu_ets_prices_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eu_ets_prices_year_key' and connamespace = 'public'::regnamespace) then
    alter table public.eu_ets_prices add constraint eu_ets_prices_year_key unique (year);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cbam_certificate_purchases_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.cbam_certificate_purchases add constraint cbam_certificate_purchases_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cbam_certificate_purchases_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.cbam_certificate_purchases
      add constraint cbam_certificate_purchases_importer_org_id_fkey
      foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cbam_risk_scores_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.cbam_risk_scores add constraint cbam_risk_scores_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'imports_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.imports add constraint imports_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'imports_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.imports
      add constraint imports_importer_org_id_fkey
      foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'import_lines_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.import_lines add constraint import_lines_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'import_lines_import_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.import_lines
      add constraint import_lines_import_id_fkey
      foreign key (import_id) references public.imports(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'import_lines_importer_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.import_lines
      add constraint import_lines_importer_org_id_fkey
      foreign key (importer_org_id) references public.organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'import_lines_supplier_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.import_lines
      add constraint import_lines_supplier_id_fkey
      foreign key (supplier_id) references public.suppliers(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'import_lines_supplier_portal_submission_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.import_lines
      add constraint import_lines_supplier_portal_submission_id_fkey
      foreign key (supplier_portal_submission_id) references public.supplier_portal_submissions(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invite_audit_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.invite_audit add constraint invite_audit_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invite_audit_org_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.invite_audit
      add constraint invite_audit_org_id_fkey
      foreign key (org_id) references public.organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'legal_entity_addresses_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.legal_entity_addresses add constraint legal_entity_addresses_pkey primary key (legal_entity_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'legal_entity_addresses_legal_entity_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.legal_entity_addresses
      add constraint legal_entity_addresses_legal_entity_id_fkey
      foreign key (legal_entity_id) references public.legal_entities(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_request_campaigns_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_request_campaigns add constraint supplier_request_campaigns_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_request_campaign_items_pkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_request_campaign_items add constraint supplier_request_campaign_items_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_request_campaign_items_campaign_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_request_campaign_items
      add constraint supplier_request_campaign_items_campaign_id_fkey
      foreign key (campaign_id) references public.supplier_request_campaigns(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_request_campaign_items_supplier_request_id_fkey' and connamespace = 'public'::regnamespace) then
    alter table public.supplier_request_campaign_items
      add constraint supplier_request_campaign_items_supplier_request_id_fkey
      foreign key (supplier_request_id) references public.supplier_requests(id) on delete cascade;
  end if;
end
$$;

--------------------------------------------------------------------------------
-- 4) Indexes
--------------------------------------------------------------------------------

create index if not exists cbam_audit_log_org_time_idx
  on public.cbam_audit_log (importer_org_id, event_time desc);
create index if not exists cbam_risk_scores_org_created_idx
  on public.cbam_risk_scores (importer_org_id, created_at desc);
create index if not exists cbam_risk_scores_report_created_idx
  on public.cbam_risk_scores (report_id, created_at desc);
create unique index if not exists emissions_calculation_logs_unique_calc
  on public.emissions_calculation_logs (report_item_id, source, calculated_at);
create index if not exists imports_importer_org_id_import_date_idx
  on public.imports (importer_org_id, import_date);
create index if not exists import_lines_import_id_idx
  on public.import_lines (import_id);
create index if not exists import_lines_importer_org_id_cn_code_idx
  on public.import_lines (importer_org_id, cn_code);
create index if not exists legal_entity_addresses_country_code_idx
  on public.legal_entity_addresses (country_code);
create index if not exists supplier_request_campaign_items_campaign_id_idx
  on public.supplier_request_campaign_items (campaign_id);
create index if not exists supplier_request_campaign_items_request_id_idx
  on public.supplier_request_campaign_items (supplier_request_id);

--------------------------------------------------------------------------------
-- 5) Authorization helpers and update trigger
--------------------------------------------------------------------------------

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.org_id = target_org
      and m.role in ('owner', 'admin')
  );
$$;

alter function public.is_org_admin(uuid) owner to postgres;
revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.set_updated_at() owner to postgres;

--------------------------------------------------------------------------------
-- 6) RLS and source-operation policies
--------------------------------------------------------------------------------

alter table public.cbam_alerts enable row level security;
alter table public.cbam_audit_log enable row level security;
alter table public.emissions_calculation_logs enable row level security;
alter table public.eu_ets_prices enable row level security;
alter table public.cbam_certificate_purchases enable row level security;
alter table public.cbam_risk_scores enable row level security;
alter table public.imports enable row level security;
alter table public.import_lines enable row level security;
alter table public.invite_audit enable row level security;
alter table public.legal_entity_addresses enable row level security;
alter table public.supplier_request_campaigns enable row level security;
alter table public.supplier_request_campaign_items enable row level security;
alter table public.legal_entities enable row level security;
alter table public.memberships enable row level security;
alter table public.supplier_portal_submissions enable row level security;

alter table public.supplier_request_campaigns force row level security;
alter table public.supplier_request_campaign_items force row level security;

drop policy if exists cbam_alerts_select_access on public.cbam_alerts;
create policy cbam_alerts_select_access
on public.cbam_alerts for select to authenticated
using (public.can_access_importer(org_id));

drop policy if exists cbam_audit_log_select_access on public.cbam_audit_log;
create policy cbam_audit_log_select_access
on public.cbam_audit_log for select to authenticated
using (importer_org_id is null or public.can_access_importer(importer_org_id));

drop policy if exists cbam_audit_log_no_update on public.cbam_audit_log;
create policy cbam_audit_log_no_update
on public.cbam_audit_log for update to public
using (false) with check (false);

drop policy if exists cbam_audit_log_no_delete on public.cbam_audit_log;
create policy cbam_audit_log_no_delete
on public.cbam_audit_log for delete to public
using (false);

drop policy if exists emissions_calculation_logs_select_access on public.emissions_calculation_logs;
create policy emissions_calculation_logs_select_access
on public.emissions_calculation_logs for select to authenticated
using (
  exists (
    select 1
    from public.report_items ri
    join public.reports r on r.id = ri.report_id
    where ri.id = emissions_calculation_logs.report_item_id
      and public.can_access_importer(r.importer_org_id)
  )
);

drop policy if exists eu_ets_prices_select_all on public.eu_ets_prices;
create policy eu_ets_prices_select_all
on public.eu_ets_prices for select to anon, authenticated
using (true);

drop policy if exists cbam_certificate_purchases_select_access on public.cbam_certificate_purchases;
create policy cbam_certificate_purchases_select_access
on public.cbam_certificate_purchases for select to authenticated
using (public.can_access_importer(importer_org_id));

drop policy if exists cbam_certificate_purchases_insert_member on public.cbam_certificate_purchases;
create policy cbam_certificate_purchases_insert_member
on public.cbam_certificate_purchases for insert to authenticated
with check (public.is_org_member(importer_org_id));

drop policy if exists cbam_certificate_purchases_update_member on public.cbam_certificate_purchases;
create policy cbam_certificate_purchases_update_member
on public.cbam_certificate_purchases for update to authenticated
using (public.is_org_member(importer_org_id))
with check (public.is_org_member(importer_org_id));

drop policy if exists cbam_certificate_purchases_delete_member on public.cbam_certificate_purchases;
create policy cbam_certificate_purchases_delete_member
on public.cbam_certificate_purchases for delete to authenticated
using (public.is_org_member(importer_org_id));

drop policy if exists cbam_risk_scores_select_access on public.cbam_risk_scores;
create policy cbam_risk_scores_select_access
on public.cbam_risk_scores for select to authenticated
using (public.can_access_importer(importer_org_id));

drop policy if exists imports_select_access on public.imports;
create policy imports_select_access
on public.imports for select to authenticated
using (public.can_access_importer(importer_org_id));

drop policy if exists imports_insert_member on public.imports;
create policy imports_insert_member
on public.imports for insert to authenticated
with check (public.is_org_member(importer_org_id));

drop policy if exists imports_update_member on public.imports;
create policy imports_update_member
on public.imports for update to authenticated
using (public.is_org_member(importer_org_id))
with check (public.is_org_member(importer_org_id));

drop policy if exists imports_delete_member on public.imports;
create policy imports_delete_member
on public.imports for delete to authenticated
using (public.is_org_member(importer_org_id));

drop policy if exists import_lines_select_access on public.import_lines;
create policy import_lines_select_access
on public.import_lines for select to authenticated
using (public.can_access_importer(importer_org_id));

drop policy if exists import_lines_insert_member on public.import_lines;
create policy import_lines_insert_member
on public.import_lines for insert to authenticated
with check (public.is_org_member(importer_org_id));

drop policy if exists import_lines_update_member on public.import_lines;
create policy import_lines_update_member
on public.import_lines for update to authenticated
using (public.is_org_member(importer_org_id))
with check (public.is_org_member(importer_org_id));

drop policy if exists import_lines_delete_member on public.import_lines;
create policy import_lines_delete_member
on public.import_lines for delete to authenticated
using (public.is_org_member(importer_org_id));

drop policy if exists invite_audit_select_admin on public.invite_audit;
create policy invite_audit_select_admin
on public.invite_audit for select to authenticated
using (public.is_org_admin(org_id));

drop policy if exists legal_entities_select_group_member on public.legal_entities;
create policy legal_entities_select_group_member
on public.legal_entities for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists legal_entities_insert_group_member on public.legal_entities;
create policy legal_entities_insert_group_member
on public.legal_entities for insert to authenticated
with check (public.is_group_member(group_id));

drop policy if exists legal_entities_update_group_member on public.legal_entities;
create policy legal_entities_update_group_member
on public.legal_entities for update to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

drop policy if exists legal_entities_delete_group_member on public.legal_entities;
create policy legal_entities_delete_group_member
on public.legal_entities for delete to authenticated
using (public.is_group_member(group_id));

drop policy if exists legal_entity_addresses_select_group_member on public.legal_entity_addresses;
create policy legal_entity_addresses_select_group_member
on public.legal_entity_addresses for select to authenticated
using (
  exists (
    select 1 from public.legal_entities le
    where le.id = legal_entity_addresses.legal_entity_id
      and public.is_group_member(le.group_id)
  )
);

drop policy if exists legal_entity_addresses_insert_group_member on public.legal_entity_addresses;
create policy legal_entity_addresses_insert_group_member
on public.legal_entity_addresses for insert to authenticated
with check (
  exists (
    select 1 from public.legal_entities le
    where le.id = legal_entity_addresses.legal_entity_id
      and public.is_group_member(le.group_id)
  )
);

drop policy if exists legal_entity_addresses_update_group_member on public.legal_entity_addresses;
create policy legal_entity_addresses_update_group_member
on public.legal_entity_addresses for update to authenticated
using (
  exists (
    select 1 from public.legal_entities le
    where le.id = legal_entity_addresses.legal_entity_id
      and public.is_group_member(le.group_id)
  )
)
with check (
  exists (
    select 1 from public.legal_entities le
    where le.id = legal_entity_addresses.legal_entity_id
      and public.is_group_member(le.group_id)
  )
);

drop policy if exists legal_entity_addresses_delete_group_member on public.legal_entity_addresses;
create policy legal_entity_addresses_delete_group_member
on public.legal_entity_addresses for delete to authenticated
using (
  exists (
    select 1 from public.legal_entities le
    where le.id = legal_entity_addresses.legal_entity_id
      and public.is_group_member(le.group_id)
  )
);

drop policy if exists memberships_select_org_admin on public.memberships;
create policy memberships_select_org_admin
on public.memberships for select to authenticated
using (user_id = auth.uid() or public.is_org_admin(org_id));

drop policy if exists memberships_update_org_admin on public.memberships;
create policy memberships_update_org_admin
on public.memberships for update to authenticated
using (public.is_org_admin(org_id) and user_id <> auth.uid())
with check (public.is_org_admin(org_id) and user_id <> auth.uid());

drop policy if exists memberships_delete_org_admin on public.memberships;
create policy memberships_delete_org_admin
on public.memberships for delete to authenticated
using (public.is_org_admin(org_id) and user_id <> auth.uid());

drop policy if exists supplier_portal_submissions_select_importer on public.supplier_portal_submissions;
create policy supplier_portal_submissions_select_importer
on public.supplier_portal_submissions for select to authenticated
using (
  exists (
    select 1
    from public.supplier_requests sr
    where sr.id = supplier_portal_submissions.supplier_request_id
      and public.can_access_importer(sr.organization_id)
  )
);

drop policy if exists supplier_request_campaigns_select_importer on public.supplier_request_campaigns;
create policy supplier_request_campaigns_select_importer
on public.supplier_request_campaigns for select to authenticated
using (public.can_access_importer(organization_id));

drop policy if exists supplier_request_campaigns_insert_importer on public.supplier_request_campaigns;
create policy supplier_request_campaigns_insert_importer
on public.supplier_request_campaigns for insert to authenticated
with check (public.is_org_admin(organization_id) and created_by = auth.uid());

drop policy if exists supplier_request_campaigns_update_importer on public.supplier_request_campaigns;
create policy supplier_request_campaigns_update_importer
on public.supplier_request_campaigns for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists supplier_request_campaigns_delete_importer on public.supplier_request_campaigns;
create policy supplier_request_campaigns_delete_importer
on public.supplier_request_campaigns for delete to authenticated
using (public.is_org_admin(organization_id));

drop policy if exists supplier_request_campaign_items_select_importer on public.supplier_request_campaign_items;
create policy supplier_request_campaign_items_select_importer
on public.supplier_request_campaign_items for select to authenticated
using (
  exists (
    select 1 from public.supplier_request_campaigns c
    where c.id = supplier_request_campaign_items.campaign_id
      and public.can_access_importer(c.organization_id)
  )
);

drop policy if exists supplier_request_campaign_items_insert_importer on public.supplier_request_campaign_items;
create policy supplier_request_campaign_items_insert_importer
on public.supplier_request_campaign_items for insert to authenticated
with check (
  exists (
    select 1 from public.supplier_request_campaigns c
    where c.id = supplier_request_campaign_items.campaign_id
      and public.is_org_admin(c.organization_id)
  )
);

drop policy if exists supplier_request_campaign_items_update_importer on public.supplier_request_campaign_items;
create policy supplier_request_campaign_items_update_importer
on public.supplier_request_campaign_items for update to authenticated
using (
  exists (
    select 1 from public.supplier_request_campaigns c
    where c.id = supplier_request_campaign_items.campaign_id
      and public.is_org_admin(c.organization_id)
  )
)
with check (
  exists (
    select 1 from public.supplier_request_campaigns c
    where c.id = supplier_request_campaign_items.campaign_id
      and public.is_org_admin(c.organization_id)
  )
);

drop policy if exists supplier_request_campaign_items_delete_importer on public.supplier_request_campaign_items;
create policy supplier_request_campaign_items_delete_importer
on public.supplier_request_campaign_items for delete to authenticated
using (
  exists (
    select 1 from public.supplier_request_campaigns c
    where c.id = supplier_request_campaign_items.campaign_id
      and public.is_org_admin(c.organization_id)
  )
);

--------------------------------------------------------------------------------
-- 7) Address update trigger
--------------------------------------------------------------------------------

drop trigger if exists trg_legal_entity_addresses_set_updated_at on public.legal_entity_addresses;
create trigger trg_legal_entity_addresses_set_updated_at
before update on public.legal_entity_addresses
for each row execute function public.set_updated_at();

--------------------------------------------------------------------------------
-- 8) Referenced RPCs recovered from linked schema with explicit caller gates
--------------------------------------------------------------------------------

create or replace function public.create_supplier_request_campaign_from_requests(
  p_name text,
  p_supplier_request_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_org_id uuid;
  v_campaign_id uuid;
  v_missing integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select m.org_id
  into v_org_id
  from public.memberships m
  where m.user_id = auth.uid()
    and m.role in ('owner', 'admin')
  order by m.created_at desc
  limit 1;

  if v_org_id is null then
    raise exception 'forbidden';
  end if;

  if coalesce(cardinality(p_supplier_request_ids), 0) = 0 then
    raise exception 'supplier_request_ids_required';
  end if;

  select count(*)
  into v_missing
  from unnest(p_supplier_request_ids) x(id)
  left join public.supplier_requests sr
    on sr.id = x.id
   and sr.organization_id = v_org_id
  where sr.id is null;

  if v_missing > 0 then
    raise exception 'supplier_request_not_in_org';
  end if;

  insert into public.supplier_request_campaigns (
    organization_id,
    created_by,
    name,
    status
  )
  values (
    v_org_id,
    auth.uid(),
    nullif(btrim(p_name), ''),
    'draft'
  )
  returning id into v_campaign_id;

  insert into public.supplier_request_campaign_items (campaign_id, supplier_request_id)
  select v_campaign_id, x.id
  from unnest(p_supplier_request_ids) x(id);

  return v_campaign_id;
end;
$$;

alter function public.create_supplier_request_campaign_from_requests(text, uuid[]) owner to postgres;

create or replace function public.get_legal_entity_address(p_legal_entity_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select to_jsonb(a)
  from public.legal_entity_addresses a
  join public.legal_entities le on le.id = a.legal_entity_id
  where a.legal_entity_id = p_legal_entity_id
    and public.is_group_member(le.group_id);
$$;

alter function public.get_legal_entity_address(uuid) owner to postgres;

create or replace function public.issue_supplier_request_campaign_batch(
  p_campaign_id uuid,
  p_limit integer,
  p_is_reminder boolean default false
)
returns table (
  supplier_request_id uuid,
  supplier_email text,
  supplier_language text,
  plaintext_token text,
  full_url text,
  token_expires_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_org_id uuid;
  r record;
  t record;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select c.organization_id
  into v_org_id
  from public.supplier_request_campaigns c
  where c.id = p_campaign_id;

  if v_org_id is null or not public.is_org_admin(v_org_id) then
    raise exception 'forbidden';
  end if;

  if greatest(coalesce(p_limit, 0), 0) = 0 then
    return;
  end if;

  for r in
    select
      ci.id as campaign_item_id,
      sr.id as supplier_request_id,
      s.email as supplier_email,
      s.default_language as supplier_language
    from public.supplier_request_campaign_items ci
    join public.supplier_request_campaigns c on c.id = ci.campaign_id
    join public.supplier_requests sr on sr.id = ci.supplier_request_id
    left join public.suppliers s on s.id = sr.supplier_id
    where ci.campaign_id = p_campaign_id
      and c.organization_id = v_org_id
      and c.status = 'active'
      and s.email is not null
      and (
        (p_is_reminder = false and ci.last_sent_at is null)
        or
        (p_is_reminder = true and ci.last_sent_at is not null and ci.reminder_count < 3 and sr.status in ('sent', 'viewed'))
      )
    order by ci.last_sent_at nulls first, ci.id
    limit greatest(p_limit, 0)
  loop
    select *
    into t
    from public.create_supplier_portal_token_for_request(r.supplier_request_id);

    update public.supplier_request_campaign_items
    set
      last_sent_at = now(),
      reminder_count = reminder_count + case when p_is_reminder then 1 else 0 end
    where id = r.campaign_item_id;

    update public.supplier_requests
    set status = case when status in ('draft', 'active') then 'sent' else status end
    where id = r.supplier_request_id;

    supplier_request_id := r.supplier_request_id;
    supplier_email := r.supplier_email;
    supplier_language := r.supplier_language;
    plaintext_token := t.plaintext_token;
    full_url := t.full_url;
    token_expires_at := t.token_expires_at;
    return next;
  end loop;
end;
$$;

alter function public.issue_supplier_request_campaign_batch(uuid, integer, boolean) owner to postgres;

create or replace function public.mark_supplier_request_viewed(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_token text;
  v_sha256 text;
  v_md5 text;
begin
  v_token := btrim(coalesce(p_token, ''));
  v_token := regexp_replace(v_token, '\?.*$', '');
  v_token := regexp_replace(v_token, '^.*/', '');

  if v_token = '' then
    return;
  end if;

  v_sha256 := encode(digest(convert_to(v_token, 'utf8'), 'sha256'), 'hex');
  v_md5 := md5(v_token);

  update public.supplier_requests
  set
    status = case when status in ('active', 'sent') then 'viewed' else status end,
    last_used_at = now()
  where token_hash in (v_sha256, v_md5, v_token)
    and revoked_at is null
    and coalesce(token_expires_at, expires_at, now() + interval '1 second') > now()
    and status in ('active', 'sent', 'viewed');
end;
$$;

alter function public.mark_supplier_request_viewed(text) owner to postgres;

create or replace function public.set_default_legal_entity_for_org(
  p_org_id uuid,
  p_legal_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_org_group uuid;
  v_le_group uuid;
begin
  if auth.uid() is null or not public.can_access_importer(p_org_id) then
    raise exception 'forbidden';
  end if;

  select o.group_id into v_org_group
  from public.organizations o
  where o.id = p_org_id;

  if v_org_group is null then
    raise exception 'org_not_found_or_no_group';
  end if;

  select le.group_id into v_le_group
  from public.legal_entities le
  where le.id = p_legal_entity_id;

  if v_le_group is null then
    raise exception 'legal_entity_not_found';
  end if;

  if v_le_group <> v_org_group then
    raise exception 'legal_entity_not_in_org_group';
  end if;

  update public.organizations
  set default_legal_entity_id = p_legal_entity_id
  where id = p_org_id;

  return jsonb_build_object(
    'org_id', p_org_id,
    'default_legal_entity_id', p_legal_entity_id
  );
end;
$$;

alter function public.set_default_legal_entity_for_org(uuid, uuid) owner to postgres;

create or replace function public.set_supplier_request_campaign_status(
  p_campaign_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if p_status not in ('draft', 'active', 'paused', 'completed') then
    raise exception 'invalid_status';
  end if;

  select c.organization_id
  into v_org_id
  from public.supplier_request_campaigns c
  where c.id = p_campaign_id;

  if v_org_id is null or not public.is_org_admin(v_org_id) then
    raise exception 'forbidden';
  end if;

  update public.supplier_request_campaigns
  set status = p_status
  where id = p_campaign_id;
end;
$$;

alter function public.set_supplier_request_campaign_status(uuid, text) owner to postgres;

create or replace function public.upsert_legal_entity_address(
  p_legal_entity_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_group_id uuid;
  v_row jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select le.group_id into v_group_id
  from public.legal_entities le
  where le.id = p_legal_entity_id;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'forbidden';
  end if;

  insert into public.legal_entity_addresses (
    legal_entity_id,
    address_line1,
    address_line2,
    city,
    region,
    postal_code,
    country_code
  )
  values (
    p_legal_entity_id,
    nullif(btrim(p_payload ->> 'address_line1'), ''),
    nullif(btrim(p_payload ->> 'address_line2'), ''),
    nullif(btrim(p_payload ->> 'city'), ''),
    nullif(btrim(p_payload ->> 'region'), ''),
    nullif(btrim(p_payload ->> 'postal_code'), ''),
    upper(nullif(btrim(p_payload ->> 'country_code'), ''))
  )
  on conflict (legal_entity_id)
  do update set
    address_line1 = excluded.address_line1,
    address_line2 = excluded.address_line2,
    city = excluded.city,
    region = excluded.region,
    postal_code = excluded.postal_code,
    country_code = excluded.country_code
  returning to_jsonb(legal_entity_addresses) into v_row;

  return v_row;
end;
$$;

alter function public.upsert_legal_entity_address(uuid, jsonb) owner to postgres;

--------------------------------------------------------------------------------
-- 9) Certificate and scenario views, in dependency order
--------------------------------------------------------------------------------

create or replace view public.scenario_exposure_by_dimension
with (security_invoker = true)
as
with ri as (
  select
    r.id as report_id,
    r.quarter_year,
    i.id as report_item_id,
    i.cn_code,
    i.supplier_name,
    i.country_of_origin,
    coalesce(i.quantity, 0::numeric) as quantity,
    coalesce(i.net_mass_kg, 0::numeric) as net_mass_kg
  from public.reports r
  join public.report_items i on i.report_id = r.id
),
calc as (
  select
    ecl.report_item_id,
    sum(coalesce(nullif(ecl.calculated_values ->> 'embedded_tco2e', '')::numeric, 0::numeric)) as calc_embedded_tco2e
  from public.emissions_calculation_logs ecl
  group by ecl.report_item_id
),
se as (
  select
    supplier_emissions.report_item_id,
    supplier_emissions.updated_by_supplier,
    supplier_emissions.embedded_emissions_tco2e
  from public.supplier_emissions
)
select
  ri.report_id,
  ri.quarter_year,
  ri.cn_code,
  ri.supplier_name,
  ri.country_of_origin,
  sum(ri.quantity) as total_quantity,
  sum(ri.net_mass_kg) as total_net_mass_kg,
  sum(case when se.updated_by_supplier is true then coalesce(se.embedded_emissions_tco2e, 0::numeric) else 0::numeric end) as embedded_tco2e_actual_only,
  sum(case when se.updated_by_supplier is not true then coalesce(se.embedded_emissions_tco2e, calc.calc_embedded_tco2e, 0::numeric) else 0::numeric end) as embedded_tco2e_default_only,
  sum(case when se.updated_by_supplier is true then coalesce(se.embedded_emissions_tco2e, 0::numeric) else coalesce(se.embedded_emissions_tco2e, calc.calc_embedded_tco2e, 0::numeric) end) as embedded_tco2e_mixed,
  sum(case when se.updated_by_supplier is true then 1 else 0 end) as actual_lines,
  sum(case when se.updated_by_supplier is not true then 1 else 0 end) as default_lines
from ri
left join se on se.report_item_id = ri.report_item_id
left join calc on calc.report_item_id = ri.report_item_id
group by ri.report_id, ri.quarter_year, ri.cn_code, ri.supplier_name, ri.country_of_origin;

alter view public.scenario_exposure_by_dimension owner to postgres;

create or replace view public.cbam_certificate_forecast
with (security_invoker = true)
as
select
  r.id as report_id,
  left(r.quarter_year, 4)::integer as year,
  left(r.quarter_year, 4)::integer as report_year,
  sum(coalesce(s.embedded_tco2e_mixed, 0::numeric)) as total_tco2e,
  p.price_per_tonne_eur,
  sum(coalesce(s.embedded_tco2e_mixed, 0::numeric)) * p.price_per_tonne_eur as estimated_certificate_cost_eur
from public.reports r
join public.scenario_exposure_by_dimension s on s.report_id = r.id
join public.eu_ets_prices p on p.year = left(r.quarter_year, 4)::integer
group by r.id, left(r.quarter_year, 4)::integer, p.price_per_tonne_eur;

alter view public.cbam_certificate_forecast owner to postgres;

create or replace view public.cbam_certificate_balance_by_year
with (security_invoker = true)
as
select
  r.importer_org_id,
  cf.year,
  sum(cf.total_tco2e) as certificates_required,
  coalesce((
    select sum(p.certificates_purchased)
    from public.cbam_certificate_purchases p
    where p.importer_org_id = r.importer_org_id
      and p.year = cf.year
  ), 0::numeric) as certificates_purchased,
  coalesce((
    select sum(p.certificates_purchased)
    from public.cbam_certificate_purchases p
    where p.importer_org_id = r.importer_org_id
      and p.year = cf.year
  ), 0::numeric) - sum(cf.total_tco2e) as net_for_year
from public.reports r
join public.cbam_certificate_forecast cf on cf.report_id = r.id
group by r.importer_org_id, cf.year;

alter view public.cbam_certificate_balance_by_year owner to postgres;

create or replace view public.cbam_certificate_carryover
with (security_invoker = true)
as
select
  importer_org_id,
  year,
  certificates_required,
  certificates_purchased,
  net_for_year,
  sum(net_for_year) over (
    partition by importer_org_id
    order by year
    rows between unbounded preceding and current row
  ) as cumulative_balance,
  greatest(
    sum(net_for_year) over (
      partition by importer_org_id
      order by year
      rows between unbounded preceding and current row
    ),
    0::numeric
  ) as carryover_available
from public.cbam_certificate_balance_by_year;

alter view public.cbam_certificate_carryover owner to postgres;

create or replace view public.cbam_certificate_coverage
with (security_invoker = true)
as
select
  r.id as report_id,
  r.importer_org_id,
  cf.year,
  cf.total_tco2e as certificates_required,
  coalesce(sum(p.certificates_purchased), 0::numeric) as certificates_purchased,
  cf.total_tco2e - coalesce(sum(p.certificates_purchased), 0::numeric) as certificates_gap
from public.reports r
join public.cbam_certificate_forecast cf on cf.report_id = r.id
left join public.cbam_certificate_purchases p
  on p.importer_org_id = r.importer_org_id
 and p.year = cf.year
group by r.id, r.importer_org_id, cf.year, cf.total_tco2e;

alter view public.cbam_certificate_coverage owner to postgres;

--------------------------------------------------------------------------------
-- 10) Explicit grants for referenced relations and views
--------------------------------------------------------------------------------

grant select on public.cbam_alerts to authenticated;
grant select on public.cbam_audit_log to authenticated;
grant select on public.emissions_calculation_logs to authenticated;
grant select on public.eu_ets_prices to anon, authenticated;
grant select, insert, update, delete on public.cbam_certificate_purchases to authenticated;
grant select on public.cbam_risk_scores to authenticated;
grant select, insert, update, delete on public.imports to authenticated;
grant select, insert, update, delete on public.import_lines to authenticated;
grant select on public.invite_audit to authenticated;
grant select, insert, update, delete on public.legal_entities to authenticated;
grant select, insert, update, delete on public.legal_entity_addresses to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select on public.supplier_portal_submissions to authenticated;
grant select, insert, update, delete on public.supplier_request_campaigns to authenticated;
grant select, insert, update, delete on public.supplier_request_campaign_items to authenticated;
grant select on public.scenario_exposure_by_dimension to authenticated;
grant select on public.cbam_certificate_forecast to authenticated;
grant select on public.cbam_certificate_balance_by_year to authenticated;
grant select on public.cbam_certificate_carryover to authenticated;
grant select on public.cbam_certificate_coverage to authenticated;

grant all on public.cbam_alerts to service_role;
grant all on public.cbam_audit_log to service_role;
grant all on public.emissions_calculation_logs to service_role;
grant all on public.eu_ets_prices to service_role;
grant all on public.cbam_certificate_purchases to service_role;
grant all on public.cbam_risk_scores to service_role;
grant all on public.imports to service_role;
grant all on public.import_lines to service_role;
grant all on public.invite_audit to service_role;
grant all on public.legal_entity_addresses to service_role;
grant all on public.supplier_request_campaigns to service_role;
grant all on public.supplier_request_campaign_items to service_role;
grant select on public.scenario_exposure_by_dimension to service_role;
grant select on public.cbam_certificate_forecast to service_role;
grant select on public.cbam_certificate_balance_by_year to service_role;
grant select on public.cbam_certificate_carryover to service_role;
grant select on public.cbam_certificate_coverage to service_role;

--------------------------------------------------------------------------------
-- 11) Explicit execute privileges for every source-referenced RPC
--------------------------------------------------------------------------------

revoke all on function public.create_supplier_portal_token_for_request(uuid) from public, anon, authenticated;
grant execute on function public.create_supplier_portal_token_for_request(uuid) to authenticated, service_role;

revoke all on function public.create_supplier_request_campaign_from_requests(text, uuid[]) from public, anon, authenticated;
grant execute on function public.create_supplier_request_campaign_from_requests(text, uuid[]) to authenticated, service_role;

revoke all on function public.create_supplier_request_with_token(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_supplier_request_with_token(uuid, uuid) to authenticated, service_role;

revoke all on function public.get_legal_entity_address(uuid) from public, anon, authenticated;
grant execute on function public.get_legal_entity_address(uuid) to authenticated, service_role;

revoke all on function public.issue_supplier_request_campaign_batch(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.issue_supplier_request_campaign_batch(uuid, integer, boolean) to authenticated, service_role;

revoke all on function public.list_report_items_for_importer() from public, anon, authenticated;
grant execute on function public.list_report_items_for_importer() to authenticated, service_role;

revoke all on function public.list_supplier_requests_for_importer() from public, anon, authenticated;
grant execute on function public.list_supplier_requests_for_importer() to authenticated, service_role;

revoke all on function public.list_supplier_submissions_for_importer(uuid) from public, anon, authenticated;
grant execute on function public.list_supplier_submissions_for_importer(uuid) to authenticated, service_role;

revoke all on function public.list_suppliers_for_importer() from public, anon, authenticated;
grant execute on function public.list_suppliers_for_importer() to authenticated, service_role;

revoke all on function public.set_default_legal_entity_for_org(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_default_legal_entity_for_org(uuid, uuid) to authenticated, service_role;

revoke all on function public.set_supplier_request_campaign_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_supplier_request_campaign_status(uuid, text) to authenticated, service_role;

revoke all on function public.upsert_legal_entity_address(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_legal_entity_address(uuid, jsonb) to authenticated, service_role;

revoke all on function public.validate_supplier_token(text) from public, anon, authenticated;
grant execute on function public.validate_supplier_token(text) to anon, authenticated, service_role;

revoke all on function public.get_supplier_portal_context(text) from public, anon, authenticated;
grant execute on function public.get_supplier_portal_context(text) to anon, authenticated, service_role;

revoke all on function public.mark_supplier_request_viewed(text) from public, anon, authenticated;
grant execute on function public.mark_supplier_request_viewed(text) to anon, authenticated, service_role;

revoke all on function public.submit_supplier_portal_submission(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_supplier_portal_submission(text, jsonb) to anon, authenticated, service_role;

commit;
