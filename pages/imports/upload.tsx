// FILE: marketing/pages/imports/upload.tsx
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

export default function ImportUploadPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.assign("/login");
          return;
        }
        if (!cancelled) setLoading(false);
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message ?? "Failed to load session.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="gsx-importUploadRoot">
      <Head>
        <title>GrandScope | Import upload</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-importUploadRoot{
          min-height:100vh;
          padding:24px 12px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:#F5F5F5;
          color:#202020;
        }
        .gsx-shell{ width:min(1100px,100%); margin:0 auto; }
        .gsx-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .gsx-title{ font-size:20px; font-weight:900; margin:0 0 12px; }
        .gsx-link{ color:#111827; text-decoration:underline; }
        .gsx-card{
          border-radius:16px;
          border:1px solid #E5E7EB;
          background:#fff;
          padding:14px;
        }
        .gsx-muted{ color:#6B7280; }
        .gsx-drop{
          margin-top:12px;
          border-radius:14px;
          border:1px dashed #CBD5E1;
          background:#F8FAFC;
          padding:16px;
        }
        .gsx-dropTitle{ font-weight:900; margin:0 0 6px; }
        .gsx-small{ font-size:12px; }
      `}</style>

      <main className="gsx-shell">
        <div className="gsx-top">
          <h1 className="gsx-title">Import upload</h1>
          <Link className="gsx-link" href="/app">Back</Link>
        </div>

        <section className="gsx-card">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-muted">{error}</div> : null}

          {!loading && !error ? (
            <>
              <div className="gsx-muted">
                Upload a CSV of import transactions and map columns to create <code>imports</code> and <code>import_lines</code>.
              </div>

              <div className="gsx-drop">
                <p className="gsx-dropTitle">CSV upload (Phase 2 UI exposure)</p>
                <div className="gsx-muted gsx-small">
                  UI is wired and reachable from the authenticated dashboard. Next checklist step is to implement parsing and inserts.
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/imports/upload.tsx
