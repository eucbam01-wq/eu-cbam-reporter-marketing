// FILE: marketing/pages/auth/confirm.tsx
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

export default function AuthConfirmPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Confirming your email...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // In most cases Supabase verifies the user on link click and sets a session.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          if (!cancelled) {
            setStatus("error");
            setMessage("Invalid or expired confirmation link.");
          }
          return;
        }

        if (!cancelled) {
          setStatus("ok");
          setMessage("Email confirmed. Redirecting to dashboard...");
        }

        setTimeout(() => {
          window.location.assign("/app");
        }, 700);
      } catch (ex: any) {
        if (!cancelled) {
          setStatus("error");
          setMessage(ex?.message ?? "Invalid or expired confirmation link.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="gsx-confirmRoot">
      <Head>
        <title>GrandScope | Confirm email</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <style>{`
        .gsx-confirmRoot{
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
          margin:0;
          font-size:13px;
          color:${"#6B7280"};
          line-height:1.6;
        }

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
          margin-top:12px;
        }

        .gsx-dot{
          width:10px;
          height:10px;
          border-radius:999px;
          background: ${"rgba(48,98,99,.95)"};
        }
        .gsx-dotErr{ background: rgba(218,33,49,.85); }

        .gsx-link{
          display:inline-block;
          margin-top:14px;
          font-size:13px;
          font-weight:900;
          color: rgba(48,98,99,.95);
          text-decoration:none;
        }
        .gsx-link:hover{ text-decoration:underline; }

        @media (max-width: 520px){
          .gsx-card{ padding:14px; }
        }
      `}</style>

      <section className="gsx-card" aria-label="Email confirmation">
        <h1 className="gsx-title">Confirm email</h1>
        <p className="gsx-sub">{message}</p>

        <div className="gsx-pill">
          <span className={"gsx-dot" + (status === "error" ? " gsx-dotErr" : "")} aria-hidden="true" />
          <span>{status === "working" ? "Working" : status === "ok" ? "Confirmed" : "Failed"}</span>
        </div>

        {status === "error" ? (
          <a className="gsx-link" href="/login">
            Back to sign in
          </a>
        ) : null}
      </section>
    </div>
  );
}
// FILE: marketing/pages/auth/confirm.tsx
