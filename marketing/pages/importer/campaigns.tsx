// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\campaigns.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LABEL, getActivePlanTier, isEntitled, requiredTierForFeature } from "../../src/entitlements";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type SupplierRequestRow = {
  supplier_request_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  cn_code: string | null;
  goods_description: string | null;
  status: string | null;
  created_at: string | null;
};

type CampaignRow = {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  status: string;
  created_at: string;
};

type IssueRow = {
  supplier_request_id: string;
  supplier_email: string;
  supplier_language: string | null;
  plaintext_token: string;
  full_url: string;
  token_expires_at: string;
};

function clip(v: string | null | undefined, n: number) {
  const s = (v || "").trim();
  if (!s) return "-";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

export default function ImporterCampaignsPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const planTier = getActivePlanTier();
  const required = requiredTierForFeature("CAMPAIGNS");
  const allowed = isEntitled(planTier, required);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [requests, setRequests] = useState<SupplierRequestRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  const [name, setName] = useState<string>("Q4 supplier chase");
  const [creating, setCreating] = useState<boolean>(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const [issuing, setIssuing] = useState<boolean>(false);
  const [issueLimit, setIssueLimit] = useState<number>(50);
  const [isReminder, setIsReminder] = useState<boolean>(false);
  const [issuedRows, setIssuedRows] = useState<IssueRow[]>([]);
  const [issueErr, setIssueErr] = useState<string | null>(null);

  async function requireSessionOrRedirect() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      window.location.assign("/login");
      return false;
    }
    return true;
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setIssueErr(null);

    try {
      const ok = await requireSessionOrRedirect();
      if (!ok) return;

      const { data: reqData, error: reqErr } = await supabase.rpc("list_supplier_requests_for_importer");
      if (reqErr) throw reqErr;

      const list = Array.isArray(reqData) ? (reqData as SupplierRequestRow[]) : [];
      const sorted = [...list].sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });
      setRequests(sorted);

      const { data: campData, error: campErr } = await supabase
        .from("supplier_request_campaigns")
        .select("id, organization_id, created_by, name, status, created_at")
        .order("created_at", { ascending: false });
      if (campErr) throw campErr;

      setCampaigns((campData || []) as CampaignRow[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    for (const r of requests) next[r.supplier_request_id] = true;
    setSelected(next);
  }

  function clearAll() {
    setSelected({});
  }

  async function createCampaign() {
    setCreating(true);
    setErr(null);
    setCreatedCampaignId(null);
    setIssuedRows([]);
    setIssueErr(null);

    try {
      const ok = await requireSessionOrRedirect();
      if (!ok) return;

      const cleanName = name.trim();
      if (!cleanName) throw new Error("Campaign name required");
      if (selectedIds.length === 0) throw new Error("Select at least 1 supplier request");

      const { data, error } = await supabase.rpc("create_supplier_request_campaign_from_requests", {
        p_name: cleanName,
        p_supplier_request_ids: selectedIds,
      });
      if (error) throw error;

      const id = data as string;
      if (!id) throw new Error("No campaign id returned");
      setCreatedCampaignId(id);

      const { error: stErr } = await supabase.rpc("set_supplier_request_campaign_status", {
        p_campaign_id: id,
        p_status: "active",
      });
      if (stErr) throw stErr;

      await loadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  }

  async function issueBatch(campaignId: string) {
    setIssuing(true);
    setIssueErr(null);
    setIssuedRows([]);

    try {
      const ok = await requireSessionOrRedirect();
      if (!ok) return;

      const lim = Math.max(0, Math.min(1000, Number(issueLimit) || 0));

      const { data, error } = await supabase.rpc("issue_supplier_request_campaign_batch", {
        p_campaign_id: campaignId,
        p_limit: lim,
        p_is_reminder: isReminder,
      });
      if (error) throw error;

      const rows = Array.isArray(data) ? (data as IssueRow[]) : [];
      setIssuedRows(rows);

      await loadAll();
    } catch (e: any) {
      setIssueErr(e?.message || String(e));
    } finally {
      setIssuing(false);
    }
  }

  function copy(v: string) {
    try {
      void navigator.clipboard.writeText(v);
    } catch {
      // ignore
    }
  }

  if (!allowed) {
    return (
      <div style={{ padding: 20 }}>
        <Head>
          <title>Campaigns | Locked</title>
        </Head>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Campaigns</div>
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
        <title>GrandScope | Campaigns</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow,noarchive" />
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
          white-space: nowrap;
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
        .gsx-pad {
          padding: 12px;
        }
        .gsx-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .gsx-input {
          flex: 1;
          min-width: 280px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 10px 10px;
          font-size: 13px;
          color: #eaf0ff;
          outline: none;
        }
        .gsx-input::placeholder {
          color: rgba(234, 240, 255, 0.55);
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
        .gsx-error {
          margin: 12px 0 0;
          padding: 12px 12px;
          border: 1px solid rgba(255, 96, 96, 0.35);
          background: rgba(255, 96, 96, 0.08);
          border-radius: 12px;
          font-size: 13px;
          white-space: pre-wrap;
        }
        .gsx-ok {
          margin: 12px 0 0;
          padding: 12px 12px;
          border: 1px solid rgba(64, 255, 170, 0.35);
          background: rgba(64, 255, 170, 0.08);
          border-radius: 12px;
          font-size: 13px;
          white-space: pre-wrap;
        }
        .gsx-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.18);
          font-size: 12px;
        }
        .gsx-checkbox {
          width: 16px;
          height: 16px;
        }
        .gsx-slimInput {
          width: 120px;
          min-width: 120px;
        }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-head">
          <div>
            <h1 className="gsx-title">Campaigns</h1>
            <p className="gsx-sub">Bulk send, reminders, and escalation rules for supplier requests.</p>
          </div>
          <div className="gsx-actions">
            <a className="gsx-btn" href="/app">
              App
            </a>
            <a className="gsx-btn" href="/importer/supplier-links">
              Supplier links
            </a>
          </div>
        </div>

        {err ? <div className="gsx-error">{err}</div> : null}

        <section className="gsx-card">
          <div className="gsx-pad">
            <div className="gsx-row">
              <input className="gsx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
              <button className="gsx-btn" onClick={selectAll} disabled={loading || !requests.length}>
                Select all
              </button>
              <button className="gsx-btn" onClick={clearAll} disabled={loading}>
                Clear
              </button>
              <button className="gsx-btn" onClick={createCampaign} disabled={creating || loading}>
                {creating ? "Creating…" : `Create campaign (${selectedIds.length})`}
              </button>
            </div>

            {createdCampaignId ? <div className="gsx-ok">Campaign created: {createdCampaignId}</div> : null}
          </div>

          <div className="gsx-tableWrap">
            <table className="gsx-table" aria-label="Supplier requests selection">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Supplier</th>
                  <th>Email</th>
                  <th>CN</th>
                  <th>Goods</th>
                  <th>Status</th>
                  <th>Token Generated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="gsx-muted">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="gsx-muted">
                      No supplier requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.supplier_request_id}>
                      <td>
                        <input
                          className="gsx-checkbox"
                          type="checkbox"
                          checked={!!selected[r.supplier_request_id]}
                          onChange={() => toggle(r.supplier_request_id)}
                          aria-label={`Select ${r.supplier_request_id}`}
                        />
                      </td>
                      <td title={r.supplier_request_id}>{clip(r.supplier_name, 32)}</td>
                      <td>{clip(r.supplier_email, 36)}</td>
                      <td>{r.cn_code || "-"}</td>
                      <td title={r.goods_description || ""}>{clip(r.goods_description, 32)}</td>
                      <td>{r.status || "unknown"}</td>
                      <td>{fmtDate(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ height: 12 }} />

        <section className="gsx-card">
          <div className="gsx-pad">
            <div className="gsx-row" style={{ justifyContent: "space-between" }}>
              <div className="gsx-pill">Existing campaigns: {campaigns.length}</div>

              <div className="gsx-row">
                <input
                  className={"gsx-input gsx-slimInput"}
                  value={String(issueLimit)}
                  onChange={(e) => setIssueLimit(Number(e.target.value))}
                  inputMode="numeric"
                  placeholder="Limit"
                  aria-label="Issue limit"
                />
                <label className="gsx-pill" style={{ cursor: "pointer" }}>
                  <input
                    className="gsx-checkbox"
                    type="checkbox"
                    checked={isReminder}
                    onChange={(e) => setIsReminder(e.target.checked)}
                    aria-label="Reminder mode"
                  />
                  Reminder mode
                </label>

                <button
                  className="gsx-btn"
                  onClick={() => {
                    if (!createdCampaignId) return;
                    void issueBatch(createdCampaignId);
                  }}
                  disabled={!createdCampaignId || issuing}
                  title={!createdCampaignId ? "Create a campaign first" : "Issue token batch for campaign"}
                >
                  {issuing ? "Issuing…" : "Issue batch for last created"}
                </button>
              </div>
            </div>

            {issueErr ? <div className="gsx-error">{issueErr}</div> : null}

            {issuedRows.length ? (
              <div className="gsx-ok">
                Issued: {issuedRows.length}
                <div className="gsx-muted" style={{ marginTop: 8 }}>
                  Copy and send via your email system.
                </div>
              </div>
            ) : null}
          </div>

          <div className="gsx-tableWrap">
            <table className="gsx-table" aria-label="Campaign list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="gsx-muted">
                      Loading…
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="gsx-muted">
                      No campaigns found.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id}>
                      <td title={c.id}>{clip(c.name, 44)}</td>
                      <td>{c.status}</td>
                      <td>{fmtDate(c.created_at)}</td>
                      <td>
                        <button className="gsx-btn" onClick={() => issueBatch(c.id)} disabled={issuing || c.status !== "active"}>
                          {issuing ? "Issuing…" : "Issue batch"}
                        </button>
                        <button
                          className="gsx-btn"
                          onClick={() => {
                            copy(c.id);
                          }}
                          style={{ marginLeft: 10 }}
                        >
                          Copy ID
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {issuedRows.length ? (
          <>
            <div style={{ height: 12 }} />
            <section className="gsx-card">
              <div className="gsx-pad">
                <div className="gsx-pill">Issued batch results</div>
              </div>
              <div className="gsx-tableWrap">
                <table className="gsx-table" aria-label="Issued rows">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Language</th>
                      <th>URL</th>
                      <th>Token</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedRows.map((r) => (
                      <tr key={`${r.supplier_request_id}-${r.plaintext_token}`}>
                        <td>{r.supplier_email}</td>
                        <td>{r.supplier_language || "-"}</td>
                        <td title={r.full_url}>
                          <button className="gsx-btn" onClick={() => copy(r.full_url)}>
                            Copy URL
                          </button>
                          <a className="gsx-btn" href={r.full_url} target="_blank" rel="noreferrer" style={{ marginLeft: 10 }}>
                            Open
                          </a>
                        </td>
                        <td>
                          <button className="gsx-btn" onClick={() => copy(r.plaintext_token)}>
                            Copy token
                          </button>
                        </td>
                        <td>{fmtDate(r.token_expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\campaigns.tsx
