// FILE: marketing/pages/importer/audit.tsx (repo: eu-cbam-reporter/marketing)
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LABEL, getActivePlanTier, isEntitled, requiredTierForFeature } from "../../src/entitlements";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type EvidenceFile = {
  bucket?: string;
  path?: string;
  name?: string;
  mime?: string;
  mimetype?: string;
  size?: number;
  purpose?: string;
};

type AuditRow = {
  submission_id: string;
  supplier_request_id: string;
  submitted_at: string;
  scope2_source_type: string | null;
  evidence_file_count: number;
  evidence_files: EvidenceFile[] | null;
};

export default function ImporterAuditPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const planTier = getActivePlanTier();
  const required = requiredTierForFeature("AUDIT");
  const allowed = isEntitled(planTier, required);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }

        const { data, error: err } = await supabase.rpc("list_supplier_submissions_for_importer", {
          p_supplier_request_id: null,
        });

        if (err) throw err;

        if (!cancelled) {
          setRows(
            (data || []).map((r: any) => ({
              submission_id: r.submission_id,
              supplier_request_id: r.supplier_request_id,
              submitted_at: r.submitted_at,
              scope2_source_type: r.scope2_source_type ?? null,
              evidence_file_count: Number(r.evidence_file_count ?? 0),
              evidence_files: (r.evidence_files ?? null) as EvidenceFile[] | null,
            }))
          );
          setLoading(false);
        }
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message ?? "Failed to load audit data.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function openEvidenceSignedUrl(bucket: string, path: string, key: string) {
    setBusyKey(key);
    setToast(null);
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to create signed URL");
      window.open(data.signedUrl, "_blank", "noreferrer");
    } catch (e: any) {
      setToast(e?.message ?? "Failed to open evidence");
    } finally {
      setBusyKey(null);
    }
  }

  if (!allowed) {
    return (
      <div style={{ padding: 20 }}>
        <Head>
          <title>Audit | Locked</title>
        </Head>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Audit submissions</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>Locked. Upgrade to {PLAN_LABEL[required]} to access.</div>
        <div style={{ marginTop: 14 }}>
          <a href="/pricing" style={{ fontWeight: 900, textDecoration: "underline" }}>Upgrade</a>
        </div>
      </div>
    );
  }

  return (
    <div className="gsx-auditRoot">
      <Head>
        <title>GrandScope | Audit</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-auditRoot{
          min-height:100vh;
          padding:24px 12px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:#F5F5F5;
          color:#202020;
        }
        .gsx-shell{ width:min(1100px,100%); margin:0 auto; }
        .gsx-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .gsx-title{ font-size:20px; font-weight:900; margin:0 0 12px; }
        .gsx-card{
          border-radius:16px;
          border:1px solid #E5E7EB;
          background:#fff;
          padding:14px;
        }
        .gsx-table{ width:100%; border-collapse:collapse; font-size:13px; }
        .gsx-table th, .gsx-table td{
          padding:8px 6px;
          border-bottom:1px solid #E5E7EB;
          text-align:left;
          vertical-align:top;
          word-break:break-word;
        }
        .gsx-muted{ color:#6B7280; }
        .gsx-link{ color:#111827; text-decoration:underline; }
        .gsx-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid #E5E7EB;
          background:#fff;
          font-size:12px;
          cursor:pointer;
        }
        .gsx-pill[disabled]{
          opacity:.6;
          cursor:not-allowed;
        }
        .gsx-toast{
          margin:10px 0 0;
          color:#6B7280;
          font-size:13px;
        }
        .gsx-evidenceList{
          display:flex;
          flex-direction:column;
          gap:6px;
        }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-top">
          <h1 className="gsx-title">Submission audit</h1>
          <Link className="gsx-link" href="/app">Back</Link>
        </div>

        <section className="gsx-card">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-muted">{error}</div> : null}
          {toast ? <div className="gsx-toast">{toast}</div> : null}

          {!loading && !error ? (
            <table className="gsx-table">
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Supplier request</th>
                  <th>Submitted at</th>
                  <th>Scope 2 source</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.submission_id}>
                    <td>{r.submission_id}</td>
                    <td>{r.supplier_request_id}</td>
                    <td>{r.submitted_at}</td>
                    <td>{r.scope2_source_type ?? "-"}</td>
                    <td>
                      {r.evidence_files && r.evidence_files.length ? (
                        <div className="gsx-evidenceList">
                          {r.evidence_files.map((ev, idx) => {
                            const bucket = ev.bucket || "supplier-evidence";
                            const path = ev.path || "";
                            const name = ev.name || path.split("/").pop() || "evidence.pdf";
                            const key = `${r.submission_id}:${idx}`;
                            const disabled = !path || busyKey === key;
                            return (
                              <button
                                key={key}
                                className="gsx-pill"
                                type="button"
                                disabled={disabled}
                                onClick={() => openEvidenceSignedUrl(bucket, path, key)}
                              >
                                {busyKey === key ? "Opening..." : "Open PDF"}
                                <span className="gsx-muted">{name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="gsx-muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/audit.tsx (repo: eu-cbam-reporter/marketing)
