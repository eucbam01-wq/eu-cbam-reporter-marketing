// FILE: marketing/pages/auth/reset.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

export default function AuthResetPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Supabase sets a recovery session via the URL when redirecting from resetPasswordForEmail.
        const { data, error: err } = await supabase.auth.getSession();
        if (err) throw err;
        if (!cancelled) {
          setReady(!!data.session);
          if (!data.session) setError("Invalid or expired reset link.");
        }
      } catch (ex: any) {
        if (!cancelled) setError(ex?.message ?? "Invalid or expired reset link.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!ready) throw new Error("Invalid or expired reset link.");
      if (!password.trim()) throw new Error("New password is required.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (password !== confirm) throw new Error("Passwords do not match.");

      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;

      setMessage("Password updated. You can sign in now.");
      setPassword("");
      setConfirm("");

      setTimeout(() => {
        window.location.assign("/login");
      }, 700);
    } catch (ex: any) {
      setError(ex?.message ?? "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gsx-resetRoot">
      <Head>
        <title>GrandScope | Reset password</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-resetRoot{
          --brand:#306263;
          --support:#4073AF;
          --highlight:#FFD617;

          --bg:#F5F5F5;
          --surface:#FFFFFF;

          --text:#202020;
          --muted:#6B7280;

          --border:#D1D5DB;

          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px 12px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:
            radial-gradient(900px 520px at 12% 0%, rgba(48,98,99,.16), transparent 60%),
            radial-gradient(900px 520px at 78% 6%, rgba(64,115,175,.12), transparent 62%),
            radial-gradient(900px 520px at 50% 0%, rgba(255,214,23,.10), transparent 65%),
            var(--bg);
          color:var(--text);
        }

        .gsx-card{
          width:min(520px, 100%);
          border-radius:18px;
          border: 1px solid rgba(209,213,219,.95);
          background: rgba(255,255,255,.92);
          box-shadow: 0 18px 60px rgba(2,6,23,.12);
          padding:18px;
        }

        .gsx-title{
          margin:0 0 6px;
          font-size:20px;
          font-weight:900;
          letter-spacing:-0.01em;
        }
        .gsx-sub{
          margin:0 0 14px;
          font-size:13px;
          color:var(--muted);
          line-height:1.6;
        }

        .gsx-label{ display:block; font-size:12px; font-weight:700; margin:0 0 6px; color:#374151; }
        .gsx-input{
          width:100%;
          border:1px solid var(--border);
          border-radius:12px;
          padding:10px 12px;
          font-size:14px;
          background:#fff;
          outline:none;
        }
        .gsx-input:focus{
          border-color: rgba(48,98,99,.55);
          box-shadow: 0 0 0 3px rgba(48,98,99,.14);
        }

        .gsx-passWrap{ position:relative; }
        .gsx-toggle{
          position:absolute;
          right:8px;
          top:50%;
          transform:translateY(-50%);
          border:0;
          background:transparent;
          color:#374151;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
          padding:6px 8px;
          border-radius:10px;
        }
        .gsx-toggle:hover{ background: rgba(17,24,39,.06); }

        .gsx-btnRow{ display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
        .gsx-btn{
          border-radius:12px;
          padding:10px 12px;
          font-size:14px;
          font-weight:900;
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
        .gsx-btnPrimary:disabled{ opacity:.55; cursor:not-allowed; }
        .gsx-btnLink{
          border:0;
          background:transparent;
          color: rgba(48,98,99,.95);
          padding:10px 6px;
          font-weight:900;
          cursor:pointer;
        }
        .gsx-btnLink:hover{ text-decoration:underline; }

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
        .gsx-alertSuccess{ border-color: rgba(46,125,50,.38); }

        @media (max-width: 520px){
          .gsx-card{ padding:14px; }
        }
      `}</style>

      <section className="gsx-card" aria-label="Reset password">
        <h1 className="gsx-title">Reset password</h1>
        <p className="gsx-sub">Set a new password for your importer account.</p>

        <form onSubmit={onSubmit}>
          <div style={{ marginTop: 10 }}>
            <label className="gsx-label">New password</label>
            <div className="gsx-passWrap">
              <input
                className="gsx-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={!ready || loading}
              />
              <button type="button" className="gsx-toggle" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="gsx-label">Confirm new password</label>
            <input
              className="gsx-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={!ready || loading}
            />
          </div>

          <div className="gsx-btnRow">
            <button className="gsx-btn gsx-btnPrimary" type="submit" disabled={!ready || loading}>
              {loading ? "Working..." : "Update password"}
            </button>

            <button type="button" className="gsx-btnLink" onClick={() => window.location.assign("/login")}>
              Back to sign in
            </button>
          </div>

          {error ? <div className="gsx-alert gsx-alertError">{error}</div> : null}
          {message ? <div className="gsx-alert gsx-alertSuccess">{message}</div> : null}
        </form>
      </section>
    </div>
  );
}
// FILE: marketing/pages/auth/reset.tsx
