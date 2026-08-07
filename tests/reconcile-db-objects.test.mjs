import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanSourceReferences, parseMigrations, reconcile } from "../scripts/reconcile-db-objects.mjs";

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p0-9-"));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  return root;
}

const config = {
  sourceRoots: ["pages", "src", "supabase/functions"],
  migrationRoots: ["supabase/migrations"],
  sourceExtensions: [".ts", ".tsx", ".mjs"],
  defaultSchema: "public",
  evidenceDir: "_p0_13_ci_evidence/db-contract",
  generatedAuthorizationTest: "supabase/tests/p0.9_referenced_object_authorization_test.sql",
  dynamicBucketFallbacks: { NEXT_PUBLIC_SUPABASE_EVIDENCE_BUCKET: "supplier-evidence" },
  publicSupplierRpcs: ["validate_supplier_token"],
  authorizationWarningRpcs: ["create_supplier_portal_token_for_request"],
};

test("scanner captures Supabase tables, RPCs and bucket while ignoring Array.from and Buffer.from", () => {
  const root = fixture({
    "pages/page.tsx": `
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_EVIDENCE_BUCKET || "supplier-evidence";
      await supabase.from("reports").select("id");
      await supabase.rpc("list_reports");
      await supabase.storage.from(bucket).upload("x", file);
      Array.from(new Set()); Buffer.from("ftyp");
    `,
  });
  const result = scanSourceReferences(root, config);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.references.filter((item) => item.kind === "relation").length, 1);
  assert.equal(result.references.filter((item) => item.kind === "rpc").length, 1);
  assert.equal(result.references.filter((item) => item.kind === "bucket").length, 1);
  assert.equal(result.references.find((item) => item.kind === "bucket").name, "supplier-evidence");
});

test("migration parser maps table, security-invoker view, RLS, RPC guard, grant and bucket", () => {
  const root = fixture({
    "supabase/migrations/001.sql": `
      create table public.reports(id uuid);
      alter table public.reports enable row level security;
      create policy reports_select on public.reports for select to authenticated using (auth.uid() is not null);
      create or replace view public.report_view with (security_invoker = true) as select id from public.reports;
      create function public.list_reports() returns setof public.reports language sql security definer as $$
        select * from public.reports where public.is_org_member(id)
      $$;
      grant execute on function public.list_reports() to authenticated;
      insert into storage.buckets(id,name,public) values ('supplier-evidence','supplier-evidence',false);
      create policy evidence_insert on storage.objects for insert to anon with check (bucket_id='supplier-evidence');
    `,
  });
  const parsed = parseMigrations(root, config);
  const reports = parsed.objects.get("relation:public.reports");
  const reportView = parsed.objects.get("relation:public.report_view");
  const rpc = parsed.objects.get("rpc:public.list_reports");
  const bucket = parsed.objects.get("bucket:storage.supplier-evidence");
  assert.equal(reports.rlsEnabled, true);
  assert.equal(reports.policies[0].command, "SELECT");
  assert.equal(reportView.securityInvoker, true);
  assert.ok(rpc.authorizationSignals.includes("is_org_member"));
  assert.equal(rpc.grants[0].action, "GRANT");
  assert.equal(bucket.migrations.length, 1);
  assert.equal(bucket.policies[0].command, "INSERT");
});

test("strict reconciliation passes a complete synthetic object set", () => {
  const root = fixture({
    "pages/page.tsx": `await supabase.from("reports").select("id"); await supabase.rpc("list_reports");`,
    "supabase/migrations/001.sql": `
      create table public.reports(id uuid);
      alter table public.reports enable row level security;
      create policy reports_select on public.reports for select to authenticated using (auth.uid() is not null);
      create function public.list_reports() returns setof public.reports language sql security definer as $$
        select * from public.reports where auth.uid() is not null
      $$;
      grant execute on function public.list_reports() to authenticated;
    `,
  });
  const result = reconcile(root, config, path.join(root, "_p0_13_ci_evidence/db-contract"));
  assert.equal(result.summary.pass, true);
  assert.equal(result.summary.failedObjectCount, 0);
  assert.match(
    fs.readFileSync(path.join(root, config.generatedAuthorizationTest), "utf8"),
    /select plan\(2\)/,
  );
});

test("strict reconciliation fails when a referenced object is absent", () => {
  const root = fixture({
    "pages/page.tsx": `await supabase.from("missing_table").select("id");`,
    "supabase/migrations/001.sql": `select 1;`,
  });
  const result = reconcile(root, config, path.join(root, "_p0_13_ci_evidence/db-contract"));
  assert.equal(result.summary.pass, false);
  assert.equal(result.summary.missingMigrationCount, 1);
  assert.match(result.rows[0].failure_reasons, /MISSING_MIGRATION/);
});

