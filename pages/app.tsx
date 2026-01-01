// FILE: marketing/pages/app.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type SessionUser = { email?: string | null };

export default function AppPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data, error: err } = await supabase.auth.getSession();
        if (err) throw err;

        const session = data.session;
        if (!session) {
          window.location.assign("/login");
          return;
        }

        if (!cancelled) {
          setUser({ email: session.user?.email ?? null });
          setLoading(false);
        }
      } catch (ex: any) {
        if (!cancelled) {
          setError(ex?.message ?? "Failed to load session.");
          setLoading(false);
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.assign("/login");
      setUser({ email: session?.user?.email ?? null });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      window.location.assign("/login");
    }
  }

  return (
    <div className="gsx-appRoot">
      <Head>
        <title>GrandScope | Importer</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-appRoot{
          --brand:#306263;
          --support:#4073AF;
          --highlight:#FFD617;

          --bg:#F5F5F5;
          --surface:#FFFFFF;

          --text:#202020;
          --muted:#6B7280;

          --border:#D1D5DB;

          min-height:100vh;
          padding:24px 12px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:
            radial-gradient(900px 520px at 12% 0%, rgba(48,98,99,.16), transparent 60%),
            radial-gradient(900px 520px at 78% 6%, rgba(64,115,175,.12), transparent 62%),
            radial-gradient(900px 520px at 50% 0%, rgba(255,214,23,.10), transparent 65%),
            var(--bg);
          color:var(--text);
        }

        .gsx-shell{
          width:min(980px, 100%);
          margin:0 auto;
        }

        .gsx-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:14px;
        }

        .gsx-brand{
          display:flex;
          align-items:center;
          gap:10px;
        }

        .gsx-logo{
          width:38px;
          height:38px;
          border-radius:12px;
          background:
            radial-gradient(200px 80px at 20% 20%, rgba(255,214,23,.35), transparent 60%),
            linear-gradient(135deg, rgba(48,98,99,.95), rgba(64,115,175,.78));
          box-shadow: 0 12px 30px rgba(48,98,99,.16);
        }

        .gsx-title{
          margin:0;
          font-size:18px;
          font-weight:950;
          letter-spacing:-0.01em;
        }
        .gsx-sub{
          margin:2px 0 0;
          font-size:12px;
          color:var(--muted);
          line-height:1.5;
        }

        .gsx-card{
          border-radius:18px;
          border: 1px solid rgba(209,213,219,.95);
          background: rgba(255,255,255,.92);
          box-shadow: 0 18px 60px rgba(2,6,23,.10);
          padding:16px;
        }

        .gsx-row{ display:flex; gap:10px; flex-wrap:wrap; }
        .gsx-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 10px;
          border-radius:999px;
          border:1px solid rgba(209,213,219,.95);
          background: rgba(255,255,255,.95);
          font-size:12px;
          font-weight:900;
        }

        .gsx-btn{
          border-radius:12px;
          padding:10px 12px;
          font-size:13px;
          font-weight:950;
          cursor:pointer;
          border:1px solid rgba(17,24,39,.12);
          background: rgba(255,255,255,.92);
        }
        .gsx-btnPrimary{
          background:
            radial-gradient(200px 80px at 20% 20%, rgba(255,214,23,.35), transparent 60%),
            linear-gradient(135deg, rgba(48,98,99,.95), rgba(64,115,175,.78));
          color:#fff;
          border-color: rgba(48,98,99,.25);
          box-shadow: 0 14px 30px rgba(48,98,99,.18);
        }

        .gsx-muted{ color:var(--muted); }

        .gsx-alert{
          margin-top:12px;
          border-radius:14px;
          padding:10px 12px;
          border:1px solid rgba(209,213,219,.95);
          background: rgba(255,255,255,.95);
          font-size:13px;
          line-height:1.55;
        }
        .gsx-alertError{ border-color: rgba(218,33,49,.35); }

        @media (max-width: 520px){
          .gsx-top{ align-items:flex-start; flex-direction:column; }
        }
      `}</style>

      <main className="gsx-shell">
        <header className="gsx-top">
          <div className="gsx-brand">
            <div className="gsx-logo" aria-hidden="true" />
            <div>
              <h1 className="gsx-title">Importer Console</h1>
              <p className="gsx-sub">EU CBAM reporting and supplier link provisioning</p>
            </div>
          </div>

          <div className="gsx-row">
            {user?.email ? <span className="gsx-pill">{user.email}</span> : null}
            <button className="gsx-btn" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <section className="gsx-card" aria-label="Importer dashboard">
          {loading ? <div className="gsx-muted">Loading...</div> : null}
          {error ? <div className="gsx-alert gsx-alertError">{error}</div> : null}

          {!loading && !error ? (
            <div>
              <div className="gsx-row" style={{ marginTop: 6 }}>
                <a className="gsx-btn gsx-btnPrimary" href="/importer/supplier-links">
                  Create supplier link
                </a>
                <a className="gsx-btn" href="/importer/audit">
                  Audit submissions
                </a>
              </div>

              <div className="gsx-muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
                Controls are server enforced. This console is read-only where required.
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/app.tsx
