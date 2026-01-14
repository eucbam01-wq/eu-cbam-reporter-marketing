// FILE: marketing/pages/importer/entities/[id].tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type LegalEntityRow = { id: string; group_id: string; display_name: string; country_code: string; eori: string | null; created_at: string };

export default function ImporterEntityEditPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [row, setRow] = useState<LegalEntityRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [eori, setEori] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;

      setLoading(true);
      setErr(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          window.location.assign("/login");
          return;
        }

        const { data, error } = await supabase
          .from("legal_entities")
          .select("id,group_id,display_name,country_code,eori,created_at")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!cancelled) {
          const le = data as any as LegalEntityRow;
          setRow(le);
          setDisplayName(le.display_name || "");
          setCountryCode(le.country_code || "");
          setEori(le.eori || "");
        }
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
  }, [supabase, id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setErr(null);

    try {
      const display_name = displayName.trim();
      const country_code = (countryCode || "").trim().toUpperCase().slice(0, 2);
      const eori_norm = eori.trim() ? eori.trim().toUpperCase() : null;

      if (!display_name) throw new Error("Display name is required.");
      if (!country_code || country_code.length !== 2) throw new Error("Country code must be 2 letters.");

      const { error } = await supabase
        .from("legal_entities")
        .update({ display_name, country_code, eori: eori_norm })
        .eq("id", id);

      if (error) throw error;

      window.location.assign("/importer/entities");
    } catch (e2: any) {
      setErr(e2?.message || String(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Entity</title>
        <meta name="viewport" content="width=device-width" />
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <style jsx>{`
        .gsx-root {
          min-height: 100vh;
          background: #05070d;
          color: #eaf0ff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        }
        .shell {
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 16px 44px;
        }
        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }
        h1 {
          margin: 0;
          font-size: 18px;
        }
        .sub {
          margin: 6px 0 0;
          color: rgba(234, 240, 255, 0.72);
          font-size: 13px;
          line-height: 1.35;
        }
        .btn {
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
        .btn:hover {
          border-color: rgba(132, 160, 255, 0.55);
          background: rgba(132, 160, 255, 0.12);
        }
        .card {
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          overflow: hidden;
          padding: 14px;
        }
        .error {
          margin: 12px 0 0;
          padding: 12px 12px;
          border: 1px solid rgba(255, 96, 96, 0.35);
          background: rgba(255, 96, 96, 0.08);
          border-radius: 12px;
          font-size: 13px;
          white-space: pre-wrap;
        }
        label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 10px;
        }
        input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.22);
          color: #eaf0ff;
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13px;
          outline: none;
        }
        input:focus {
          border-color: rgba(132, 160, 255, 0.55);
        }
        .row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          margin-top: 12px;
        }
        .muted {
          color: rgba(234, 240, 255, 0.65);
          font-size: 12px;
        }
      `}</style>

      <main className="shell">
        <div className="top">
          <div>
            <h1>Edit entity</h1>
            <p className="sub">Update display name, country, and EORI.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn" href="/importer/entities">
              Back
            </Link>
            {id ? (
              <Link className="btn" href={`/importer/entities/${id}/address`}>
                Address
              </Link>
            ) : null}
          </div>
        </div>

        {err ? <div className="error">{err}</div> : null}

        <section className="card" aria-label="Entity editor">
          {loading ? (
            <div className="muted">Loading...</div>
          ) : !row ? (
            <div className="muted">Not found.</div>
          ) : (
            <form onSubmit={save}>
              <label>
                Display name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>

              <label>
                Country code (2 letters)
                <input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
              </label>

              <label>
                EORI (optional)
                <input value={eori} onChange={(e) => setEori(e.target.value)} placeholder="GB123..." />
              </label>

              <div className="row">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <span className="muted">EORI must match: two letters plus 1 to 15 alphanumeric.</span>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/entities/[id].tsx
