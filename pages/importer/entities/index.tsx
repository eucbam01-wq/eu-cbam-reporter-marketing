// FILE: marketing/pages/importer/entities/index.tsx
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

type OrgRow = { id: string; name: string; type: string; group_id: string | null; default_legal_entity_id: string | null };
type LegalEntityRow = { id: string; group_id: string; display_name: string; country_code: string; eori: string | null; created_at: string };

export default function ImporterEntitiesIndexPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");

  const [entities, setEntities] = useState<LegalEntityRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("GB");
  const [newEori, setNewEori] = useState("");

  const activeOrg = useMemo(() => orgs.find((o) => o.id === activeOrgId) || null, [orgs, activeOrgId]);
  const activeGroupId = activeOrg?.group_id || null;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setErr(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          window.location.assign("/login");
          return;
        }

        const { data: orgRows, error: orgErr } = await supabase
          .from("organizations")
          .select("id,name,type,group_id,default_legal_entity_id")
          .order("created_at", { ascending: true });

        if (orgErr) throw orgErr;

        const list = (orgRows || []) as OrgRow[];
        const importerOnly = list.filter((o) => o.type === "importer");

        if (!cancelled) {
          setOrgs(importerOnly);
          const firstId = importerOnly[0]?.id || "";
          setActiveOrgId(firstId);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadEntities() {
      setErr(null);

      if (!activeGroupId) {
        setEntities([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("legal_entities")
          .select("id,group_id,display_name,country_code,eori,created_at")
          .eq("group_id", activeGroupId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!cancelled) setEntities((data || []) as LegalEntityRow[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    }

    loadEntities();
    return () => {
      cancelled = true;
    };
  }, [supabase, activeGroupId]);

  async function createEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroupId) return;

    setCreating(true);
    setErr(null);

    try {
      const display_name = newName.trim();
      const country_code = (newCountry || "").trim().toUpperCase().slice(0, 2);
      const eori = newEori.trim() ? newEori.trim().toUpperCase() : null;

      if (!display_name) throw new Error("Display name is required.");
      if (!country_code || country_code.length !== 2) throw new Error("Country code must be 2 letters.");

      const { data, error } = await supabase
        .from("legal_entities")
        .insert([{ group_id: activeGroupId, display_name, country_code, eori }])
        .select("id");

      if (error) throw error;

      const createdId = (data && (data as any)[0]?.id) as string | undefined;
      if (createdId) window.location.assign(`/importer/entities/${createdId}`);
    } catch (e2: any) {
      setErr(e2?.message || String(e2));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Entities</title>
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
          max-width: 1200px;
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
        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
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
        }
        .row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          padding: 12px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .row:last-child {
          border-bottom: 0;
        }
        .muted {
          color: rgba(234, 240, 255, 0.65);
          font-size: 12px;
        }
        .grid {
          width: 100%;
          overflow: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        th,
        td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 10px;
          text-align: left;
          vertical-align: top;
          font-size: 12px;
          line-height: 1.35;
          white-space: nowrap;
        }
        th {
          color: rgba(234, 240, 255, 0.72);
          font-weight: 600;
          background: rgba(255, 255, 255, 0.02);
          position: sticky;
          top: 0;
          z-index: 1;
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
        .formRow {
          display: grid;
          grid-template-columns: 2fr 1fr 2fr auto;
          gap: 10px;
          width: 100%;
          align-items: end;
        }
        @media (max-width: 900px) {
          .formRow {
            grid-template-columns: 1fr;
          }
        }
        label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        input,
        select {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.22);
          color: #eaf0ff;
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13px;
          outline: none;
        }
        input:focus,
        select:focus {
          border-color: rgba(132, 160, 255, 0.55);
        }
      `}</style>

      <main className="shell">
        <div className="top">
          <div>
            <h1>Entities</h1>
            <p className="sub">Create and manage legal entities and EORI. Registered address is stored per legal entity.</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/app">
              Back to app
            </Link>
          </div>
        </div>

        {err ? <div className="error">{err}</div> : null}

        <section className="card" aria-label="Org selector">
          <div className="row">
            <div>
              <div style={{ fontWeight: 800 }}>Active importer org</div>
              <div className="muted">Used only to resolve group membership for entity creation.</div>
            </div>
            <div style={{ minWidth: 320 }}>
              <select value={activeOrgId} onChange={(e) => setActiveOrgId(e.target.value)}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <form className="formRow" onSubmit={createEntity}>
              <label>
                Display name
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Legal entity name" />
              </label>

              <label>
                Country
                <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="GB" />
              </label>

              <label>
                EORI (optional)
                <input value={newEori} onChange={(e) => setNewEori(e.target.value)} placeholder="GB123..." />
              </label>

              <button className="btn" type="submit" disabled={creating || !activeGroupId}>
                {creating ? "Creating..." : "Create entity"}
              </button>
            </form>
          </div>
        </section>

        <div style={{ height: 12 }} />

        <section className="card" aria-label="Entities list">
          <div className="grid">
            <table>
              <thead>
                <tr>
                  <th>Display name</th>
                  <th>Country</th>
                  <th>EORI</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Loading...
                    </td>
                  </tr>
                ) : entities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No legal entities found.
                    </td>
                  </tr>
                ) : (
                  entities.map((le) => (
                    <tr key={le.id}>
                      <td>{le.display_name}</td>
                      <td>{le.country_code}</td>
                      <td>{le.eori || "-"}</td>
                      <td>{le.created_at}</td>
                      <td>
                        <Link className="btn" href={`/importer/entities/${le.id}`}>
                          Edit
                        </Link>{" "}
                        <Link className="btn" href={`/importer/entities/${le.id}/address`}>
                          Address
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
// FILE: marketing/pages/importer/entities/index.tsx
