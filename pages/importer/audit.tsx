// FILE: marketing/pages/importer/audit.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type AuditRow = {
  submission_id: string;
  supplier_request_id: string;
  submitted_at: string;
  scope2_source_type: string | null;
  evidence_file_count: number;
};

export default function ImporterAuditPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }

        const { data, error: err } = await supabase
          .from("supplier_portal_submissions")
          .select("id, supplier_request_id, submitted_at, scope2_source_type, evidence_file_count")
          .order("submitted_at", { ascending: false });

        if (err) throw err;
        if (!cancelled) {
          setRows(
            (data || []).map((r: any) => ({
              submission_id: r.id,
              supplier_request_id: r.supplier_request_id,
              submitted_at: r.submitted_at,
              scope2_source_type: r.scope2_source_type,
              evidence_file_count: r.evidence_file_count ?? 0,
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
        }
        .gsx-muted{ color:#6B7280; }
      `}</style>

      <main className="gsx-shell">
        <h1 className="gsx-title">Submission audit</h1>

        <section className="gsx-card">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-muted">{error}</div> : null}

          {!loading && !error ? (
            <table className="gsx-table">
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Supplier request</th>
                  <th>Submitted at</th>
                  <th>Scope 2 source</th>
                  <th>Evidence files</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.submission_id}>
                    <td>{r.submission_id}</td>
                    <td>{r.supplier_request_id}</td>
                    <td>{r.submitted_at}</td>
                    <td>{r.scope2_source_type ?? "-"}</td>
                    <td>{r.evidence_file_count}</td>
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
// FILE: marketing/pages/importer/audit.tsx
