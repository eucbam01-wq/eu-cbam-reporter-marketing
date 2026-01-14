// FILE: marketing/pages/importer/entities/[id]/address.tsx
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

type AddressRow = {
  legal_entity_id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
};

export default function ImporterEntityAddressPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [addr, setAddr] = useState<AddressRow | null>(null);

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("");

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

        const { data, error } = await supabase.rpc("get_legal_entity_address", { p_legal_entity_id: id });
        if (error) throw error;

        const row = (Array.isArray(data) ? data[0] : data) as any;

        if (!cancelled) {
          if (row && row.legal_entity_id) {
            const a = row as AddressRow;
            setAddr(a);
            setLine1(a.address_line1 || "");
            setLine2(a.address_line2 || "");
            setCity(a.city || "");
            setRegion(a.region || "");
            setPostal(a.postal_code || "");
            setCountry(a.country_code || "");
          } else {
            setAddr(null);
            setLine1("");
            setLine2("");
            setCity("");
            setRegion("");
            setPostal("");
            setCountry("");
          }
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
      const payload = {
        address_line1: line1.trim(),
        address_line2: line2.trim() || null,
        city: city.trim(),
        region: region.trim() || null,
        postal_code: postal.trim() || null,
        country_code: (country || "").trim().toUpperCase().slice(0, 2),
      };

      if (!payload.address_line1) throw new Error("Address line 1 is required.");
      if (!payload.city) throw new Error("City is required.");
      if (!payload.country_code || payload.country_code.length !== 2) throw new Error("Country code must be 2 letters.");

      const { data, error } = await supabase.rpc("upsert_legal_entity_address", {
        p_legal_entity_id: id,
        p_payload: payload,
      });

      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as any;
      if (row && row.legal_entity_id) setAddr(row as AddressRow);

      window.location.assign(`/importer/entities/${id}`);
    } catch (e2: any) {
      setErr(e2?.message || String(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Entity address</title>
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
        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 760px) {
          .two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="shell">
        <div className="top">
          <div>
            <h1>Registered address</h1>
            <p className="sub">Registered address for this legal entity.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn" href={`/importer/entities/${id}`}>
              Back
            </Link>
            <Link className="btn" href="/importer/entities">
              Entities
            </Link>
          </div>
        </div>

        {err ? <div className="error">{err}</div> : null}

        <section className="card" aria-label="Address editor">
          {loading ? (
            <div className="muted">Loading...</div>
          ) : (
            <form onSubmit={save}>
              <label>
                Address line 1
                <input value={line1} onChange={(e) => setLine1(e.target.value)} />
              </label>

              <label>
                Address line 2 (optional)
                <input value={line2} onChange={(e) => setLine2(e.target.value)} />
              </label>

              <div className="two">
                <label>
                  City
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label>
                  Region (optional)
                  <input value={region} onChange={(e) => setRegion(e.target.value)} />
                </label>
              </div>

              <div className="two">
                <label>
                  Postal code (optional)
                  <input value={postal} onChange={(e) => setPostal(e.target.value)} />
                </label>
                <label>
                  Country code (2 letters)
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="GB" />
                </label>
              </div>

              <div className="row">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save address"}
                </button>
                <span className="muted">{addr?.updated_at ? `Last updated: ${addr.updated_at}` : "No address saved yet."}</span>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/entities/[id]/address.tsx
