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

type ThemeMode = "dark" | "light";
type SessionUser = { email?: string | null };

type GridRow = {
  shipmentId: string;
  cnCode: string;
  assetLabel: string;
  originFlag: string;
  originName: string;
  netWeightTonnes: number;
  emissionsTco2e: number;
  status: "VERIFIED" | "DEFAULT";
};

function formatEUR(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "â‚¬--";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `â‚¬${Math.round(value).toString()}`;
  }
}

function formatNumber(value: number | null | undefined, maxFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFractionDigits }).format(value);
  } catch {
    return value.toFixed(Math.min(2, Math.max(0, maxFractionDigits)));
  }
}

const SAMPLE_ROWS: GridRow[] = [
  {
    shipmentId: "GS-IMP-000481",
    cnCode: "7318",
    assetLabel: "Steel Fasteners",
    originFlag: "ðŸ‡¹ðŸ‡·",
    originName: "Turkey",
    netWeightTonnes: 12.4,
    emissionsTco2e: 28.9,
    status: "DEFAULT",
  },
  {
    shipmentId: "GS-IMP-000482",
    cnCode: "7604",
    assetLabel: "Aluminium Bars and Rods",
    originFlag: "ðŸ‡³ðŸ‡´",
    originName: "Norway",
    netWeightTonnes: 8.1,
    emissionsTco2e: 10.2,
    status: "VERIFIED",
  },
  {
    shipmentId: "GS-IMP-000483",
    cnCode: "7208",
    assetLabel: "Hot Rolled Steel",
    originFlag: "ðŸ‡®ðŸ‡³",
    originName: "India",
    netWeightTonnes: 26.7,
    emissionsTco2e: 74.3,
    status: "DEFAULT",
  },
  {
    shipmentId: "GS-IMP-000484",
    cnCode: "2818",
    assetLabel: "Aluminium Oxide",
    originFlag: "ðŸ‡²ðŸ‡¦",
    originName: "Morocco",
    netWeightTonnes: 5.0,
    emissionsTco2e: 6.6,
    status: "VERIFIED",
  },
  {
    shipmentId: "GS-IMP-000485",
    cnCode: "3102",
    assetLabel: "Nitrogen Fertiliser",
    originFlag: "ðŸ‡ªðŸ‡¬",
    originName: "Egypt",
    netWeightTonnes: 14.9,
    emissionsTco2e: 22.4,
    status: "DEFAULT",
  },
];

