// FILE: marketing/pages/importer/exposure-dashboard.tsx (repo: eu-cbam-reporter/marketing)
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type ExposureRow = {
  report_id: string;
  quarter_year: string | null;
  cn_code: string | null;
  supplier_name: string | null;
  country_of_origin: string | null;
  total_quantity: number | null;
  total_net_mass_kg: number | null;
  embedded_tco2e_actual_only: number | null;
  embedded_tco2e_default_only: number | null;
  embedded_tco2e_mixed: number | null;
  actual_lines: number | null;
  default_lines: number | null;
};

function fmtNum(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

function safeLower(s: any) {
  return String(s || "").trim().toLowerCase();
}

export default function ExposureDashboardPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [search, setSearch] = useState("");
  const [quarter, setQuarter] = useState<string>("");
  const [scenario, setScenario] = useState<"mixed" | "actual" | "default">("mixed");

  const quarterOptions = useMemo(() => {
    const uniq = new Set<string>();
    rows.forEach((r) => {
      const qy = String(r.quarter_year || "").trim();
      if (qy) uniq.add(qy);
    });
    return Array.from(uniq).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = safeLower(search);
    return rows
      .filter((r) => (quarter ? String(r.quarter_year || "") === quarter : true))
      .filter((r) => {
        if (!q) return true;
        const sup = safeLower(r.supplier_name);
        const cn = safeLower(r.cn_code);
        const origin = safeLower(r.country_of_origin);
        const qy = safeLower(r.quarter_year);
        return sup.includes(q) || cn.includes(q) || origin.includes(q) || qy.includes(q);
      });
  }, [rows, search, quarter]);

  const kpis = useMemo(() => {
    const lineCount = filtered.length;
    const embedded = filtered.reduce((acc, r) => {
      const v = scenario === "actual"
        ? r.embedded_tco2e_actual_only
        : scenario === "default"
        ? r.embedded_tco2e_default_only
        : r.embedded_tco2e_mixed;
      return acc + Number(v || 0);
    }, 0);
    const netMass = filtered.reduce((acc, r) => acc + Number(r.total_net_mass_kg || 0), 0);
    const suppliers = new Set(filtered.map((r) => safeLower(r.supplier_name)).filter(Boolean)).size;
    const cnCodes = new Set(filtered.map((r) => safeLower(r.cn_code)).filter(Boolean)).size;
    const origins = new Set(filtered.map((r) => safeLower(r.country_of_origin)).filter(Boolean)).size;
    const actualLines = filtered.reduce((acc, r) => acc + Number(r.actual_lines || 0), 0);
    const defaultLines = filtered.reduce((acc, r) => acc + Number(r.default_lines || 0), 0);
    return { lineCount, embedded, netMass, suppliers, cnCodes, origins, actualLines, defaultLines };
  }, [filtered, scenario]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier_name: string; lines: number; embedded: number; netMass: number; cnCodes: number; origins: number }>();
    const cnBy = new Map<string, Set<string>>();
    const originBy = new Map<string, Set<string>>();
    for (const r of filtered) {
      const key = String(r.supplier_name || "-");
      if (!map.has(key)) {
        map.set(key, { supplier_name: key, lines: 0, embedded: 0, netMass: 0, cnCodes: 0, origins: 0 });
        cnBy.set(key, new Set());
        originBy.set(key, new Set());
      }
      const m = map.get(key)!;
      m.lines += 1;
            const v = scenario === "actual"
        ? r.embedded_tco2e_actual_only
        : scenario === "default"
        ? r.embedded_tco2e_default_only
        : r.embedded_tco2e_mixed;
      m.embedded += Number(v || 0);
      m.embeddedActual = (m.embeddedActual || 0) + Number(r.embedded_tco2e_actual_only || 0);
      m.embeddedDefault = (m.embeddedDefault || 0) + Number(r.embedded_tco2e_default_only || 0);
      m.netMass += Number(r.total_net_mass_kg || 0);
      if (r.cn_code) cnBy.get(key)!.add(String(r.cn_code));
      if (r.country_of_origin) originBy.get(key)!.add(String(r.country_of_origin));
    }
    for (const [k, m] of map.entries()) {
      m.cnCodes = cnBy.get(k)?.size || 0;
      m.origins = originBy.get(k)?.size || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.embedded - a.embedded);
  }, [filtered, scenario]);

  const byCnCode = useMemo(() => {
    const map = new Map<string, { cn_code: string; lines: number; embedded: number; netMass: number; suppliers: number; origins: number }>();
    const supBy = new Map<string, Set<string>>();
    const originBy = new Map<string, Set<string>>();
    for (const r of filtered) {
      const key = String(r.cn_code || "-");
      if (!map.has(key)) {
        map.set(key, { cn_code: key, lines: 0, embedded: 0, netMass: 0, suppliers: 0, origins: 0 });
        supBy.set(key, new Set());
        originBy.set(key, new Set());
      }
      const m = map.get(key)!;
      m.lines += 1;
            const v = scenario === "actual"
        ? r.embedded_tco2e_actual_only
        : scenario === "default"
        ? r.embedded_tco2e_default_only
        : r.embedded_tco2e_mixed;
      m.embedded += Number(v || 0);
      m.embeddedActual = (m.embeddedActual || 0) + Number(r.embedded_tco2e_actual_only || 0);
      m.embeddedDefault = (m.embeddedDefault || 0) + Number(r.embedded_tco2e_default_only || 0);
      m.netMass += Number(r.total_net_mass_kg || 0);
      if (r.supplier_name) supBy.get(key)!.add(String(r.supplier_name));
      if (r.country_of_origin) originBy.get(key)!.add(String(r.country_of_origin));
    }
    for (const [k, m] of map.entries()) {
      m.suppliers = supBy.get(k)?.size || 0;
      m.origins = originBy.get(k)?.size || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.embedded - a.embedded);
  }, [filtered, scenario]);

  const byOrigin = useMemo(() => {
    const map = new Map<string, { country_of_origin: string; lines: number; embedded: number; netMass: number; suppliers: number; cnCodes: number }>();
    const supBy = new Map<string, Set<string>>();
    const cnBy = new Map<string, Set<string>>();
    for (const r of filtered) {
      const key = String(r.country_of_origin || "-");
      if (!map.has(key)) {
        map.set(key, { country_of_origin: key, lines: 0, embedded: 0, netMass: 0, suppliers: 0, cnCodes: 0 });
        supBy.set(key, new Set());
        cnBy.set(key, new Set());
      }
      const m = map.get(key)!;
      m.lines += 1;
            const v = scenario === "actual"
        ? r.embedded_tco2e_actual_only
        : scenario === "default"
        ? r.embedded_tco2e_default_only
        : r.embedded_tco2e_mixed;
      m.embedded += Number(v || 0);
      m.embeddedActual = (m.embeddedActual || 0) + Number(r.embedded_tco2e_actual_only || 0);
      m.embeddedDefault = (m.embeddedDefault || 0) + Number(r.embedded_tco2e_default_only || 0);
      m.netMass += Number(r.total_net_mass_kg || 0);
      if (r.supplier_name) supBy.get(key)!.add(String(r.supplier_name));
      if (r.cn_code) cnBy.get(key)!.add(String(r.cn_code));
    }
    for (const [k, m] of map.entries()) {
      m.suppliers = supBy.get(k)?.size || 0;
      m.cnCodes = cnBy.get(k)?.size || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.embedded - a.embedded);
  }, [filtered]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }

        setLoading(true);
        setError(null);

        const { data, error: qErr } = await supabase
          .from("scenario_exposure_by_dimension")
          .select("report_id, quarter_year, cn_code, supplier_name, country_of_origin, total_quantity, total_net_mass_kg, embedded_tco2e_actual_only, embedded_tco2e_default_only, embedded_tco2e_mixed, actual_lines, default_lines")
          .order("quarter_year", { ascending: false })
          .limit(5000);

        if (qErr) throw qErr;

        const nextRows: ExposureRow[] = (data || []).map((r: any) => ({
          report_id: r.report_id,
          quarter_year: r.quarter_year ?? null,
          cn_code: r.cn_code ?? null,
          supplier_name: r.supplier_name ?? null,
          country_of_origin: r.country_of_origin ?? null,
          total_quantity: r.total_quantity ?? null,
          total_net_mass_kg: r.total_net_mass_kg ?? null,
          embedded_tco2e_actual_only: r.embedded_tco2e_actual_only ?? null,
          embedded_tco2e_default_only: r.embedded_tco2e_default_only ?? null,
          embedded_tco2e_mixed: r.embedded_tco2e_mixed ?? null,
          actual_lines: r.actual_lines ?? null,
          default_lines: r.default_lines ?? null,
        }));

        if (!cancelled) {
          setRows(nextRows);
          setLoading(false);

          if (!quarter) {
            const opts = Array.from(new Set(nextRows.map((r) => String(r.quarter_year || "")).filter(Boolean))).sort();
            if (opts.length) setQuarter(opts[0]); // newest first due to order
          }
        }
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message ?? "Failed to load exposure dashboard.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Exposure Dashboard</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-root{
          min-height:100vh;
          padding:24px 12px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:#F5F5F5;
          color:#202020;
        }
        .gsx-shell{ width:min(1200px,100%); margin:0 auto; }

        .gsx-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .gsx-title{ font-size:20px; font-weight:900; margin:0 0 12px; }
        .gsx-link{ color:#111827; text-decoration:underline; }

        .gsx-card{
          border-radius:16px;
          border:1px solid #E5E7EB;
          background:#fff;
          padding:14px;
        }

        .gsx-row{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .gsx-spacer{ flex:1; }

        .gsx-input{
          width: min(420px, 100%);
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #E5E7EB;
          outline:none;
          background:#fff;
          font-size:13px;
        }
        .gsx-select{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #E5E7EB;
          outline:none;
          background:#fff;
          font-size:13px;
        }

        .gsx-kpis{ display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
        .gsx-kpi{
          border:1px solid #E5E7EB;
          border-radius:14px;
          padding:10px 12px;
          background:#fff;
          min-width: 150px;
        }
        .gsx-kpiLabel{ font-size:12px; color:#6B7280; margin:0; }
        .gsx-kpiValue{ font-size:16px; font-weight:900; margin:2px 0 0; }

        .gsx-grid{
          display:grid;
          grid-template-columns: 1fr;
          gap:12px;
          margin-top:12px;
        }
        @media (min-width: 980px){
          .gsx-grid{ grid-template-columns: 1fr 1fr; }
        }

        .gsx-table{ width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }
        .gsx-table th, .gsx-table td{
          padding:8px 6px;
          border-bottom:1px solid #E5E7EB;
          text-align:left;
          vertical-align:top;
          word-break:break-word;
        }
        .gsx-muted{ color:#6B7280; }
        .gsx-small{ font-size:12px; }
        .gsx-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid #E5E7EB;
          background:#fff;
          font-size:12px;
          white-space:nowrap;
        }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-top">
          <h1 className="gsx-title">Exposure dashboard</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <Link className="gsx-link" href="/app">Command Center</Link>
            <Link className="gsx-link" href="/importer/certificates">Certificates</Link>
          </div>
        </div>

        <section className="gsx-card">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-muted">{error}</div> : null}

          {!loading && !error ? (
            <>
              <div className="gsx-row">
                <select className="gsx-select" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                  <option value="">All quarters</option>
                  {quarterOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>

                <select className="gsx-select" value={scenario} onChange={(e) => setScenario(e.target.value as any)}>
                  <option value="mixed">Scenario: Mixed</option>
                  <option value="actual">Scenario: Supplier actual</option>
                  <option value="default">Scenario: Default</option>
                </select>

                <input className="gsx-input" placeholder="Search supplier, CN code, origin, quarter" value={search} onChange={(e) => setSearch(e.target.value)} />

                <div className="gsx-spacer" />

                <span className="gsx-pill">Rows: {kpis.lineCount.toLocaleString()}</span>
                <span className="gsx-pill">Suppliers: {kpis.suppliers.toLocaleString()}</span>
                <span className="gsx-pill">CN codes: {kpis.cnCodes.toLocaleString()}</span>
                <span className="gsx-pill">Origins: {kpis.origins.toLocaleString()}</span>
                <span className="gsx-pill">Actual lines: {kpis.actualLines.toLocaleString()}</span>
                <span className="gsx-pill">Default lines: {kpis.defaultLines.toLocaleString()}</span>
              </div>

              <div className="gsx-kpis">
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Embedded tCO2e</p>
                  <p className="gsx-kpiValue">{fmtNum(kpis.embedded, 2)}</p>
                </div>
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Net mass kg</p>
                  <p className="gsx-kpiValue">{fmtNum(kpis.netMass, 0)}</p>
                </div>
              </div>

              <div className="gsx-grid">
                <div className="gsx-card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Top suppliers by embedded tCO2e (scenario)</div>
                  <table className="gsx-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Lines</th>
                        <th>CN</th>
                        <th>Origins</th>
                        <th>Actual</th><th>Default</th><th>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bySupplier.slice(0, 25).map((s) => (
                        <tr key={s.supplier_name}>
                          <td style={{ fontWeight: 900 }}>{s.supplier_name}</td>
                          <td>{s.lines.toLocaleString()}</td>
                          <td>{s.cnCodes.toLocaleString()}</td>
                          <td>{s.origins.toLocaleString()}</td>
                          <td>{fmtNum(s.embeddedActual,2)}</td><td>{fmtNum(s.embeddedDefault,2)}</td><td>{fmtNum(s.embeddedActual - s.embeddedDefault,2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="gsx-muted gsx-small" style={{ marginTop: 8 }}>
                    Source: public.exposure_emissions_by_dimension (read only).
                  </div>
                </div>

                <div className="gsx-card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Top CN codes by embedded tCO2e (scenario)</div>
                  <table className="gsx-table">
                    <thead>
                      <tr>
                        <th>CN code</th>
                        <th>Lines</th>
                        <th>Suppliers</th>
                        <th>Origins</th>
                        <th>Actual</th><th>Default</th><th>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCnCode.slice(0, 25).map((c) => (
                        <tr key={c.cn_code}>
                          <td style={{ fontWeight: 900 }}>{c.cn_code}</td>
                          <td>{c.lines.toLocaleString()}</td>
                          <td>{c.suppliers.toLocaleString()}</td>
                          <td>{c.origins.toLocaleString()}</td>
                          <td>{fmtNum(c.embedded, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="gsx-muted gsx-small" style={{ marginTop: 8 }}>
                    Breakdowns are derived client side from the view for speed.
                  </div>
                </div>

                <div className="gsx-card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Top origins by embedded tCO2e (scenario)</div>
                  <table className="gsx-table">
                    <thead>
                      <tr>
                        <th>Origin</th>
                        <th>Lines</th>
                        <th>Suppliers</th>
                        <th>CN</th>
                        <th>Actual</th><th>Default</th><th>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byOrigin.slice(0, 25).map((o) => (
                        <tr key={o.country_of_origin}>
                          <td style={{ fontWeight: 900 }}>{o.country_of_origin}</td>
                          <td>{o.lines.toLocaleString()}</td>
                          <td>{o.suppliers.toLocaleString()}</td>
                          <td>{o.cnCodes.toLocaleString()}</td>
                          <td>{fmtNum(o.embedded, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="gsx-card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Raw rows (preview)</div>
                  <table className="gsx-table">
                    <thead>
                      <tr>
                        <th>Quarter</th>
                        <th>Supplier</th>
                        <th>CN</th>
                        <th>Origin</th>
                        <th>Net mass kg</th>
                        <th>Actual</th><th>Default</th><th>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 25).map((r, idx) => (
                        <tr key={r.report_id + "::" + idx}>
                          <td>{r.quarter_year || "-"}</td>
                          <td style={{ fontWeight: 900 }}>{r.supplier_name || "-"}</td>
                          <td>{r.cn_code || "-"}</td>
                          <td>{r.country_of_origin || "-"}</td>
                          <td>{fmtNum(r.total_net_mass_kg ?? null, 0)}</td>
                          <td>{fmtNum((scenario === "actual" ? r.embedded_tco2e_actual_only : scenario === "default" ? r.embedded_tco2e_default_only : r.embedded_tco2e_mixed) ?? null, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="gsx-muted gsx-small" style={{ marginTop: 8 }}>
                    Showing first 25 rows after filters.
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/exposure-dashboard.tsx (repo: eu-cbam-reporter/marketing)
