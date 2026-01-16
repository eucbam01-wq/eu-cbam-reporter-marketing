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
  created_at?: string;
};

type ImportRow = {
  id: string;
  importer_org_id: string;
  import_ref?: string | null;
  import_date?: string | null; // YYYY-MM-DD
};

type ImportLineRow = {
  id: string;
  import_id: string;
  importer_org_id: string;
  product_sku: string;
  cn_code: string;
  quantity?: number | null;
  net_mass_kg?: number | null;
  customs_value_eur?: number | null;
  country_of_origin?: string | null;
  procedure_code?: string | null;
  supplier_id?: string | null;
  supplier_portal_submission_id: string;
};

type SupplierRow = {
  id: string;
  importer_org_id: string;
  name: string;
};

type SupplierPortalSubmissionRow = {
  id: string;
  supplier_request_id: string;
  payload: any;
  submitted_at: string;
};

type LineVM = {
  line: ImportLineRow;
  import: ImportRow | null;
  supplier: SupplierRow | null;
  submission: SupplierPortalSubmissionRow | null;
  derived: {
    quarterYear: string;
    embedded_tco2e: number | null;
    supplierActualVsDefault: "supplier_actual" | "default_fallback";
    lockedVsEditable: "locked" | "editable";
  };
};

type SupplierVM = {
  supplier_key: string;
  supplier_name: string;
  import_line_count: number;
  locked_count: number;
  supplier_actual_count: number;
  default_fallback_count: number;
  total_embedded_tco2e: number;
};

function fmtNum(n: number | null | undefined, dp = 3) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

function toQuarterYear(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return `${y}Q${q}`;
}

function extractEmbeddedTco2e(payload: any): number | null {
  if (!payload) return null;
  const candidates = [
    payload?.embedded_emissions_tco2e,
    payload?.embedded_tco2e,
    payload?.total_embedded_tco2e,
    payload?.embedded_emissions,
    payload?.emissions?.embedded_emissions_tco2e,
    payload?.emissions?.embedded_tco2e,
    payload?.emissions?.total_embedded_tco2e,
    payload?.calculations?.embedded_emissions_tco2e,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return null;
}

function extractUpdatedBySupplier(payload: any): boolean | null {
  if (!payload) return null;
  const candidates = [
    payload?.updated_by_supplier,
    payload?.emissions?.updated_by_supplier,
    payload?.meta?.updated_by_supplier,
    payload?.submission?.updated_by_supplier,
  ];
  for (const v of candidates) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s == "true") return true
      if (s == "false") return false
    }
    if (typeof v == "number") {
      if (v == 1) return true
      if (v == 0) return false
    }
  }
  return null;
}

