// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\supplier-links.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type SupplierRequestRow = {
  supplier_request_id: string;
  report_id: string | null;
  report_item_id: string | null;
  supplier_id: string | null;

  supplier_name: string | null;
  supplier_email: string | null;

  cn_code: string | null;
  goods_description: string | null;
  quantity: number | null;
  net_mass_kg: number | null;
  country_of_origin: string | null;
  procedure_code: string | null;

  status: string | null;
  used_count: number | null;
  max_uses: number | null;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  token_expires_at: string | null;
  created_at: string | null;
};

type TokenIssueResult = {
  plaintext_token: string;
  full_url: string;
  supplier_request_id: string;
  token_hash: string;
  token_expires_at: string;
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

function safeNum(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  if (typeof v !== "number") return String(v);
  return String(v);
}

function clip(v: string | null | undefined, n: number) {
  const s = (v || "").trim();
  if (!s) return "-";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function isIssuableStatus(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  return s === "draft" || s === "sent";
}

export default function ImporterSupplierLinksPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [rows, setRows] = useState<SupplierRequestRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [issued, setIssued] = useState<TokenIssueResult | null>(null);
  const [issueErr, setIssueErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          window.location.assign("/login");
          return;
        }

        const { data, error } = await supabase.rpc("list_supplier_requests_for_importer");
        if (error) throw error;

        const list = Array.isArray(data) ? (data as SupplierRequestRow[]) : [];
        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function issueTokenForRequest(supplierRequestId: string) {
    setIssuingId(supplierRequestId);
    setIssued(null);
    setIssueErr(null);

    try {
      const { data, error } = await supabase.rpc("create_supplier_portal_token_for_request", {
        p_supplier_request_id: supplierRequestId,
      });
      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as TokenIssueResult | null;
      if (!result?.full_url || !result?.plaintext_token) throw new Error("Token generation returned no url/token");
      setIssued(result);
    } catch (e: any) {
      setIssueErr(e?.message || String(e));
    } finally {
      setIssuingId(null);
    }
  }

  function closeIssued() {
    setIssued(null);
    setIssueErr(null);
  }

  function copyToClipboard(v: string) {
    try {
      void navigator.clipboard.writeText(v);
    } catch {
      // ignore
    }
  }

  return (
    <div className="gsx-importerRoot">
      <Head>
        <title>GrandScope | Supplier links</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx>{`
        .gsx-importerRoot {
          min-height: 100vh;
          background: #05070d;
          color: #eaf0ff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
        }
        .gsx-shell {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 16px 44px;
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
        .gsx-btn {
          appearance: none;
          border: 1px solid rgba(132, 160, 255, 0.35);
          background: rgba(132, 160, 255, 0.08);
          color: #eaf0ff;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          text-decoration: none;
          user-select: none;
        }
        .gsx-btn:hover {
          border-color: rgba(132, 160, 255, 0.55);
          background: rgba(132, 160, 255, 0.12);
        }
        .gsx-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .gsx-card {
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          overflow: hidden;
        }
        .gsx-tableWrap {
          width: 100%;
          overflow: auto;
        }
        table.gsx-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }
        .gsx-table th,
        .gsx-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 10px;
          text-align: left;
          vertical-align: top;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(234, 240, 255, 0.92);
          white-space: nowrap;
        }
        .gsx-table th {
          color: rgba(234, 240, 255, 0.72);
          font-weight: 600;
          background: rgba(255, 255, 255, 0.02);
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .gsx-muted {
          color: rgba(234, 240, 255, 0.65);
        }
        .gsx-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.18);
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
        }
        .gsx-pillGood {
          border-color: rgba(64, 255, 170, 0.35);
          background: rgba(64, 255, 170, 0.10);
        }
        .gsx-pillBad {
          border-color: rgba(255, 96, 96, 0.35);
          background: rgba(255, 96, 96, 0.10);
        }
        .gsx-error {
          margin: 12px 0 0;
          padding: 12px 12px;
          border: 1px solid rgba(255, 96, 96, 0.35);
          background: rgba(255, 96, 96, 0.08);
          border-radius: 12px;
          font-size: 13px;
          white-space: pre-wrap;
        }
        .gsx-modalBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 50;
        }
        .gsx-modal {
          width: 100%;
          max-width: 720px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(5, 7, 13, 0.98);
          border-radius: 16px;
          overflow: hidden;
        }
        .gsx-modalHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
        }
        .gsx-modalTitle {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }
        .gsx-modalBody {
          padding: 14px 14px 16px;
        }
        .gsx-fieldLabel {
          display: block;
          font-size: 12px;
          color: rgba(234, 240, 255, 0.70);
          margin: 10px 0 6px;
        }
        .gsx-fieldBox {
          display: flex;
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 10px 10px;
          font-size: 12px;
          overflow: auto;
        }
        .gsx-fieldBox code {
          color: rgba(234, 240, 255, 0.92);
        }
        .gsx-spacer {
          height: 10px;
        }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-head">
          <div>
            <h1 className="gsx-title">Supplier links</h1>
            <p className="gsx-sub">Read-only list of supplier requests. Issue a link only when status is draft or sent.</p>
          </div>
          <div className="gsx-actions">
            <a className="gsx-btn" href="/app">
              Back to app
            </a>
            <a className="gsx-btn" href="/importer/create-link">
              Create link
            </a>
          </div>
        </div>

        {err ? <div className="gsx-error">{err}</div> : null}

        <section className="gsx-card" aria-label="Supplier requests">
          <div className="gsx-tableWrap">
            <table className="gsx-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>CN</th>
                  <th>Goods</th>
                  <th>Qty</th>
                  <th>Net kg</th>
                  <th>Origin</th>
                  <th>Proc</th>
                  <th>Status</th>
                  <th>Uses</th>
                  <th>Last used</th>
                  <th>Expires</th>
                  <th>Token expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="gsx-muted">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="gsx-muted">
                      No supplier requests found.
                    </td>
                  </tr>
                ) : (
                  rows.map((it) => {
                    const usesText = `${safeNum(it.used_count)}/${safeNum(it.max_uses)}`;
                    const revoked = !!it.revoked_at;
                    const usedOut =
                      typeof it.used_count === "number" && typeof it.max_uses === "number"
                        ? it.used_count >= it.max_uses
                        : false;

                    const statusText = (it.status || "unknown").toLowerCase();
                    const bad =
                      revoked ||
                      usedOut ||
                      statusText === "submitted" ||
                      statusText === "verified" ||
                      statusText === "rejected" ||
                      statusText === "revoked" ||
                      statusText === "expired";

                    const canIssue = isIssuableStatus(statusText);

                    return (
                      <tr key={it.supplier_request_id}>
                        <td>
                          <div title={it.supplier_request_id}>
                            {clip(it.supplier_name, 36)}{" "}
                            {it.supplier_email ? <span className="gsx-muted">({clip(it.supplier_email, 28)})</span> : null}
                          </div>
                        </td>
                        <td>{it.cn_code || "-"}</td>
                        <td title={it.goods_description || ""}>{clip(it.goods_description, 32)}</td>
                        <td>{safeNum(it.quantity)}</td>
                        <td>{safeNum(it.net_mass_kg)}</td>
                        <td>{it.country_of_origin || "-"}</td>
                        <td>{it.procedure_code || "-"}</td>
                        <td>
                          <span className={"gsx-badge " + (bad ? "gsx-pillBad" : "gsx-pillGood")}>
                            {it.status || "unknown"}
                          </span>
                        </td>
                        <td>{usesText}</td>
                        <td>{fmtDate(it.last_used_at)}</td>
                        <td>{fmtDate(it.expires_at)}</td>
                        <td>{fmtDate(it.token_expires_at)}</td>
                        <td>
                          <button
                            className="gsx-btn"
                            onClick={() => issueTokenForRequest(it.supplier_request_id)}
                            disabled={!canIssue || issuingId === it.supplier_request_id}
                            title={canIssue ? "Issues a token for this request via RPC." : "Allowed only when status is draft or sent."}
                          >
                            {issuingId === it.supplier_request_id ? "Generating…" : "Generate link"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {issueErr ? <div className="gsx-error">{issueErr}</div> : null}
      </main>

      {issued ? (
        <div className="gsx-modalBackdrop" role="dialog" aria-modal="true" aria-label="New supplier link">
          <div className="gsx-modal">
            <div className="gsx-modalHead">
              <h2 className="gsx-modalTitle">Supplier link issued</h2>
              <button className="gsx-btn" onClick={closeIssued}>
                Close
              </button>
            </div>
            <div className="gsx-modalBody">
              <div className="gsx-muted">Supplier request: {issued.supplier_request_id}</div>

              <div className="gsx-fieldLabel">Full URL</div>
              <div className="gsx-fieldBox">
                <code>{issued.full_url}</code>
                <button className="gsx-btn" onClick={() => copyToClipboard(issued.full_url)}>
                  Copy
                </button>
                <a className="gsx-btn" href={issued.full_url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>

              <div className="gsx-fieldLabel">Plaintext token</div>
              <div className="gsx-fieldBox">
                <code>{issued.plaintext_token}</code>
                <button className="gsx-btn" onClick={() => copyToClipboard(issued.plaintext_token)}>
                  Copy
                </button>
              </div>

              <div className="gsx-spacer" />

              <div className="gsx-muted">Token expires: {fmtDate(issued.token_expires_at)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\supplier-links.tsx
