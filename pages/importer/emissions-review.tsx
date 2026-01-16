// FILE: marketing/pages/importer/emissions-review.tsx (repo: eu-cbam-reporter/marketing)
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

type ReportRow = {
  id: string;
  importer_org_id: string;
  quarter_year: string;
  status: string;
};

type ReportItemRow = {
  id: string;
  report_id: string;
  cn_code_id: string;
  cn_code?: string | null;
  goods_description?: string | null;
  quantity?: number | null;
  net_mass_kg?: number | null;
  country_of_origin?: string | null;
  procedure_code?: string | null;
  supplier_name: string;
  supplier_reference?: string | null;
};

type SupplierEmissionsRow = {
  id: string;
  report_item_id: string;
  methodology?: string | null;
  embedded_emissions_tco2e?: number | null;
  direct_emissions_tco2e?: number | null;
  indirect_emissions_tco2e?: number | null;
  precursor_emissions_tco2e?: number | null;
  electricity_mwh?: number | null;
  updated_by_supplier: boolean;
  updated_at: string;
};

type LineVM = {
  reportItem: ReportItemRow;
  report: ReportRow | null;
  emissions: SupplierEmissionsRow | null;
  flags: {
    supplierActualVsDefault: "supplier_actual" | "default_fallback";
    actualVsEstimated: "actual" | "estimated";
    lockedVsEditable: "locked" | "editable";
  };
};

type SupplierVM = {
  supplier_key: string;
  supplier_name: string;
  supplier_reference?: string | null;
  report_ids: string[];
  line_count: number;
  locked_count: number;
  default_count: number;
  actual_count: number;
  total_embedded_tco2e: number;
};

function fmtNum(n: number | null | undefined, dp = 3) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

