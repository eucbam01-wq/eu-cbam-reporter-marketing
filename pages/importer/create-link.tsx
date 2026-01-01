// FILE: marketing/pages/importer/create-link.tsx (repo: eu-cbam-reporter/marketing)
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

type ReportItem = {
  report_item_id: string;
  report_id: string;
  cn_code: string | null;
  goods_description: string | null;
  supplier_name: string | null;
  quantity: number | null;
  net_mass_kg: number | null;
  country_of_origin: string | null;
  procedure_code: string | null;
};

type CreateSupplierRequestWithTokenResult = {
  plaintext_token: string;
  full_url: string;
  supplier_request_id: string;
  token_hash: string;
  expires_at: string;
  token_expires_at: string;
};

export default function CreateSupplierLinkPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [items, setItems] = useState<ReportItem[]>([]);
  const [reportItemId, setReportItemId] = useState("");

  const [result, setResult] = useState<CreateSupplierRequestWithTokenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSessionChecked, setHasSessionChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setIsAuthed(!!data?.session);
        if (data?.session) {
          const { data: rows, error: err } = await supabase.rpc("list_report_items_for_importer");
          if (err) throw err;
          if (mounted) setItems(rows || []);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load report items");
      } finally {
        if (mounted) setHasSessionChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not signed in");

      const rid = reportItemId.trim();
      if (!rid) throw new Error("report_item_id is required");

      const { data, error: err } = await supabase.rpc("create_supplier_request_with_token", {
        p_report_item_id: rid,
        p_supplier_id: null,
      });

      if (err) throw err;

      const row = (Array.isArray(data) ? data?.[0] : data) as any;
      if (!row?.plaintext_token || !row?.full_url || !row?.supplier_request_id) {
        throw new Error("Unexpected RPC response");
      }

      setResult({
        plaintext_token: row.plaintext_token,
        full_url: row.full_url,
        supplier_request_id: row.supplier_request_id,
        token_hash: row.token_hash,
        expires_at: row.expires_at,
        token_expires_at: row.token_expires_at,
      });
    } catch (ex: any) {
      setError(ex?.message ?? "Failed to create supplier link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui" }}>
      <Head>
        <title>GrandScope | Create supplier link</title>
        <meta name="viewport" content="width=device-width" />
      </Head>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Create supplier link</h1>
        <Link href="/importer/supplier-links">Back</Link>
      </div>

      {!hasSessionChecked ? (
        <p style={{ marginTop: 12 }}>Loading…</p>
      ) : !isAuthed ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>Not signed in.</p>
          <p style={{ marginTop: 8 }}>
            <Link href="/login">Go to login</Link>
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={onCreate} style={{ marginTop: 12, maxWidth: 900 }}>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600 }}>Report item</label>
              <select
                style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
                value={reportItemId}
                onChange={(e) => setReportItemId(e.target.value)}
              >
                <option value="">Select report item</option>
                {items.map((it) => (
                  <option key={it.report_item_id} value={it.report_item_id}>
                    {it.cn_code || "CN?"} · {it.goods_description || "No description"} · {it.supplier_name || "Supplier?"}
                  </option>
                ))}
              </select>
            </div>

            <button style={{ marginTop: 12 }} disabled={loading}>
              {loading ? "Working…" : "Generate link"}
            </button>
          </form>

          {error ? <pre style={{ color: "red", marginTop: 12, whiteSpace: "pre-wrap" }}>{error}</pre> : null}

          {result ? (
            <div style={{ marginTop: 12, maxWidth: 900 }}>
              <h3 style={{ marginBottom: 8 }}>Issued token</h3>
              <pre style={{ background: "#f4f4f4", padding: 12, overflowX: "auto" }}>
{JSON.stringify(result, null, 2)}
              </pre>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600 }}>Supplier request ID</div>
                <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {result.supplier_request_id}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600 }}>Supplier link</div>
                <div style={{ marginTop: 6 }}>
                  <a href={result.full_url} target="_blank" rel="noreferrer">
                    {result.full_url}
                  </a>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600 }}>Plaintext token (show once)</div>
                <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {result.plaintext_token}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
// FILE: marketing/pages/importer/create-link.tsx (repo: eu-cbam-reporter/marketing)