export default function AppPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("gsx-theme");
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        return;
      }
      const prefersDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } catch {
      setTheme("dark");
    }
  }, []);

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
      if (!session) {
        window.location.assign("/login");
        return;
      }
      setUser({ email: session.user?.email ?? null });
      setLoading(false);
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

  function toggleTheme() {
    setTheme((t) => {
      const next: ThemeMode = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("gsx-theme", next);
      } catch {
        // ignore
      }
      return next;
    });
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SAMPLE_ROWS;
    return SAMPLE_ROWS.filter((r) => {
      const a = `${r.cnCode} ${r.assetLabel}`.toLowerCase();
      return a.includes(q) || r.shipmentId.toLowerCase().includes(q) || r.originName.toLowerCase().includes(q);
    });
  }, [search]);

  const verifiedCount = useMemo(() => filteredRows.filter((r) => r.status === "VERIFIED").length, [filteredRows]);
  const coveragePct = useMemo(() => {
    if (!filteredRows.length) return 0;
    return Math.round((verifiedCount / filteredRows.length) * 100);
  }, [filteredRows.length, verifiedCount]);

  const penaltyRiskEUR = 0;
  const liabilityEUR = 0;

  return (
    <div className="gsx-root" data-theme={theme}>
      <Head>
        <title>GrandScope | Command Center</title>
        <meta name="viewport" content="width=device-width" />
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <style>{`
        .gsx-root{
          --font: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;

          --bg: #020617;
          --surface: #0F172A;
          --surface2: #0B1220;

          --text: #E2E8F0;
          --muted: #94A3B8;

          --border: rgba(148,163,184,.22);
          --borderStrong: rgba(226,232,240,.24);

          --gold: #D4AF37;
          --goldSoft: rgba(212,175,55,.14);

          --amber: #F59E0B;
          --amberSoft: rgba(245,158,11,.16);

          --crimson: #DC2626;
          --riskBg: #450A0A;
          --riskBorder: rgba(220,38,38,.55);

          min-height: 100vh;
          font-family: var(--font);
          background: var(--bg);
          color: var(--text);
        }

        .gsx-root[data-theme="light"]{
          --bg: #F8FAFC;
          --surface: #FFFFFF;
          --surface2: #F1F5F9;

          --text: #0F172A;
          --muted: #475569;

          --border: rgba(15,23,42,.14);
          --borderStrong: rgba(15,23,42,.22);

          --gold: #D4AF37;
          --goldSoft: rgba(212,175,55,.16);

          --amber: #B45309;
          --amberSoft: rgba(180,83,9,.12);

          --crimson: #DC2626;
          --riskBg: rgba(220,38,38,.10);
          --riskBorder: rgba(220,38,38,.40);
        }

        .gsx-layout{
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          min-height: 100vh;
        }

        .gsx-sidebar{
          background: linear-gradient(180deg, rgba(15,23,42,.98), rgba(11,18,32,.98));
          border-right: 1px solid var(--border);
          padding: 18px 14px;
        }

        .gsx-root[data-theme="light"] .gsx-sidebar{
          background: linear-gradient(180deg, rgba(241,245,249,1), rgba(226,232,240,1));
        }

        .gsx-brand{
          display:flex;
          align-items:center;
          gap:10px;
          padding: 10px 10px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: rgba(255,255,255,.02);
        }

        .gsx-root[data-theme="light"] .gsx-brand{
          background: rgba(255,255,255,.7);
        }

        .gsx-mark{
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background:
            radial-gradient(120px 80px at 30% 30%, rgba(212,175,55,.35), transparent 60%),
            linear-gradient(135deg, rgba(2,6,23,.95), rgba(15,23,42,.88));
          border: 1px solid var(--borderStrong);
        }

        .gsx-root[data-theme="light"] .gsx-mark{
          background:
            radial-gradient(120px 80px at 30% 30%, rgba(212,175,55,.40), transparent 60%),
            linear-gradient(135deg, rgba(15,23,42,.95), rgba(2,6,23,.85));
        }

        .gsx-brandTitle{
          margin:0;
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-weight: 900;
          line-height: 1.2;
        }

        .gsx-brandSub{
          margin: 3px 0 0;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.35;
        }

        .gsx-nav{
          margin-top: 14px;
          display:flex;
          flex-direction: column;
          gap: 6px;
        }

        .gsx-navItem{
          position: relative;
          display:flex;
          align-items:center;
          gap:10px;
          padding: 10px 10px 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: .02em;
        }

        .gsx-navItem:hover{
          border-color: var(--border);
          background: rgba(255,255,255,.03);
          color: var(--text);
        }

        .gsx-root[data-theme="light"] .gsx-navItem:hover{
          background: rgba(15,23,42,.04);
        }

        .gsx-navItemActive{
          color: var(--text);
          border-color: var(--border);
          background: rgba(255,255,255,.03);
        }

        .gsx-root[data-theme="light"] .gsx-navItemActive{
          background: rgba(15,23,42,.05);
        }

        .gsx-navItemActive::before{
          content:"";
          position:absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 999px;
          background: var(--gold);
        }

        .gsx-main{
          padding: 18px 18px 22px;
          min-width: 0;
        }

        .gsx-topBar{
          display:flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .gsx-topBarLeft{
          min-width: 0;
        }

        .gsx-pageTitle{
          margin: 0;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -.01em;
        }

        .gsx-pageMeta{
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.4;
        }

        .gsx-topBarRight{
          display:flex;
          align-items:center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .gsx-pill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .02em;
          color: var(--text);
        }

        .gsx-root[data-theme="light"] .gsx-pill{
          background: rgba(255,255,255,.7);
        }

        .gsx-btn{
          border-radius: 10px;
          padding: 9px 10px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
          color: var(--text);
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .gsx-root[data-theme="light"] .gsx-btn{
          background: rgba(255,255,255,.75);
        }

        .gsx-btn:hover{
          border-color: var(--borderStrong);
        }

        .gsx-hud{
          display:grid;
          grid-template-columns: 1fr 1fr 1.25fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .gsx-panel{
          border: 1px solid var(--border);
          border-radius: 12px;
          background: rgba(255,255,255,.02);
          padding: 12px;
        }

        .gsx-root[data-theme="light"] .gsx-panel{
          background: rgba(255,255,255,.75);
        }

        .gsx-label{
          margin: 0 0 8px;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: .16em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .gsx-riskPill{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 999px;
          background: var(--riskBg);
          border: 1px solid var(--riskBorder);
        }

        .gsx-riskValue{
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .02em;
          color: var(--crimson);
          animation: gsx-pulse 1.4s ease-in-out infinite;
        }

        @keyframes gsx-pulse{
          0%{ opacity: .78; }
          50%{ opacity: 1; }
          100%{ opacity: .78; }
        }

        .gsx-liabilityValue{
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -.01em;
          color: var(--gold);
        }

        .gsx-coverageWrap{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
        }

        .gsx-coveragePct{
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -.01em;
        }

        .gsx-progress{
          height: 10px;
          border-radius: 999px;
          background: rgba(148,163,184,.16);
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 10px;
        }

        .gsx-progressFill{
          height: 100%;
          width: 0%;
          background: var(--gold);
        }

        .gsx-actions{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .gsx-search{
          flex: 1;
          min-width: 0;
          display:flex;
          align-items:center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(255,255,255,.02);
        }

        .gsx-root[data-theme="light"] .gsx-search{
          background: rgba(255,255,255,.75);
        }

        .gsx-search input{
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 13px;
          font-weight: 850;
          letter-spacing: .01em;
        }

        .gsx-search input::placeholder{
          color: var(--muted);
          font-weight: 800;
        }

        .gsx-actionsRight{
          display:flex;
          align-items:center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .gsx-cta{
          display:inline-flex;
          align-items:center;
          justify-content: center;
          text-decoration: none;
          border-radius: 12px;
          padding: 11px 12px;
          border: 1px solid rgba(0,0,0,.25);
          background: var(--gold);
          color: #000000;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .01em;
          white-space: nowrap;
        }

        .gsx-cta:hover{
          filter: brightness(0.98);
        }

        .gsx-linkBtn{
          display:inline-flex;
          align-items:center;
          justify-content: center;
          text-decoration: none;
          border-radius: 12px;
          padding: 11px 12px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
          color: var(--text);
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .01em;
          white-space: nowrap;
        }

        .gsx-root[data-theme="light"] .gsx-linkBtn{
          background: rgba(255,255,255,.75);
        }

        .gsx-linkBtn:hover{
          border-color: var(--borderStrong);
        }

        .gsx-gridPanel{
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,.02);
        }

        .gsx-root[data-theme="light"] .gsx-gridPanel{
          background: rgba(255,255,255,.75);
        }

        .gsx-table{
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .gsx-th{
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 950;
          border-bottom: 1px solid var(--border);
          background: rgba(0,0,0,.12);
        }

        .gsx-root[data-theme="light"] .gsx-th{
          background: rgba(15,23,42,.04);
        }

        .gsx-td{
          padding: 10px 12px;
          font-size: 13px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
          color: var(--text);
          font-weight: 750;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gsx-tr:hover .gsx-td{
          background: rgba(255,255,255,.02);
        }

        .gsx-root[data-theme="light"] .gsx-tr:hover .gsx-td{
          background: rgba(15,23,42,.03);
        }

        .gsx-asset{
          display:flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .gsx-assetTop{
          display:flex;
          align-items:center;
          gap: 8px;
          min-width: 0;
        }

        .gsx-cn{
          font-weight: 950;
          letter-spacing: .02em;
        }

        .gsx-assetSub{
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gsx-origin{
          display:flex;
          align-items:center;
          gap: 10px;
          min-width: 0;
        }

        .gsx-flag{
          font-size: 16px;
        }

        .gsx-badge{
          display:inline-flex;
          align-items:center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .12em;
          text-transform: uppercase;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
          color: var(--text);
          white-space: nowrap;
        }

        .gsx-badgeVerified{
          border-color: rgba(212,175,55,.55);
          background: var(--goldSoft);
        }

        .gsx-badgeDefault{
          border-color: rgba(245,158,11,.55);
          background: var(--amberSoft);
        }

        .gsx-alert{
          margin-top: 12px;
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
          font-size: 13px;
          line-height: 1.55;
        }

        .gsx-alertError{
          border-color: rgba(220,38,38,.40);
        }

        .gsx-muted{
          color: var(--muted);
        }

        @media (max-width: 980px){
          .gsx-layout{ grid-template-columns: 86px minmax(0, 1fr); }
          .gsx-brand{ padding: 10px; }
          .gsx-brandTitle, .gsx-brandSub{ display:none; }
          .gsx-navItem{ justify-content: center; padding-left: 10px; padding-right: 10px; }
          .gsx-navItem span{ display:none; }
        }

        @media (max-width: 760px){
          .gsx-layout{ grid-template-columns: 1fr; }
          .gsx-sidebar{ border-right: 0; border-bottom: 1px solid var(--border); }
          .gsx-nav{ flex-direction: row; flex-wrap: wrap; }
          .gsx-navItem{ flex: 1; min-width: 140px; justify-content: flex-start; }
          .gsx-hud{ grid-template-columns: 1fr; }
          .gsx-actions{ flex-direction: column; align-items: stretch; }
          .gsx-actionsRight{ justify-content: flex-start; width: 100%; }
        }
      `}</style>

      <div className="gsx-layout">
        <aside className="gsx-sidebar" aria-label="Dashboard navigation">
          <div className="gsx-brand">
            <div className="gsx-mark" aria-hidden="true" />
            <div>
              <p className="gsx-brandTitle">GrandScope</p>
              <p className="gsx-brandSub">Command Center</p>
            </div>
          </div>

          <nav className="gsx-nav">
            <a className="gsx-navItem gsx-navItemActive" href="/app" aria-current="page">
              <span>Command Center</span>
            </a>
            <a className="gsx-navItem" href="/importer/audit">
              <span>Reporting</span>
            </a>
            <a className="gsx-navItem" href="/importer/supplier-links">
              <span>Suppliers</span>
            </a>
            <a className="gsx-navItem" href="/importer/entities">
              <span>Entities</span>
            </a>
            <a className="gsx-navItem" href="/importer/users">
              <span>Users</span>
            </a>
            <a className="gsx-navItem" href="/app#settings">
              <span>Settings</span>
            </a>
          </nav>
        </aside>

        <main className="gsx-main" aria-label="Importer dashboard">
          <div className="gsx-topBar">
            <div className="gsx-topBarLeft">
              <h1 className="gsx-pageTitle">Command Center</h1>
              <p className="gsx-pageMeta">EU CBAM compliance risk terminal</p>
            </div>

            <div className="gsx-topBarRight">
              {user?.email ? <span className="gsx-pill">{user.email}</span> : null}
              <button className="gsx-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
                Theme: {theme === "dark" ? "Dark" : "Light"}
              </button>
              <button className="gsx-btn" type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>

          <section className="gsx-hud" aria-label="Financial HUD">
            <div className="gsx-panel">
              <p className="gsx-label">Penalty Risk</p>
              <div className="gsx-riskPill">
                <span className="gsx-muted" style={{ fontWeight: 950, letterSpacing: ".02em" }}>
                  Penalty Risk
                </span>
                <span className="gsx-riskValue">{formatEUR(penaltyRiskEUR)}</span>
              </div>
              <div className="gsx-muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
                Breach exposure indicator
              </div>
            </div>

            <div className="gsx-panel">
              <p className="gsx-label">Actual Liability</p>
              <div className="gsx-liabilityValue">{formatEUR(liabilityEUR)}</div>
              <div className="gsx-muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
                Real CBAM cost to settle
              </div>
            </div>

            <div className="gsx-panel">
              <p className="gsx-label">Coverage Gauge</p>
              <div className="gsx-coverageWrap">
                <div className="gsx-muted" style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".02em" }}>
                  Imports verified
                </div>
                <div className="gsx-coveragePct">{coveragePct}%</div>
              </div>
              <div className="gsx-progress" role="progressbar" aria-valuenow={coveragePct} aria-valuemin={0} aria-valuemax={100}>
                <div className="gsx-progressFill" style={{ width: `${coveragePct}%` }} />
              </div>
            </div>
          </section>

          <section className="gsx-actions" aria-label="Action layer">
            <div className="gsx-search" role="search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search CN Code..."
                aria-label="Search CN Code"
              />
            </div>

            <div className="gsx-actionsRight">
              <a className="gsx-cta" href="/importer/create-link">
                Generate Magic Link
              </a>
              <a className="gsx-linkBtn" href="/importer/supplier-links">
                Supplier links
              </a>
              <a className="gsx-linkBtn" href="/importer/audit">
                Audit submissions
              </a>
            </div>
          </section>

          <section className="gsx-gridPanel" aria-label="Main data grid">
            {loading ? <div className="gsx-td gsx-muted">Loading...</div> : null}
            {error ? <div className="gsx-alert gsx-alertError">{error}</div> : null}

            {!loading && !error ? (
              <table className="gsx-table">
                <thead>
                  <tr>
                    <th className="gsx-th" style={{ width: "18%" }}>
                      Reference
                    </th>
                    <th className="gsx-th" style={{ width: "28%" }}>
                      Asset
                    </th>
                    <th className="gsx-th" style={{ width: "18%" }}>
                      Origin
                    </th>
                    <th className="gsx-th" style={{ width: "14%" }}>
                      Net Weight
                    </th>
                    <th className="gsx-th" style={{ width: "14%" }}>
                      Emissions
                    </th>
                    <th className="gsx-th" style={{ width: "8%" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr className="gsx-tr" key={r.shipmentId}>
                      <td className="gsx-td" title={r.shipmentId}>
                        {r.shipmentId}
                      </td>
                      <td className="gsx-td">
                        <div className="gsx-asset">
                          <div className="gsx-assetTop" title={`${r.cnCode} - ${r.assetLabel}`}>
                            <span className="gsx-cn">{r.cnCode}</span>
                            <span className="gsx-muted" style={{ fontWeight: 900 }}>
                              {" "}
                              {"-"}{" "}
                            </span>
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.assetLabel}</span>
                          </div>
                          <div className="gsx-assetSub">CN Code</div>
                        </div>
                      </td>
                      <td className="gsx-td">
                        <div className="gsx-origin" title={r.originName}>
                          <span className="gsx-flag" aria-hidden="true">
                            {r.originFlag}
                          </span>
                          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.originName}</span>
                        </div>
                      </td>
                      <td className="gsx-td" title={`${r.netWeightTonnes} tonnes`}>
                        {formatNumber(r.netWeightTonnes, 2)} t
                      </td>
                      <td className="gsx-td" title={`${r.emissionsTco2e} tCO2e`}>
                        {formatNumber(r.emissionsTco2e, 2)} tCO2e
                      </td>
                      <td className="gsx-td">
                        <span
                          className={`gsx-badge ${r.status === "VERIFIED" ? "gsx-badgeVerified" : "gsx-badgeDefault"}`}
                          title={r.status}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length ? (
                    <tr>
                      <td className="gsx-td gsx-muted" colSpan={6}>
                        No matches.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : null}
          </section>

          <div id="settings" style={{ marginTop: 14 }}>
            <div className="gsx-alert">
              <div style={{ fontWeight: 950, letterSpacing: ".02em" }}>Settings</div>
              <div className="gsx-muted" style={{ marginTop: 6 }}>
                Theme and session controls only.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
// FILE: marketing/pages/app.tsx



