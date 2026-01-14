// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\users.tsx
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

type OrgRow = { id: string; name: string; type: string };
type MembershipRow = { user_id: string; org_id: string; role: string; created_at?: string };


export default function ImporterUsersPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");

  const [members, setMembers] = useState<MembershipRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRow["role"]>("member");
  const [inviting, setInviting] = useState(false);

  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

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
          .select("id,name,type")
          .order("created_at", { ascending: true });

        if (orgErr) throw orgErr;

        const list = (orgRows || []) as OrgRow[];
        const importerOnly = list.filter((o) => o.type === "importer");

        if (!cancelled) {
          setOrgs(importerOnly);
          setActiveOrgId(importerOnly[0]?.id || "");
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

  async function loadMembers(orgId: string) {
    setMembersLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id,org_id,role,created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMembers((data || []) as MembershipRow[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    if (!activeOrgId) {
      setMembers([]);
      return;
    }
    loadMembers(activeOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;

    setInviting(true);
    setErr(null);

    try {
      const email = inviteEmail.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new Error("Valid email required.");

      const { data, error } = await supabase.functions.invoke("invite-org-member", {
        body: {
          org_id: activeOrgId,
          email,
          role: inviteRole,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error("Invite failed.");

      setInviteEmail("");
      await loadMembers(activeOrgId);
    } catch (e2: any) {
      setErr(e2?.message || String(e2));
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    if (!activeOrgId) return;
    setSavingUserId(userId);
    setErr(null);

    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("org_id", activeOrgId)
        .eq("user_id", userId);

      if (error) throw error;

      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSavingUserId(null);
    }
  }

  async function removeMember(userId: string) {
    if (!activeOrgId) return;
    setRemovingUserId(userId);
    setErr(null);

    try {
      const { error } = await supabase.from("memberships").delete().eq("org_id", activeOrgId).eq("user_id", userId);
      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Users</title>
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
          white-space: nowrap;
        }
        .btn:hover {
          border-color: rgba(132, 160, 255, 0.55);
          background: rgba(132, 160, 255, 0.12);
        }
        .btnDanger {
          border-color: rgba(255, 96, 96, 0.35);
          background: rgba(255, 96, 96, 0.08);
        }
        .btnDanger:hover {
          border-color: rgba(255, 96, 96, 0.55);
          background: rgba(255, 96, 96, 0.12);
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
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 10px;
          text-align: left;
          vertical-align: middle;
          font-size: 12px;
          line-height: 1.35;
          white-space: nowrap;
        }
        th {
          color: rgba(234, 240, 255, 0.72);
          font-weight: 700;
          background: rgba(255, 255, 255, 0.02);
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .formRow {
          display: grid;
          grid-template-columns: 1.75fr 1fr auto;
          gap: 10px;
          width: 100%;
          align-items: end;
        }
        @media (max-width: 900px) {
          .formRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="shell">
        <div className="top">
          <div>
            <h1>Users</h1>
            <p className="sub">Manage organization members. Invites are sent by Edge Function (auth admin).</p>
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
              <div className="muted">Members list and invites apply to this org.</div>
            </div>
            <div style={{ minWidth: 320 }}>
              <select value={activeOrgId} onChange={(e) => setActiveOrgId(e.target.value)} disabled={loading}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <form className="formRow" onSubmit={inviteMember}>
              <label>
                Invite email
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" />
              </label>

              <label>
                Role
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                  <option value="forwarder_member">forwarder_member</option>
                  <option value="forwarder_admin">forwarder_admin</option>
                </select>
              </label>

              <button className="btn" type="submit" disabled={inviting || !activeOrgId}>
                {inviting ? "Inviting..." : "Send invite"}
              </button>
            </form>
          </div>
        </section>

        <div style={{ height: 12 }} />

        <section className="card" aria-label="Members list">
          <div className="row">
            <div style={{ fontWeight: 900 }}>Members</div>
            <button className="btn" type="button" disabled={!activeOrgId || membersLoading} onClick={() => loadMembers(activeOrgId)}>
              {membersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>User id</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Loading...
                    </td>
                  </tr>
                ) : membersLoading ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Loading members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No members found (or RLS blocked).
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.user_id}>
                      <td title={m.user_id}>{m.user_id}</td>
                      <td>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.user_id, e.target.value)}
                          disabled={savingUserId === m.user_id}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                          <option value="forwarder_member">forwarder_member</option>
                          <option value="forwarder_admin">forwarder_admin</option>
                        </select>
                      </td>
                      <td>{m.created_at || "-"}</td>
                      <td>
                        <button
                          className="btn btnDanger"
                          type="button"
                          onClick={() => removeMember(m.user_id)}
                          disabled={removingUserId === m.user_id}
                        >
                          {removingUserId === m.user_id ? "Removing..." : "Remove"}
                        </button>
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
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\users.tsx
