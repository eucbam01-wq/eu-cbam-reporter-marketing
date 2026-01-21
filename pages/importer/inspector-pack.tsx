// FILE: marketing/pages/importer/inspector-pack.tsx (repo: eu-cbam-reporter/marketing)

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import { hasEntitlement, lockedText } from "../../src/entitlements";

type ReportRow = {
  id: string;
  importer_org_id: string;
  quarter_year: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: any;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing Supabase env");
  return createClient(url, anon, { auth: { persistSession: true } });
}

function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function InspectorPackPage() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportId, setReportId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const locked = !hasEntitlement("action.export");

  const supabase = useMemo(() => getSupabase(), []);

  useEffect(() => {
    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }

        // Prefer pulling orgs via reports table since it's guaranteed in this app.
        const { data: repRows, error: repErr } = await supabase
          .from("reports")
          .select("id, importer_org_id, quarter_year, status, created_at, updated_at, metadata")
          .order("created_at", { ascending: false })
          .limit(200);

        if (repErr) throw repErr;

        const mapped: ReportRow[] = (repRows || []).map((r: any) => ({
          id: String(r.id),
          importer_org_id: String(r.importer_org_id),
          quarter_year: r.quarter_year ? String(r.quarter_year) : null,
          status: r.status ? String(r.status) : null,
          created_at: r.created_at ? String(r.created_at) : null,
          updated_at: r.updated_at ? String(r.updated_at) : null,
          metadata: r.metadata ?? null,
        }));

        const uniq = Array.from(new Set(mapped.map((r) => r.importer_org_id))).filter(Boolean);
        setOrgIds(uniq);
        const defaultOrg = uniq[0] || "";
        setOrgId(defaultOrg);

        const filtered = defaultOrg ? mapped.filter((r) => r.importer_org_id === defaultOrg) : mapped;
        setReports(filtered);
        setReportId(filtered[0]?.id || "");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load inspector pack context.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!orgId) return;
    const filtered = reports.filter((r) => r.importer_org_id === orgId);
    if (filtered.length && !filtered.find((r) => r.id === reportId)) {
      setReportId(filtered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function buildPack() {
    if (locked) return;
    setError("");
    setStatus("Building inspector pack...");
    try {
      if (!reportId) throw new Error("Select a report");
      if (!orgId) throw new Error("Select an importer org");

      const zip = new JSZip();

      // 1) Report + items (lineage root)
      const { data: reportRow, error: rErr } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (rErr) throw rErr;

      const { data: items, error: iErr } = await supabase
        .from("report_items")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });

      if (iErr) throw iErr;

      // 2) Calculations surfaces
      const { data: coverage, error: cErr } = await supabase
        .from("cbam_certificate_coverage")
        .select("*")
        .eq("report_id", reportId);

      if (cErr) throw cErr;

      const { data: forecast, error: fErr } = await supabase
        .from("cbam_certificate_forecast")
        .select("*")
        .eq("report_id", reportId);

      if (fErr) throw fErr;

      const { data: risk, error: rsErr } = await supabase
        .from("cbam_risk_scores")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (rsErr) throw rsErr;

      // 3) Supplier submissions (importer view RPC)
      const { data: subs, error: sErr } = await supabase.rpc("list_supplier_submissions_for_importer", {});
      if (sErr) throw sErr;

      // 4) Audit + alerts for org
      const { data: audit, error: aErr } = await supabase
        .from("cbam_audit_log")
        .select("*")
        .eq("importer_org_id", orgId)
        .order("event_time", { ascending: false })
        .limit(1000);

      if (aErr) throw aErr;

      const { data: alerts, error: alErr } = await supabase
        .from("cbam_alerts")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (alErr) throw alErr;

      // Manifest: explicit lineage map for inspectors
      const manifest = {
        generated_at: new Date().toISOString(),
        importer_org_id: orgId,
        report_id: reportId,
        quarter_year: reportRow?.quarter_year ?? null,
        lineage: {
          report: "data/report.json",
          report_items: "data/report_items.json",
          supplier_submissions: "data/supplier_submissions.json",
          calculations: {
            certificate_coverage: "data/certificate_coverage.json",
            certificate_forecast: "data/certificate_forecast.json",
            risk_scores: "data/risk_scores.json",
          },
          controls: {
            alerts: "controls/alerts.json",
            audit_log: "controls/audit_log.json",
          },
        },
      };

      zip.folder("data")?.file("report.json", JSON.stringify(reportRow ?? null, null, 2));
      zip.folder("data")?.file("report_items.json", JSON.stringify(items ?? [], null, 2));
      zip.folder("data")?.file("supplier_submissions.json", JSON.stringify(subs ?? [], null, 2));
      zip.folder("data")?.file("certificate_coverage.json", JSON.stringify(coverage ?? [], null, 2));
      zip.folder("data")?.file("certificate_forecast.json", JSON.stringify(forecast ?? [], null, 2));
      zip.folder("data")?.file("risk_scores.json", JSON.stringify(risk ?? [], null, 2));

      zip.folder("controls")?.file("alerts.json", JSON.stringify(alerts ?? [], null, 2));
      zip.folder("controls")?.file("audit_log.json", JSON.stringify(audit ?? [], null, 2));

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const safeQuarter = String(reportRow?.quarter_year || "report").replace(/[^a-zA-Z0-9]/g, "_");
      downloadBlob(`inspector_pack_${safeQuarter}_${reportId}.zip`, blob);
      setStatus("Inspector pack downloaded.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to build inspector pack.");
      setStatus("");
    }
  }

  const filteredReports = useMemo(() => {
    if (!orgId) return reports;
    return reports.filter((r) => r.importer_org_id === orgId);
  }, [reports, orgId]);

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inspector export pack</h1>
            <p className="mt-1 text-sm text-white/60">ZIP with lineage from report to inputs and controls.</p>
          </div>
          <Link className="text-sm text-white/70 hover:text-white" href="/importer">
            Back
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          {locked ? (
            <div className="text-sm text-white/70">{lockedText("action.export")}</div>
          ) : null}

          {loading ? <div className="text-sm text-white/70">Loading…</div> : null}
          {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}
          {status ? <div className="mt-2 text-sm text-white/70">{status}</div> : null}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-white/70">Importer org</div>
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={loading}
              >
                {orgIds.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-medium text-white/70">Report</div>
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                disabled={loading}
              >
                {filteredReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.quarter_year || "Report"} • {r.id.slice(0, 8)} • {r.status || "unknown"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
              onClick={buildPack}
              disabled={loading || locked}
            >
              Download inspector pack
            </button>
            <div className="text-xs text-white/50">Includes report, items, submissions, coverage, forecast, risk, alerts, audit log.</div>
          </div>
        </div>
      </div>
    </main>
  );
}

// FILE: marketing/pages/importer/inspector-pack.tsx (repo: eu-cbam-reporter/marketing)