export default function EmissionsReviewPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"suppliers" | "lines">("suppliers");
  const [search, setSearch] = useState("");
  const [quarterFilter, setQuarterFilter] = useState<string>("");

  const [vms, setVMs] = useState<LineVM[]>([]);

  const quarterOptions = useMemo(() => {
    const uniq = new Set<string>();
    vms.forEach((v) => {
      if (v.derived.quarterYear && v.derived.quarterYear !== "-") uniq.add(v.derived.quarterYear);
    });
    return Array.from(uniq).sort();
  }, [vms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vms
      .filter((x) => {
        if (!quarterFilter) return true;
        return x.derived.quarterYear === quarterFilter;
      })
      .filter((x) => {
        if (!q) return true;
        const sup = x.supplier?.name || "";
        const sku = x.line.product_sku || "";
        const cn = x.line.cn_code || "";
        const origin = x.line.country_of_origin || "";
        const ref = x.import?.import_ref || "";
        const qy = x.derived.quarterYear || "";
        return (
          sup.toLowerCase().includes(q) ||
          sku.toLowerCase().includes(q) ||
          cn.toLowerCase().includes(q) ||
          origin.toLowerCase().includes(q) ||
          ref.toLowerCase().includes(q) ||
          qy.toLowerCase().includes(q)
        );
      });
  }, [vms, search, quarterFilter]);

  const suppliers = useMemo((): SupplierVM[] => {
    const map = new Map<string, SupplierVM>();
    for (const l of filtered) {
      const key = l.supplier?.id || `unknown::${l.line.supplier_id || ""}`;
      const name = l.supplier?.name || "-";
      const embedded = Number(l.derived.embedded_tco2e || 0);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          supplier_key: key,
          supplier_name: name,
          import_line_count: 1,
          locked_count: l.derived.lockedVsEditable === "locked" ? 1 : 0,
          supplier_actual_count: l.derived.supplierActualVsDefault === "supplier_actual" ? 1 : 0,
          default_fallback_count: l.derived.supplierActualVsDefault === "default_fallback" ? 1 : 0,
          total_embedded_tco2e: embedded,
        });
      } else {
        existing.import_line_count += 1;
        if (l.derived.lockedVsEditable === "locked") existing.locked_count += 1;
        if (l.derived.supplierActualVsDefault === "supplier_actual") existing.supplier_actual_count += 1;
        if (l.derived.supplierActualVsDefault === "default_fallback") existing.default_fallback_count += 1;
        existing.total_embedded_tco2e += embedded;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_embedded_tco2e - a.total_embedded_tco2e);
  }, [filtered]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const locked = filtered.filter((l) => l.derived.lockedVsEditable === "locked").length;
    const supplierActual = filtered.filter((l) => l.derived.supplierActualVsDefault === "supplier_actual").length;
    const defaultFallback = filtered.filter((l) => l.derived.supplierActualVsDefault === "default_fallback").length;
    const embedded = filtered.reduce((acc, l) => acc + Number(l.derived.embedded_tco2e || 0), 0);
    return { total, locked, supplierActual, defaultFallback, embedded };
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

        // Reports are used only to derive quarter lock state (non-draft report implies locked quarter).
        const { data: reports, error: rErr } = await supabase
          .from("reports")
          .select("id, importer_org_id, quarter_year, status, created_at")
          .order("created_at", { ascending: false });
        if (rErr) throw rErr;

        const lockedQuarterByOrg = new Map<string, Set<string>>();
        (reports || []).forEach((r: any) => {
          const org = String(r.importer_org_id || "");
          const qy = String(r.quarter_year || "");
          const status = String(r.status || "").toLowerCase();
          if (!org || !qy) return;
          if (status !== "draft") {
            if (!lockedQuarterByOrg.has(org)) lockedQuarterByOrg.set(org, new Set());
            lockedQuarterByOrg.get(org)!.add(qy);
          }
        });

        const { data: imports, error: iErr } = await supabase.from("imports").select("id, importer_org_id, import_ref, import_date");
        if (iErr) throw iErr;

        const importById = new Map<string, ImportRow>();
        (imports || []).forEach((im: any) => {
          if (!im?.id) return;
          importById.set(im.id, {
            id: im.id,
            importer_org_id: im.importer_org_id,
            import_ref: im.import_ref ?? null,
            import_date: im.import_date ?? null,
          });
        });

        const { data: lines, error: lErr } = await supabase
          .from("import_lines")
          .select(
            "id, import_id, importer_org_id, product_sku, cn_code, quantity, net_mass_kg, customs_value_eur, country_of_origin, procedure_code, supplier_id, supplier_portal_submission_id"
          );
        if (lErr) throw lErr;

        const supplierIds = Array.from(new Set((lines || []).map((x: any) => x.supplier_id).filter(Boolean)));
        const submissionIds = Array.from(new Set((lines || []).map((x: any) => x.supplier_portal_submission_id).filter(Boolean)));

        const suppliersMap = new Map<string, SupplierRow>();
        if (supplierIds.length) {
          const { data: suppliersData, error: sErr } = await supabase.from("suppliers").select("id, importer_org_id, name").in("id", supplierIds);
          if (sErr) throw sErr;
          (suppliersData || []).forEach((s: any) => {
            suppliersMap.set(s.id, { id: s.id, importer_org_id: s.importer_org_id, name: s.name });
          });
        }

        const submissionsMap = new Map<string, SupplierPortalSubmissionRow>();
        if (submissionIds.length) {
          const { data: subsData, error: subErr } = await supabase
            .from("supplier_portal_submissions")
            .select("id, supplier_request_id, payload, submitted_at")
            .in("id", submissionIds);
          if (subErr) throw subErr;
          (subsData || []).forEach((s: any) => {
            submissionsMap.set(s.id, {
              id: s.id,
              supplier_request_id: s.supplier_request_id,
              payload: s.payload,
              submitted_at: s.submitted_at,
            });
          });
        }

        const built: LineVM[] = (lines || []).map((l: any) => {
          const imp = importById.get(l.import_id) || null;
          const supplier = l.supplier_id ? suppliersMap.get(l.supplier_id) || null : null;
          const submission = l.supplier_portal_submission_id ? submissionsMap.get(l.supplier_portal_submission_id) || null : null;

          const quarterYear = toQuarterYear(imp?.import_date || null);

          const embedded_tco2e = extractEmbeddedTco2e(submission?.payload);

          const updatedBySupplier = extractUpdatedBySupplier(submission?.payload);
          const supplierActualVsDefault = updatedBySupplier === false ? "default_fallback" : "supplier_actual";

          const isLockedQuarter = Boolean(imp?.importer_org_id && quarterYear && lockedQuarterByOrg.get(String(imp.importer_org_id))?.has(quarterYear));
          const lockedVsEditable = isLockedQuarter ? "locked" : "editable";

          return {
            line: {
              id: l.id,
              import_id: l.import_id,
              importer_org_id: l.importer_org_id,
              product_sku: l.product_sku,
              cn_code: l.cn_code,
              quantity: l.quantity ?? null,
              net_mass_kg: l.net_mass_kg ?? null,
              customs_value_eur: l.customs_value_eur ?? null,
              country_of_origin: l.country_of_origin ?? null,
              procedure_code: l.procedure_code ?? null,
              supplier_id: l.supplier_id ?? null,
              supplier_portal_submission_id: l.supplier_portal_submission_id,
            },
            import: imp,
            supplier,
            submission,
            derived: {
              quarterYear,
              embedded_tco2e,
              supplierActualVsDefault,
              lockedVsEditable,
            },
          };
        });

        if (!cancelled) {
          setVMs(built);
          setLoading(false);

          if (!quarterFilter) {
            const opts = Array.from(new Set(built.map((b) => b.derived.quarterYear).filter((x) => x && x !== "-"))).sort();
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
                  <button type="button" className={`gsx-tab ${view === "suppliers" ? "gsx-tabActive" : ""}`} onClick={() => setView("suppliers")}>
                    Per supplier
                  </button>
                  <button type="button" className={`gsx-tab ${view === "lines" ? "gsx-tabActive" : ""}`} onClick={() => setView("lines")}>
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

                <input className="gsx-input" placeholder="Search supplier, CN code, SKU, origin, import ref" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                          <div className="gsx-muted gsx-small">{s.supplier_key.startsWith("unknown") ? "-" : s.supplier_key}</div>
                        </td>
                        <td>{s.import_line_count.toLocaleString()}</td>
                        <td>{s.locked_count.toLocaleString()}</td>
                        <td>
                          <span className="gsx-badge gsx-badgeActual">Actual: {s.supplier_actual_count}</span>{" "}
                          <span className="gsx-badge gsx-badgeDefault">Default: {s.default_fallback_count}</span>
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
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Net mass kg</th>
                      <th>Embedded tCO2e</th>
                      <th>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => {
                      const lock = v.derived.lockedVsEditable;
                      const src = v.derived.supplierActualVsDefault;
                      return (
                        <tr key={v.line.id}>
                          <td>{v.derived.quarterYear}</td>
                          <td>
                            <div style={{ fontWeight: 900 }}>{v.supplier?.name || "-"}</div>
                            <div className="gsx-muted gsx-small">{v.import?.import_ref || "-"}</div>
                          </td>
                          <td>{v.line.cn_code}</td>
                          <td>{v.line.product_sku}</td>
                          <td>{fmtNum(v.line.quantity ?? null, 3)}</td>
                          <td>{fmtNum(v.line.net_mass_kg ?? null, 3)}</td>
                          <td>{fmtNum(v.derived.embedded_tco2e ?? null, 3)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span className={`gsx-badge ${lock === "locked" ? "gsx-badgeLocked" : "gsx-badgeEditable"}`}>{lock === "locked" ? "Locked" : "Editable"}</span>
                              <span className={`gsx-badge ${src === "supplier_actual" ? "gsx-badgeActual" : "gsx-badgeDefault"}`}>{src === "supplier_actual" ? "Supplier actual" : "Default fallback"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div className="gsx-muted" style={{ marginTop: 10, fontSize: 12 }}>
                Locked is derived from presence of a non-draft report for the same importer org and quarter. Data source is derived from supplier_portal_submissions.payload.
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/emissions-review.tsx (repo: eu-cbam-reporter/marketing)
