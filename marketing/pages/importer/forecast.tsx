// FILE: marketing/pages/importer/forecast.tsx (repo: eu-cbam-reporter/marketing)

import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LABEL, getActivePlanTier, isEntitled, requiredTierForFeature } from "../../src/entitlements";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type ReportRow = {
  id: string;
  importer_org_id: string;
  created_at: string | null;
  quarter_year: string | null;
};

type ForecastRow = {
  report_id: string;
  year: number | null;
  report_year: number | null;
  total_tco2e: number | null;
  price_per_tonne_eur: number | null;
  estimated_certificate_cost_eur: number | null;
};

function yearFromISO(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

function fmtNum(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

function fmtMoneyEUR(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
  } catch {
    return `EUR ${Math.round(Number(n)).toLocaleString()}`;
  }
}

export default function ForecastPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const planTier = getActivePlanTier();
  const required = requiredTierForFeature("FORECAST");
  const allowed = isEntitled(planTier, required);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [year, setYear] = useState<number | null>(null);

  const [rows, setRows] = useState<ForecastRow[]>([]);

  const orgOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of reports) if (r.importer_org_id) s.add(String(r.importer_org_id));
    return Array.from(s).sort();
  }, [reports]);

  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    for (const r of reports) {
      const y = yearFromISO(r.created_at);
      if (y) s.add(y);
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [reports]);

  const reportIds = useMemo(() => {
    const ids: string[] = [];
    for (const r of reports) {
      if (orgId && String(r.importer_org_id) !== orgId) continue;
      if (year !== null) {
        const ry = yearFromISO(r.created_at);
        if (ry !== year) continue;
      }
      ids.push(r.id);
    }
    return ids;
  }, [reports, orgId, year]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }

        setLoading(true);
        setError(null);

        const { data: rep, error: repErr } = await supabase
          .from("reports")
          .select("id, importer_org_id, created_at, quarter_year")
          .order("created_at", { ascending: false })
          .limit(200);
        if (repErr) throw repErr;

        const list = Array.isArray(rep) ? (rep as any[]) : [];
        const mapped: ReportRow[] = list
          .filter((x) => x && x.id && x.importer_org_id)
          .map((x) => ({
            id: String(x.id),
            importer_org_id: String(x.importer_org_id),
            created_at: x.created_at ? String(x.created_at) : null,
            quarter_year: x.quarter_year ? String(x.quarter_year) : null,
          }));

        if (cancelled) return;

        setReports(mapped);
        const defaultOrg = mapped[0]?.importer_org_id || "";
        const defaultYear = yearFromISO(mapped[0]?.created_at) ?? null;
        setOrgId((prev) => (prev ? prev : defaultOrg));
        setYear((prev) => (prev !== null ? prev : defaultYear));
        setLoading(false);
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message || String(ex));
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orgId || reportIds.length === 0) {
        setRows([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fErr } = await supabase
          .from("cbam_certificate_forecast")
          .select("report_id, year, report_year, total_tco2e, price_per_tonne_eur, estimated_certificate_cost_eur")
          .in("report_id", reportIds)
          .limit(5000);
        if (fErr) throw fErr;

        if (cancelled) return;
        setRows((Array.isArray(data) ? data : []) as ForecastRow[]);
      } catch (ex: any) {
        if (!cancelled) setError(ex?.message || String(ex));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, orgId, reportIds]);

  const totals = useMemo(() => {
    const t = rows.reduce((acc, r) => acc + Number(r.total_tco2e || 0), 0);
    const c = rows.reduce((acc, r) => acc + Number(r.estimated_certificate_cost_eur || 0), 0);
    return { totalTco2e: t, totalCost: c };
  }, [rows]);

  if (!allowed) {
    return (
      <div style={{ padding: 20 }}>
        <Head>
          <title>Forecast | Locked</title>
        </Head>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Forecast</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>Locked. Upgrade to {PLAN_LABEL[required]} to access.</div>
        <div style={{ marginTop: 14 }}>
          <a href="/pricing" style={{ fontWeight: 900, textDecoration: "underline" }}>Upgrade</a>
        </div>
      </div>
    );
  }

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Forecast</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx>{`
        .gsx-root {
          min-height: 100vh;
          background: #05070d;
          color: #eaf0ff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
        }
        .gsx-shell {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 16px 56px;
        }
        .gsx-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .gsx-title {
          font-size: 18px;
          letter-spacing: 0.2px;
          margin: 0;
        }
        .gsx-sub {
          margin: 6px 0 0;
          color: rgba(234, 240, 255, 0.72);
          font-size: 13px;
          line-height: 1.35;
        }
        .gsx-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .gsx-link {
          color: rgba(234, 240, 255, 0.9);
          text-decoration: underline;
          font-size: 13px;
        }
        .gsx-select {
          appearance: none;
          border: 1px solid rgba(132, 160, 255, 0.35);
          background: rgba(15, 23, 42, 0.65);
          color: #eaf0ff;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }
        .gsx-card {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.7);
          border-radius: 16px;
          padding: 14px;
          margin-top: 12px;
        }
        .gsx-kpis {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .gsx-kpi {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.28);
          border-radius: 14px;
          padding: 10px 12px;
          min-width: 220px;
        }
        .gsx-kpiLabel {
          font-size: 12px;
          color: rgba(234, 240, 255, 0.62);
          margin: 0;
        }
        .gsx-kpiValue {
          font-size: 16px;
          font-weight: 900;
          margin: 2px 0 0;
        }
        .gsx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 10px;
        }
        .gsx-table th,
        .gsx-table td {
          padding: 8px 6px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          text-align: left;
          vertical-align: top;
          word-break: break-word;
        }
        .gsx-muted {
          color: rgba(234, 240, 255, 0.72);
          font-size: 13px;
        }
        .gsx-error {
          margin-top: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 125, 125, 0.25);
          background: rgba(127, 29, 29, 0.18);
          color: rgba(255, 235, 235, 0.92);
          font-size: 13px;
        }
      `}</style>

      <div className="gsx-shell">
        <div className="gsx-head">
          <div>
            <h1 className="gsx-title">Forecast</h1>
            <p className="gsx-sub">Certificate requirement and cost projection, using stored EU ETS prices.</p>
          </div>
          <div className="gsx-actions">
            <Link className="gsx-link" href="/importer/certificates">
              Certificates
            </Link>
            <select className="gsx-select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgOptions.map((o) => (
                <option key={o} value={o}>
                  Org: {o}
                </option>
              ))}
            </select>
            <select className="gsx-select" value={year ?? ""} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Year: {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="gsx-error">{error}</div> : null}

        <div className="gsx-card">
          <div className="gsx-kpis">
            <div className="gsx-kpi">
              <p className="gsx-kpiLabel">Total tCO2e (selected reports)</p>
              <p className="gsx-kpiValue">{fmtNum(totals.totalTco2e, 0)}</p>
            </div>
            <div className="gsx-kpi">
              <p className="gsx-kpiLabel">Estimated cost (EUR)</p>
              <p className="gsx-kpiValue">{fmtMoneyEUR(totals.totalCost)}</p>
            </div>
          </div>

          {loading ? <p className="gsx-muted">Loading...</p> : null}

          <table className="gsx-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Year</th>
                <th>Total tCO2e</th>
                <th>ETS price (EUR)</th>
                <th>Estimated cost (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gsx-muted">
                    No forecast data
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.report_id}>
                    <td>{r.report_id}</td>
                    <td>{r.year ?? "-"}</td>
                    <td>{fmtNum(r.total_tco2e, 0)}</td>
                    <td>{fmtNum(r.price_per_tonne_eur, 0)}</td>
                    <td>{fmtMoneyEUR(r.estimated_certificate_cost_eur)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILE: marketing/pages/importer/forecast.tsx (repo: eu-cbam-reporter/marketing) */}
    </div>
  );
}

// FILE: marketing/pages/importer/forecast.tsx (repo: eu-cbam-reporter/marketing)
