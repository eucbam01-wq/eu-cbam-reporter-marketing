// FILE: marketing/pages/importer/certificates/purchases.tsx (repo: eu-cbam-reporter/marketing)

import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LABEL, getActivePlanTier, isEntitled, requiredTierForFeature } from "../../../src/entitlements";

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

function fmtNum(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

export default function CertificatePurchasesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const planTier = getActivePlanTier();
  const required = requiredTierForFeature("CERTIFICATES");
  const allowed = isEntitled(planTier, required);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [rows, setRows] = useState<PurchaseRow[]>([]);

  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [purchaseYear, setPurchaseYear] = useState<string>("");
  const [purchaseQty, setPurchaseQty] = useState<string>("");
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>("");
  const [purchaseNotes, setPurchaseNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const orgOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of reports) {
      if (r.importer_org_id) s.add(String(r.importer_org_id));
    }
    return Array.from(s).sort();
  }, [reports]);

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
          .select("id, importer_org_id, created_at")
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
          }));

        if (cancelled) return;

        setReports(mapped);
        setOrgId((prev) => (prev ? prev : mapped[0]?.importer_org_id || ""));
      } catch (ex: any) {
        if (!cancelled) setError(ex?.message || String(ex));
      } finally {
        if (!cancelled) setLoading(false);
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
      if (!orgId) {
        setRows([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: purchases, error: pErr } = await supabase
          .from("cbam_certificate_purchases")
          .select("id, importer_org_id, purchase_date, year, certificates_purchased, unit_price_eur, notes, created_at")
          .eq("importer_org_id", orgId)
          .order("purchase_date", { ascending: false })
          .limit(1000);
        if (pErr) throw pErr;

        if (cancelled) return;
        setRows((Array.isArray(purchases) ? purchases : []) as PurchaseRow[]);

        if (!purchaseYear) {
          const y = new Date().getUTCFullYear();
          setPurchaseYear(String(y));
        }
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
  }, [supabase, orgId, purchaseYear]);

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

      setRows((Array.isArray(purchases) ? purchases : []) as PurchaseRow[]);
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
          <title>Purchases | Locked</title>
        </Head>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Certificate purchases</div>
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
        <title>GrandScope | Certificate purchases</title>
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
        .gsx-err {
          border: 1px solid rgba(255, 90, 90, 0.35);
          background: rgba(255, 90, 90, 0.08);
          color: rgba(255, 220, 220, 0.95);
          padding: 10px 12px;
          border-radius: 12px;
          margin-top: 12px;
          font-size: 13px;
        }
        .gsx-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .gsx-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .gsx-label {
          font-size: 12px;
          color: rgba(234, 240, 255, 0.65);
        }
        .gsx-input {
          border: 1px solid rgba(132, 160, 255, 0.35);
          background: rgba(15, 23, 42, 0.65);
          color: #eaf0ff;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          min-width: 160px;
        }
        .gsx-btn {
          appearance: none;
          border: 1px solid rgba(66, 255, 214, 0.45);
          background: rgba(66, 255, 214, 0.12);
          color: rgba(234, 240, 255, 0.95);
          padding: 9px 12px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .gsx-btn[disabled] {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>

      <div className="gsx-shell">
        <div className="gsx-head">
          <div>
            <h1 className="gsx-title">Certificate purchases</h1>
            <p className="gsx-sub">Purchases recorded per importer and year.</p>
          </div>
          <div className="gsx-actions">
            <Link className="gsx-link" href="/importer/certificates">
              Back to certificates
            </Link>
            <select className="gsx-select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgOptions.map((o) => (
                <option key={o} value={o}>
                  Org: {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="gsx-err">{error}</div> : null}

        <div className="gsx-card">
          <div className="gsx-form">
            <div className="gsx-field">
              <div className="gsx-label">Purchase date</div>
              <input className="gsx-input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="gsx-field">
              <div className="gsx-label">Year</div>
              <input className="gsx-input" value={purchaseYear} onChange={(e) => setPurchaseYear(e.target.value)} placeholder="2026" />
            </div>
            <div className="gsx-field">
              <div className="gsx-label">Certificates purchased</div>
              <input className="gsx-input" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} placeholder="0" />
            </div>
            <div className="gsx-field">
              <div className="gsx-label">Unit price EUR (optional)</div>
              <input className="gsx-input" value={purchaseUnitPrice} onChange={(e) => setPurchaseUnitPrice(e.target.value)} placeholder="90" />
            </div>
            <div className="gsx-field" style={{ minWidth: 260 }}>
              <div className="gsx-label">Notes (optional)</div>
              <input className="gsx-input" value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} placeholder="Reference / broker / invoice" />
            </div>
            <button className="gsx-btn" disabled={saving} onClick={addPurchase}>
              {saving ? "Saving" : "Add purchase"}
            </button>
          </div>

          {saveErr ? <div className="gsx-err">{saveErr}</div> : null}

          <table className="gsx-table">
            <thead>
              <tr>
                <th>Purchase date</th>
                <th>Year</th>
                <th>Certificates</th>
                <th>Unit price EUR</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "rgba(234,240,255,0.65)" }}>
                    {loading ? "Loading" : "No purchases"}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.purchase_date}</td>
                    <td>{r.year}</td>
                    <td>{fmtNum(r.certificates_purchased, 0)}</td>
                    <td>{r.unit_price_eur === null ? "-" : fmtNum(r.unit_price_eur, 2)}</td>
                    <td>{r.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// FILE: marketing/pages/importer/certificates/purchases.tsx (repo: eu-cbam-reporter/marketing)