export default function EmissionsReviewPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"suppliers" | "lines">("suppliers");
  const [search, setSearch] = useState("");

  const [reportsById, setReportsById] = useState<Record<string, ReportRow>>({});
  const [lines, setLines] = useState<LineVM[]>([]);

  const quarterOptions = useMemo(() => {
    const uniq = new Set<string>();
    Object.values(reportsById).forEach((r) => {
      if (r?.quarter_year) uniq.add(r.quarter_year);
    });
    return Array.from(uniq).sort();
  }, [reportsById]);

  const [quarterFilter, setQuarterFilter] = useState<string>("");

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines
      .filter((l) => {
        if (!quarterFilter) return true;
        return (l.report?.quarter_year || "") === quarterFilter;
      })
      .filter((l) => {
        if (!q) return true;
        const ri = l.reportItem;
        return (
          (ri.supplier_name || "").toLowerCase().includes(q) ||
          (ri.supplier_reference || "").toLowerCase().includes(q) ||
          (ri.cn_code || "").toLowerCase().includes(q) ||
          (ri.goods_description || "").toLowerCase().includes(q) ||
          (l.report?.quarter_year || "").toLowerCase().includes(q)
        );
      });
  }, [lines, search, quarterFilter]);

  const suppliers = useMemo((): SupplierVM[] => {
    const map = new Map<string, SupplierVM>();

    for (const l of filteredLines) {
      const ri = l.reportItem;
      const key = `${ri.supplier_name}::${ri.supplier_reference || ""}`;
      const existing = map.get(key);
      const embedded = Number(l.emissions?.embedded_emissions_tco2e || 0);

      if (!existing) {
        map.set(key, {
          supplier_key: key,
          supplier_name: ri.supplier_name,
          supplier_reference: ri.supplier_reference || null,
          report_ids: l.report ? [l.report.id] : [],
          line_count: 1,
          locked_count: l.flags.lockedVsEditable === "locked" ? 1 : 0,
          default_count: l.flags.supplierActualVsDefault === "default_fallback" ? 1 : 0,
          actual_count: l.flags.supplierActualVsDefault === "supplier_actual" ? 1 : 0,
          total_embedded_tco2e: embedded,
        });
      } else {
        existing.line_count += 1;
        if (l.report && !existing.report_ids.includes(l.report.id)) existing.report_ids.push(l.report.id);
        if (l.flags.lockedVsEditable === "locked") existing.locked_count += 1;
        if (l.flags.supplierActualVsDefault === "default_fallback") existing.default_count += 1;
        if (l.flags.supplierActualVsDefault === "supplier_actual") existing.actual_count += 1;
        existing.total_embedded_tco2e += embedded;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total_embedded_tco2e - a.total_embedded_tco2e);
  }, [filteredLines]);

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

        const { data: reportItems, error: riErr } = await supabase.rpc("list_report_items_for_importer");
        if (riErr) throw riErr;

        const reportItemRows: ReportItemRow[] = (reportItems || []).map((r: any) => ({
          id: r.id,
          report_id: r.report_id,
          cn_code_id: r.cn_code_id,
          cn_code: r.cn_code ?? null,
          goods_description: r.goods_description ?? null,
          quantity: r.quantity ?? null,
          net_mass_kg: r.net_mass_kg ?? null,
          country_of_origin: r.country_of_origin ?? null,
          procedure_code: r.procedure_code ?? null,
          supplier_name: r.supplier_name,
          supplier_reference: r.supplier_reference ?? null,
        }));

        const reportIds = Array.from(new Set(reportItemRows.map((r) => r.report_id).filter(Boolean)));

        const reportsMap: Record<string, ReportRow> = {};
        if (reportIds.length) {
          const { data: reports, error: rErr } = await supabase
            .from("reports")
            .select("id, importer_org_id, quarter_year, status")
            .in("id", reportIds);

          if (rErr) throw rErr;
          (reports || []).forEach((r: any) => {
            reportsMap[r.id] = {
              id: r.id,
              importer_org_id: r.importer_org_id,
              quarter_year: r.quarter_year,
              status: r.status,
            };
          });
        }

        const reportItemIds = reportItemRows.map((r) => r.id);
        const emissionsMap: Record<string, SupplierEmissionsRow> = {};
        if (reportItemIds.length) {
          const { data: emissions, error: eErr } = await supabase
            .from("supplier_emissions")
            .select(
              "id, report_item_id, methodology, embedded_emissions_tco2e, direct_emissions_tco2e, indirect_emissions_tco2e, precursor_emissions_tco2e, electricity_mwh, updated_by_supplier, updated_at"
            )
            .in("report_item_id", reportItemIds);

          if (eErr) throw eErr;
          (emissions || []).forEach((e: any) => {
            emissionsMap[e.report_item_id] = {
              id: e.id,
              report_item_id: e.report_item_id,
              methodology: e.methodology ?? null,
              embedded_emissions_tco2e: e.embedded_emissions_tco2e ?? null,
              direct_emissions_tco2e: e.direct_emissions_tco2e ?? null,
              indirect_emissions_tco2e: e.indirect_emissions_tco2e ?? null,
              precursor_emissions_tco2e: e.precursor_emissions_tco2e ?? null,
              electricity_mwh: e.electricity_mwh ?? null,
              updated_by_supplier: Boolean(e.updated_by_supplier),
              updated_at: e.updated_at,
            };
          });
        }

        const lineVMs: LineVM[] = reportItemRows.map((ri) => {
          const report = reportsMap[ri.report_id] || null;
          const emissions = emissionsMap[ri.id] || null;

          const supplierActualVsDefault = emissions?.updated_by_supplier ? "supplier_actual" : "default_fallback";
          const actualVsEstimated = emissions?.updated_by_supplier && (emissions?.methodology || "").trim() ? "actual" : "estimated";

          const lockedVsEditable = report && (report.status || "").toLowerCase() !== "draft" ? "locked" : "editable";

          return {
            reportItem: ri,
            report,
            emissions,
            flags: {
              supplierActualVsDefault,
              actualVsEstimated,
              lockedVsEditable,
            },
          };
        });

        if (!cancelled) {
          setReportsById(reportsMap);
          setLines(lineVMs);
          setLoading(false);

          if (!quarterFilter) {
            const uniq = new Set<string>();
            Object.values(reportsMap).forEach((r) => {
              if (r?.quarter_year) uniq.add(r.quarter_year);
            });
            const opts = Array.from(uniq).sort();
            if (opts.length) setQuarterFilter(opts[opts.length - 1]);
          }
        }
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message ?? "Failed to load emissions review data.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const kpis = useMemo(() => {
    const total = filteredLines.length;
    const locked = filteredLines.filter((l) => l.flags.lockedVsEditable === "locked").length;
    const supplierActual = filteredLines.filter((l) => l.flags.supplierActualVsDefault === "supplier_actual").length;
    const defaultFallback = filteredLines.filter((l) => l.flags.supplierActualVsDefault === "default_fallback").length;
    const embedded = filteredLines.reduce((acc, l) => acc + Number(l.emissions?.embedded_emissions_tco2e || 0), 0);
    return { total, locked, supplierActual, defaultFallback, embedded };
  }, [filteredLines]);

  return (
    <div className="gsx-reviewRoot">
      <Head>
        <title>GrandScope | Emissions Review</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-reviewRoot{
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

        .gsx-tabs{ display:flex; gap:8px; }
        .gsx-tab{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:999px;
          border:1px solid #E5E7EB;
          background:#fff;
          font-size:13px;
          cursor:pointer;
          user-select:none;
        }
        .gsx-tabActive{ border-color:#111827; }

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

        .gsx-table{ width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; }
        .gsx-table th, .gsx-table td{
          padding:8px 6px;
          border-bottom:1px solid #E5E7EB;
          text-align:left;
          vertical-align:top;
          word-break:break-word;
        }
        .gsx-muted{ color:#6B7280; }

        .gsx-badge{
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
        .gsx-badgeLocked{ border-color:#9CA3AF; }
        .gsx-badgeEditable{ border-color:#D1D5DB; }
        .gsx-badgeActual{ border-color:#10B98133; }
        .gsx-badgeDefault{ border-color:#F59E0B33; }

        .gsx-small{ font-size:12px; }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-top">
          <h1 className="gsx-title">Emissions review</h1>
          <Link className="gsx-link" href="/app">Back</Link>
        </div>

        <section className="gsx-card">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-muted">{error}</div> : null}

          {!loading && !error ? (
            <>
              <div className="gsx-row">
                <div className="gsx-tabs">
                  <button
                    type="button"
                    className={`gsx-tab ${view === "suppliers" ? "gsx-tabActive" : ""}`}
                    onClick={() => setView("suppliers")}
                  >
                    Per supplier
                  </button>
                  <button
                    type="button"
                    className={`gsx-tab ${view === "lines" ? "gsx-tabActive" : ""}`}
                    onClick={() => setView("lines")}
                  >
                    Per import line
                  </button>
                </div>

                <div className="gsx-spacer" />

                <select className="gsx-select" value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)}>
                  <option value="">All quarters</option>
                  {quarterOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>

                <input
                  className="gsx-input"
                  placeholder="Search supplier, CN code, goods, quarter"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="gsx-kpis">
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Import lines</p>
                  <p className="gsx-kpiValue">{kpis.total.toLocaleString()}</p>
                </div>
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Locked</p>
                  <p className="gsx-kpiValue">{kpis.locked.toLocaleString()}</p>
                </div>
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Supplier actual</p>
                  <p className="gsx-kpiValue">{kpis.supplierActual.toLocaleString()}</p>
                </div>
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Default fallback</p>
                  <p className="gsx-kpiValue">{kpis.defaultFallback.toLocaleString()}</p>
                </div>
                <div className="gsx-kpi">
                  <p className="gsx-kpiLabel">Embedded tCO2e</p>
                  <p className="gsx-kpiValue">{fmtNum(kpis.embedded, 2)}</p>
                </div>
              </div>

              {view === "suppliers" ? (
                <table className="gsx-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Lines</th>
                      <th>Locked</th>
                      <th>Data source</th>
                      <th>Embedded tCO2e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.supplier_key}>
                        <td>
                          <div style={{ fontWeight: 900 }}>{s.supplier_name}</div>
                          <div className="gsx-muted gsx-small">{s.supplier_reference || "-"}</div>
                        </td>
                        <td>{s.line_count.toLocaleString()}</td>
                        <td>{s.locked_count.toLocaleString()}</td>
                        <td>
                          <span className={`gsx-badge gsx-badgeActual`}>Actual: {s.actual_count}</span>{" "}
                          <span className={`gsx-badge gsx-badgeDefault`}>Default: {s.default_count}</span>
                        </td>
                        <td>{fmtNum(s.total_embedded_tco2e, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="gsx-table">
                  <thead>
                    <tr>
                      <th>Quarter</th>
                      <th>Supplier</th>
                      <th>CN code</th>
                      <th>Qty</th>
                      <th>Net mass kg</th>
                      <th>Embedded tCO2e</th>
                      <th>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map((l) => {
                      const ri = l.reportItem;
                      const rep = l.report;
                      const em = l.emissions;
                      const lock = l.flags.lockedVsEditable;
                      const src = l.flags.supplierActualVsDefault;
                      const avs = l.flags.actualVsEstimated;

                      return (
                        <tr key={ri.id}>
                          <td>{rep?.quarter_year || "-"}</td>
                          <td>
                            <div style={{ fontWeight: 900 }}>{ri.supplier_name}</div>
                            <div className="gsx-muted gsx-small">{ri.supplier_reference || "-"}</div>
                          </td>
                          <td>{ri.cn_code || "-"}</td>
                          <td>{fmtNum(ri.quantity, 3)}</td>
                          <td>{fmtNum(ri.net_mass_kg, 3)}</td>
                          <td>{fmtNum(em?.embedded_emissions_tco2e ?? null, 3)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span className={`gsx-badge ${lock === "locked" ? "gsx-badgeLocked" : "gsx-badgeEditable"}`}>
                                {lock === "locked" ? `Locked (${rep?.status || ""})` : "Editable"}
                              </span>
                              <span className={`gsx-badge ${src === "supplier_actual" ? "gsx-badgeActual" : "gsx-badgeDefault"}`}>
                                {src === "supplier_actual" ? "Supplier actual" : "Default fallback"}
                              </span>
                              <span className="gsx-badge">{avs === "actual" ? "Actual" : "Estimated"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div className="gsx-muted" style={{ marginTop: 10, fontSize: 12 }}>
                Locked is derived from report status (non draft). Supplier actual vs default uses supplier_emissions.updated_by_supplier.
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/emissions-review.tsx (repo: eu-cbam-reporter/marketing)
