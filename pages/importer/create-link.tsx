// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\create-link.tsx
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
  cn_code: string | null;
  goods_description: string | null;
  supplier_name: string | null;
};

type Supplier = {
  supplier_id: string;
  supplier_name: string;
  supplier_email: string | null;
};

type CreateSupplierRequestWithTokenResult = {
  plaintext_token: string;
  full_url: string;
  supplier_request_id: string;
  token_hash: string;
  token_expires_at: string;
};

export default function CreateSupplierLinkPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [items, setItems] = useState<ReportItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reportItemId, setReportItemId] = useState("");
  const [supplierId, setSupplierId] = useState("");

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
          const [{ data: itemsRows, error: itemsErr }, { data: supplierRows, error: supplierErr }] =
            await Promise.all([
              supabase.rpc("list_report_items_for_importer"),
              supabase.rpc("list_suppliers_for_importer"),
            ]);
          if (itemsErr) throw itemsErr;
          if (supplierErr) throw supplierErr;
          if (mounted) {
            setItems(itemsRows || []);
            setSuppliers(supplierRows || []);
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load data");
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
      if (!reportItemId) throw new Error("report_item_id is required");
      if (!supplierId) throw new Error("supplier_id is required");

      const { data, error: err } = await supabase.rpc("create_supplier_request_with_token", {
        p_report_item_id: reportItemId,
        p_supplier_id: supplierId,
      });
      if (err) throw err;

      const row = (Array.isArray(data) ? data[0] : data) as any;
      if (!row?.plaintext_token || !row?.full_url || !row?.supplier_request_id) {
        throw new Error("Unexpected RPC response");
      }

      setResult({
        plaintext_token: row.plaintext_token,
        full_url: row.full_url,
        supplier_request_id: row.supplier_request_id,
        token_hash: row.token_hash,
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
          <p>Not signed in.</p>
          <Link href="/login">Go to login</Link>
        </div>
      ) : (
        <>
          <form onSubmit={onCreate} style={{ marginTop: 12, maxWidth: 900 }}>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600 }}>Report item</label>
              <select
                style={{ width: "100%", padding: 8, marginTop: 6 }}
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

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600 }}>Supplier</label>
              <select
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.supplier_name}
                  </option>
                ))}
              </select>
            </div>

            <button style={{ marginTop: 12 }} disabled={loading}>
              {loading ? "Working…" : "Generate link"}
            </button>
          </form>

          {error && <pre style={{ color: "red", marginTop: 12 }}>{error}</pre>}

          {result && (
            <div style={{ marginTop: 12 }}>
              <div><strong>Supplier request ID</strong></div>
              <div>{result.supplier_request_id}</div>
              <div style={{ marginTop: 8 }}><strong>Supplier link</strong></div>
              <a href={result.full_url} target="_blank" rel="noreferrer">{result.full_url}</a>
              <div style={{ marginTop: 8 }}><strong>Plaintext token</strong></div>
              <div>{result.plaintext_token}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\create-link.tsx
