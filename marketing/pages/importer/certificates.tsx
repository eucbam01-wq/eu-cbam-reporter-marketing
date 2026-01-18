// FILE: marketing/pages/importer/certificates.tsx (repo: eu-cbam-reporter/marketing)

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

  report_year: number | null;

  total_tco2e: number | null;

  year: number | null;

  price_per_tonne_eur: number | null;

  estimated_certificate_cost_eur: number | null;

};



type CoverageRow = {

  report_id: string;

  importer_org_id: string;

  certificates_required: number | null;

  certificates_purchased: number | null;

  certificates_gap: number | null;

};



type PurchaseRow = {

  id: string;

  importer_org_id: string;

  purchase_date: string;

  year: number;

  certificates_purchased: number;

  unit_price_eur: number | null;

  notes: string | null;

  created_at: string;

};



type CarryRow = {

  importer_org_id: string;

  year: number;

  certificates_required: number | null;

  certificates_purchased: number | null;

  net_for_year: number | null;

  cumulative_balance: number | null;

  carryover_available: number | null;

};



type TabKey = "coverage" | "purchases" | "forecast";



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



function yearFromISO(iso: string | null | undefined): number | null {

  if (!iso) return null;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return null;

  return d.getUTCFullYear();

}



export default function CertificatesPage() {

  const supabase = useMemo(() => getSupabase(), []);

  const planTier = getActivePlanTier();
  const required = requiredTierForFeature("CERTIFICATES");
  const allowed = isEntitled(planTier, required);



  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  const [tab, setTab] = useState<TabKey>("coverage");



  const [reports, setReports] = useState<ReportRow[]>([]);

  const [orgId, setOrgId] = useState<string>("");

  const [year, setYear] = useState<number | null>(null);



  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);

  const [coverageRows, setCoverageRows] = useState<CoverageRow[]>([]);

  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);

  const [carryRows, setCarryRows] = useState<CarryRow[]>([]);



  const [purchaseDate, setPurchaseDate] = useState<string>("");

  const [purchaseYear, setPurchaseYear] = useState<string>("");

  const [purchaseQty, setPurchaseQty] = useState<string>("");

  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>("");

  const [purchaseNotes, setPurchaseNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);

  const [saveErr, setSaveErr] = useState<string | null>(null);



  const yearOptions = useMemo(() => {

    const s = new Set<number>();

    for (const r of reports) {

      const y = yearFromISO(r.created_at);

      if (y) s.add(y);

    }

    return Array.from(s).sort((a, b) => b - a);

  }, [reports]);



  const orgOptions = useMemo(() => {

    const s = new Set<string>();

    for (const r of reports) {

      if (r.importer_org_id) s.add(String(r.importer_org_id));

    }

    return Array.from(s).sort();

  }, [reports]);



  const reportIdsForFilters = useMemo(() => {

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



  const kpis = useMemo(() => {

    const required = coverageRows.reduce((acc, r) => acc + Number(r.certificates_required || 0), 0);

    const purchased = coverageRows.reduce((acc, r) => acc + Number(r.certificates_purchased || 0), 0);

    const gap = coverageRows.reduce((acc, r) => acc + Number(r.certificates_gap || 0), 0);



    const estCost = forecastRows.reduce((acc, r) => acc + Number(r.estimated_certificate_cost_eur || 0), 0);



    return { required, purchased, gap, estCost };

  }, [coverageRows, forecastRows]);



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

      if (!orgId || reportIdsForFilters.length === 0) {

        setForecastRows([]);

        setCoverageRows([]);

        setPurchaseRows([]);

        setCarryRows([]);

        return;

      }



      try {

        setLoading(true);

        setError(null);



        const { data: forecast, error: fErr } = await supabase

          .from("cbam_certificate_forecast")

          .select("report_id, report_year, total_tco2e, year, price_per_tonne_eur, estimated_certificate_cost_eur")

          .in("report_id", reportIdsForFilters)

          .limit(5000);

        if (fErr) throw fErr;



        const { data: coverage, error: cErr } = await supabase

          .from("cbam_certificate_coverage")

          .select("report_id, importer_org_id, certificates_required, certificates_purchased, certificates_gap")

          .in("report_id", reportIdsForFilters)

          .limit(5000);

        if (cErr) throw cErr;





        const { data: carry, error: carryErr } = await supabase

          .from("cbam_certificate_carryover")

          .select("importer_org_id, year, certificates_required, certificates_purchased, net_for_year, cumulative_balance, carryover_available")

          .eq("importer_org_id", orgId)

          .order("year", { ascending: false })

          .limit(50);

        if (carryErr) throw carryErr;

        const { data: purchases, error: pErr } = await supabase

          .from("cbam_certificate_purchases")

          .select("id, importer_org_id, purchase_date, year, certificates_purchased, unit_price_eur, notes, created_at")

          .eq("importer_org_id", orgId)

          .order("purchase_date", { ascending: false })

          .limit(1000);

        if (pErr) throw pErr;



        if (cancelled) return;



        setForecastRows((Array.isArray(forecast) ? forecast : []) as ForecastRow[]);

        setCoverageRows((Array.isArray(coverage) ? coverage : []) as CoverageRow[]);

        setPurchaseRows((Array.isArray(purchases) ? purchases : []) as PurchaseRow[]);



        if (!purchaseYear && year !== null) setPurchaseYear(String(year));

      } catch (ex: any) {

        if (!cancelled) {

          setError(ex?.message || String(ex));

          setLoading(false);

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    }



    load();

    return () => {

      cancelled = true;

    };

  }, [supabase, orgId, year, reportIdsForFilters, purchaseYear]);



  async function addPurchase() {

    setSaveErr(null);



    if (!orgId) {

      setSaveErr("Missing importer_org_id");

      return;

    }



    const qty = Number(purchaseQty);

    const yr = Number(purchaseYear);



    if (!purchaseDate) {

      setSaveErr("Missing purchase date");

      return;

    }

    if (!purchaseYear || Number.isNaN(yr) || yr < 2000 || yr > 2100) {

      setSaveErr("Invalid year");

      return;

    }

    if (!purchaseQty || Number.isNaN(qty) || qty < 0) {

      setSaveErr("Invalid certificates_purchased");

      return;

    }



    const unit = purchaseUnitPrice.trim() ? Number(purchaseUnitPrice) : null;

    if (unit !== null && (Number.isNaN(unit) || unit < 0)) {

      setSaveErr("Invalid unit price");

      return;

    }



    setSaving(true);

    try {

      const { error } = await supabase.from("cbam_certificate_purchases").insert({

        importer_org_id: orgId,

        purchase_date: purchaseDate,

        year: yr,

        certificates_purchased: qty,

        unit_price_eur: unit,

        notes: purchaseNotes.trim() ? purchaseNotes.trim() : null,

      });

      if (error) throw error;



      setPurchaseNotes("");

      setPurchaseQty("");

      setPurchaseUnitPrice("");



      const { data: purchases, error: pErr } = await supabase

        .from("cbam_certificate_purchases")

        .select("id, importer_org_id, purchase_date, year, certificates_purchased, unit_price_eur, notes, created_at")

        .eq("importer_org_id", orgId)

        .order("purchase_date", { ascending: false })

        .limit(1000);

      if (pErr) throw pErr;



      setPurchaseRows((Array.isArray(purchases) ? purchases : []) as PurchaseRow[]);

    } catch (ex: any) {

      setSaveErr(ex?.message || String(ex));

    } finally {

      setSaving(false);

    }

  }



  if (!allowed) {
    return (
      <div style={{ padding: 20 }}>
        <Head>
          <title>Certificates | Locked</title>
        </Head>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Certificates</div>
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

        <title>GrandScope | Certificates</title>

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

        .gsx-tabs {

          display: flex;

          gap: 10px;

          align-items: center;

          flex-wrap: wrap;

          margin-top: 10px;

        }

        .gsx-tab {

          appearance: none;

          border: 1px solid rgba(132, 160, 255, 0.35);

          background: rgba(15, 23, 42, 0.65);

          color: rgba(234, 240, 255, 0.95);

          padding: 8px 10px;

          border-radius: 999px;

          font-size: 13px;

          cursor: pointer;

        }

        .gsx-tabActive {

          border-color: rgba(66, 255, 214, 0.55);

          box-shadow: 0 0 0 1px rgba(66, 255, 214, 0.22);

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

          min-width: 180px;

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

          color: rgba(234, 240, 255, 0.62);

          font-size: 13px;

        }

        .gsx-form {

          display: grid;

          grid-template-columns: 1fr;

          gap: 10px;

          margin-top: 10px;

        }

        @media (min-width: 980px) {

          .gsx-form {

            grid-template-columns: repeat(5, 1fr);

          }

        }

        .gsx-input {

          width: 100%;

          appearance: none;

          border: 1px solid rgba(132, 160, 255, 0.35);

          background: rgba(15, 23, 42, 0.65);

          color: #eaf0ff;

          padding: 8px 10px;

          border-radius: 10px;

          font-size: 13px;

          outline: none;

        }

        .gsx-btn {

          appearance: none;

          border: 1px solid rgba(66, 255, 214, 0.5);

          background: rgba(66, 255, 214, 0.12);

          color: #eaf0ff;

          padding: 10px 12px;

          border-radius: 12px;

          font-weight: 800;

          cursor: pointer;

        }

      `}</style>



      <div className="gsx-shell">

        <div className="gsx-head">

          <div>

            <h1 className="gsx-title">Certificates</h1>

            <p className="gsx-sub">Forecast, purchases, coverage and gap.</p>

          </div>



          <div className="gsx-actions">

            <Link className="gsx-link" href="/app">Command Center</Link>

            <Link className="gsx-link" href="/importer/exposure-dashboard">Exposure dashboard</Link>

          </div>

        </div>



        <div className="gsx-card">

          <div className="gsx-actions" style={{ justifyContent: "flex-start" }}>

            <select className="gsx-select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>

              {orgOptions.length === 0 ? <option value="">No org</option> : null}

              {orgOptions.map((o) => (

                <option key={o} value={o}>

                  Org: {o}

                </option>

              ))}

            </select>



            <select className="gsx-select" value={year === null ? "" : String(year)} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>

              {yearOptions.length === 0 ? <option value="">No year</option> : null}

              {yearOptions.map((y) => (

                <option key={y} value={String(y)}>

                  Year: {y}

                </option>

              ))}

            </select>



            <span className="gsx-muted">Reports: {reportIdsForFilters.length.toLocaleString()}</span>

          </div>



          <div className="gsx-tabs">

            <button className={`gsx-tab ${tab === "coverage" ? "gsx-tabActive" : ""}`} onClick={() => setTab("coverage")}>

              Coverage + gap

            </button>

            <button className={`gsx-tab ${tab === "purchases" ? "gsx-tabActive" : ""}`} onClick={() => setTab("purchases")}>

              Purchases

            </button>

            <button className={`gsx-tab ${tab === "forecast" ? "gsx-tabActive" : ""}`} onClick={() => setTab("forecast")}>

              Forecast

            </button>

          </div>



          <div className="gsx-kpis">

            <div className="gsx-kpi">

              <p className="gsx-kpiLabel">Certificates required</p>

              <p className="gsx-kpiValue">{fmtNum(kpis.required, 2)}</p>

            </div>

            <div className="gsx-kpi">

              <p className="gsx-kpiLabel">Certificates purchased</p>

              <p className="gsx-kpiValue">{fmtNum(kpis.purchased, 2)}</p>

            </div>

            <div className="gsx-kpi">

              <p className="gsx-kpiLabel">Gap (positive = surplus)</p>

              <p className="gsx-kpiValue">{fmtNum(kpis.gap, 2)}</p>

            </div>

            <div className="gsx-kpi">

              <p className="gsx-kpiLabel">Estimated cost (EUR)</p>

              <p className="gsx-kpiValue">{fmtMoneyEUR(kpis.estCost)}</p>

            </div>

          </div>



          {loading ? <div className="gsx-card gsx-muted">Loading...</div> : null}

          {error ? <div className="gsx-card gsx-muted">{error}</div> : null}



          {!loading && !error && tab === "coverage" ? (

            <div className="gsx-card">

              <div style={{ fontWeight: 900, marginBottom: 6 }}>Coverage by report</div>

              <table className="gsx-table">

                <thead>

                  <tr>

                    <th>Report</th>

                    <th>Required</th>

                    <th>Purchased</th>

                    <th>Gap</th>

                  </tr>

                </thead>

                <tbody>

                  {coverageRows.length === 0 ? (

                    <tr>

                      <td colSpan={4} className="gsx-muted">

                        No data

                      </td>

                    </tr>

                  ) : (

                    coverageRows.map((r) => (

                      <tr key={r.report_id}>

                        <td style={{ fontWeight: 900 }}>{r.report_id}</td>

                        <td>{fmtNum(r.certificates_required, 2)}</td>

                        <td>{fmtNum(r.certificates_purchased, 2)}</td>

                        <td>{fmtNum(r.certificates_gap, 2)}</td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>



              <div style={{ fontWeight: 900, marginTop: 14, marginBottom: 6 }}>Carryover (cumulative balance)</div>

              <table className="gsx-table">

                <thead>

                  <tr>

                    <th>Year</th>

                    <th>Required</th>

                    <th>Purchased</th>

                    <th>Net</th>

                    <th>Cumulative</th>

                    <th>Carryover</th>

                  </tr>

                </thead>

                <tbody>

                  {carryRows.length === 0 ? (

                    <tr>

                      <td colSpan={6} className="gsx-muted">

                        No carryover data

                      </td>

                    </tr>

                  ) : (

                    carryRows.map((c) => (

                      <tr key={String(c.year)}>

                        <td style={{ fontWeight: 900 }}>{c.year}</td>

                        <td>{fmtNum(c.certificates_required, 2)}</td>

                        <td>{fmtNum(c.certificates_purchased, 2)}</td>

                        <td>{fmtNum(c.net_for_year, 2)}</td>

                        <td>{fmtNum(c.cumulative_balance, 2)}</td>

                        <td>{fmtNum(c.carryover_available, 2)}</td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          ) : null}



          {!loading && !error && tab === "forecast" ? (

            <div className="gsx-card">

              <div style={{ fontWeight: 900, marginBottom: 6 }}>Forecast by report</div>

              <table className="gsx-table">

                <thead>

                  <tr>

                    <th>Report</th>

                    <th>Total tCO2e</th>

                    <th>ETS price</th>

                    <th>Estimated cost</th>

                  </tr>

                </thead>

                <tbody>

                  {forecastRows.length === 0 ? (

                    <tr>

                      <td colSpan={4} className="gsx-muted">

                        No data

                      </td>

                    </tr>

                  ) : (

                    forecastRows.map((r) => (

                      <tr key={r.report_id}>

                        <td style={{ fontWeight: 900 }}>{r.report_id}</td>

                        <td>{fmtNum(r.total_tco2e, 2)}</td>

                        <td>{fmtMoneyEUR(r.price_per_tonne_eur)}</td>

                        <td>{fmtMoneyEUR(r.estimated_certificate_cost_eur)}</td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

              <div className="gsx-muted" style={{ marginTop: 8 }}>

                Source: public.cbam_certificate_forecast

              </div>

            </div>

          ) : null}



          {!loading && !error && tab === "purchases" ? (

            <div className="gsx-card">

              <div style={{ fontWeight: 900, marginBottom: 6 }}>Add purchase</div>



              <div className="gsx-form">

                <input className="gsx-input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} placeholder="purchase_date" />

                <input className="gsx-input" value={purchaseYear} onChange={(e) => setPurchaseYear(e.target.value)} placeholder="year" />

                <input className="gsx-input" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} placeholder="certificates_purchased" />

                <input className="gsx-input" value={purchaseUnitPrice} onChange={(e) => setPurchaseUnitPrice(e.target.value)} placeholder="unit_price_eur (optional)" />

                <input className="gsx-input" value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} placeholder="notes (optional)" />

              </div>



              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>

                <button className="gsx-btn" disabled={saving} onClick={() => void addPurchase()}>

                  {saving ? "Saving..." : "Add purchase"}

                </button>

                {saveErr ? <span className="gsx-muted">{saveErr}</span> : null}

              </div>



              <div style={{ fontWeight: 900, marginTop: 14 }}>Purchase ledger</div>

              <table className="gsx-table">

                <thead>

                  <tr>

                    <th>Date</th>

                    <th>Year</th>

                    <th>Certificates</th>

                    <th>Unit price</th>

                    <th>Notes</th>

                  </tr>

                </thead>

                <tbody>

                  {purchaseRows.length === 0 ? (

                    <tr>

                      <td colSpan={5} className="gsx-muted">

                        No purchases

                      </td>

                    </tr>

                  ) : (

                    purchaseRows.map((p) => (

                      <tr key={p.id}>

                        <td style={{ fontWeight: 900 }}>{p.purchase_date}</td>

                        <td>{p.year}</td>

                        <td>{fmtNum(p.certificates_purchased, 2)}</td>

                        <td>{p.unit_price_eur === null ? "-" : fmtMoneyEUR(p.unit_price_eur)}</td>

                        <td>{p.notes || "-"}</td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

              <div className="gsx-muted" style={{ marginTop: 8 }}>

                Table: public.cbam_certificate_purchases

              </div>

            </div>

          ) : null}

        </div>

      </div>

    </div>

  );

}

// FILE: marketing/pages/importer/certificates.tsx (repo: eu-cbam-reporter/marketing)

