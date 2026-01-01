// FILE: marketing/pages/importer/create-link.tsx
import Head from "next/head";
import React, { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

export default function CreateSupplierLinkPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [supplierRequestId, setSupplierRequestId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!supplierRequestId.trim()) throw new Error("supplier_request_id is required");

      const { data, error: err } = await supabase.rpc(
        "create_supplier_portal_token_for_request",
        { p_supplier_request_id: supplierRequestId.trim() }
      );

      if (err) throw err;
      setResult(data?.[0] ?? data);
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

      <h1>Create supplier link</h1>

      <form onSubmit={onCreate}>
        <div style={{ marginTop: 12 }}>
          <label>Supplier request ID</label>
          <input
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            value={supplierRequestId}
            onChange={(e) => setSupplierRequestId(e.target.value)}
          />
        </div>

        <button style={{ marginTop: 12 }} disabled={loading}>
          {loading ? "Working…" : "Generate link"}
        </button>
      </form>

      {error ? <pre style={{ color: "red", marginTop: 12 }}>{error}</pre> : null}
      {result ? (
        <pre style={{ marginTop: 12, background: "#f4f4f4", padding: 12 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
// FILE: marketing/pages/importer/create-link.tsx