test("known P0.11 RPC ownership gap is reported as a warning without defeating P0.9 object reconciliation", () => {
  const root = fixture({
    "pages/page.tsx": `await supabase.rpc("create_supplier_portal_token_for_request");`,
    "supabase/migrations/001.sql": `
      create function public.create_supplier_portal_token_for_request() returns void language sql security definer as $$ select null $$;
      grant execute on function public.create_supplier_portal_token_for_request() to authenticated;
    `,
  });
  const result = reconcile(root, config, path.join(root, "_p0_13_ci_evidence/db-contract"));
  assert.equal(result.summary.pass, true);
  assert.equal(result.summary.authorizationWarningCount, 1);
  assert.match(result.rows[0].authorization_findings, /DEFERRED_TO_P0\.11/);
});


test("CI command exits nonzero when an application object is absent from versioned SQL", () => {
  const root = fixture({
    "pages/page.tsx": `await supabase.from("missing_ci_table").select("id");`,
    "supabase/migrations/001.sql": `select 1;`,
    "db-object-reconciliation.config.json": JSON.stringify(config),
  });
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const ciScript = path.resolve(testDir, "../scripts/ci-verify.mjs");
  const result = spawnSync(process.execPath, [ciScript, "--project-root", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /MISSING_MIGRATION_COUNT=1/);
  assert.match(result.stdout, /PASS=FALSE/);
});

test("generated authorization SQL is byte-identical across repeated reconciliation and includes the evidence-session RPC exactly once", () => {
  const root = fixture({
    "pages/page.tsx": `
      await supabase.from("reports").select("id");
      await supabase.rpc("bind_supplier_evidence_session", { p_token: "fixture-token" });
    `,
    "supabase/migrations/001.sql": `
      create table public.reports(id uuid);
      alter table public.reports enable row level security;
      create policy reports_select on public.reports for select to authenticated using (auth.uid() is not null);

      create function public.bind_supplier_evidence_session(p_token text)
      returns boolean
      language sql
      security definer
      as $$ select auth.uid() is not null $$;
      grant execute on function public.bind_supplier_evidence_session(text) to authenticated;
    `,
  });

  const first = reconcile(root, config, path.join(root, "evidence-first"));
  const generated = path.join(root, config.generatedAuthorizationTest);
  const firstBytes = fs.readFileSync(generated);
  const mtimeSentinel = new Date("2001-01-01T00:00:00.000Z");
  fs.utimesSync(generated, mtimeSentinel, mtimeSentinel);
  const firstMtimeMs = fs.statSync(generated).mtimeMs;

  const second = reconcile(root, config, path.join(root, "evidence-second"));
  const secondBytes = fs.readFileSync(generated);
  const text = secondBytes.toString("utf8");

  assert.equal(first.generatedAuthorizationTestChanged, true);
  assert.equal(second.generatedAuthorizationTestChanged, false);
  assert.deepEqual(secondBytes, firstBytes);
  assert.equal(fs.statSync(generated).mtimeMs, firstMtimeMs);
  assert.equal(text.includes("\r"), false);
  assert.equal(text.endsWith("\n"), true);
  assert.equal(text.endsWith("\n\n"), false);
  assert.match(text, /select plan\(2\)/);
  assert.equal(
    (text.match(/rpc:public\.bind_supplier_evidence_session authorization mapping/g) || []).length,
    1,
  );
  assert.ok(
    text.indexOf("relation:public.reports authorization mapping")
      < text.indexOf("rpc:public.bind_supplier_evidence_session authorization mapping"),
  );
});

test("generated authorization SQL treats a CRLF checkout as identical without rewriting", () => {
  const root = fixture({
    "pages/page.tsx": `
      await supabase.from("reports").select("id");
      await supabase.rpc("bind_supplier_evidence_session", { p_token: "fixture-token" });
    `,
    "supabase/migrations/001.sql": `
      create table public.reports(id uuid);
      alter table public.reports enable row level security;
      create policy reports_select on public.reports for select to authenticated using (auth.uid() is not null);

      create function public.bind_supplier_evidence_session(p_token text)
      returns boolean
      language sql
      security definer
      as $$ select auth.uid() is not null $$;
      grant execute on function public.bind_supplier_evidence_session(text) to authenticated;
    `,
  });

  const first = reconcile(root, config, path.join(root, "evidence-first"));
  const generated = path.join(root, config.generatedAuthorizationTest);
  const canonicalText = fs.readFileSync(generated, "utf8");
  const crlfBytes = Buffer.from(canonicalText.replace(/\n/g, "\r\n"), "utf8");
  fs.writeFileSync(generated, crlfBytes);

  const mtimeSentinel = new Date("2002-02-02T00:00:00.000Z");
  fs.utimesSync(generated, mtimeSentinel, mtimeSentinel);
  const beforeMtimeMs = fs.statSync(generated).mtimeMs;
  const second = reconcile(root, config, path.join(root, "evidence-second"));
  const afterBytes = fs.readFileSync(generated);

  assert.equal(first.generatedAuthorizationTestChanged, true);
  assert.equal(second.generatedAuthorizationTestChanged, false);
  assert.deepEqual(afterBytes, crlfBytes);
  assert.equal(fs.statSync(generated).mtimeMs, beforeMtimeMs);
  assert.equal(afterBytes.toString("utf8").replace(/\r\n?/g, "\n"), canonicalText);
  assert.equal(
    (canonicalText.match(/rpc:public\.bind_supplier_evidence_session authorization mapping/g) || []).length,
    1,
  );
});
