// FILE: marketing/pages/login.tsx
import Head from "next/head";
import React, { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

export default function LoginPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email.trim()) throw new Error("Email is required.");
      if (!password.trim()) throw new Error("Password is required.");

      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;

        window.location.assign("/app");
        return;
      }

      const origin = window.location.origin;
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${origin}/auth/confirm` },
      });
      if (err) throw err;

      setMessage("Check your email for the verification link.");
    } catch (ex: any) {
      setError(ex?.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email.trim()) throw new Error("Enter your email first.");
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (err) throw err;
      setMessage("If an account exists, a reset link has been sent.");
    } catch (ex: any) {
      setError(ex?.message ?? "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gsx-loginRoot">
      <Head>
        <title>GrandScope | Sign in</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-loginRoot{
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

        .gsx-row{ display:flex; gap:10px; margin:10px 0 0; }
        .gsx-btnRow{ display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }

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

      <section className="gsx-card" aria-label="Login">
        <h1 className="gsx-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="gsx-sub">
          {mode === "signin"
            ? "Importer access to CBAM reporting and supplier link provisioning."
            : "Create an importer account to manage CBAM reporting and supplier requests."}
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginTop: 10 }}>
            <label className="gsx-label">Email</label>
            <input className="gsx-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="gsx-label">Password</label>
            <div className="gsx-passWrap">
              <input
                className="gsx-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              <button type="button" className="gsx-toggle" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="gsx-btnRow">
            <button className="gsx-btn gsx-btnPrimary" type="submit" disabled={loading}>
              {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
            </button>

            <button
              type="button"
              className="gsx-btn"
              onClick={() => {
                setError(null);
                setMessage(null);
                setMode((m) => (m === "signin" ? "signup" : "signin"));
              }}
            >
              {mode === "signin" ? "Create account" : "I already have an account"}
            </button>

            <button type="button" className="gsx-btnLink" onClick={onResetPassword} disabled={loading}>
              Forgot password
            </button>
          </div>

          {error ? <div className="gsx-alert gsx-alertError">{error}</div> : null}
          {message ? <div className="gsx-alert gsx-alertSuccess">{message}</div> : null}
        </form>
      </section>
    </div>
  );
}
// FILE: marketing/pages/login.tsx
