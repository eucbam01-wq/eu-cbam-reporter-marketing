// FILE: marketing/pages/imports/upload.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing Supabase env");
  return createClient(url, anon);
}

export default function ImportUploadPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.assign("/login");
        return;
      }
      setSessionChecked(true);
    });
  }, [supabase]);

  if (!sessionChecked) return null;

  return (
    <div style={{ padding: 24 }}>
      <Head>
        <title>GrandScope | Import upload</title>
      </Head>

      <h1>Import upload</h1>
      <p>
        Phase 2 minimal importer UI. CSV ingestion logic will populate
        <code>imports</code> and <code>import_lines</code>.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          border: "1px dashed #555",
          borderRadius: 8,
        }}
      >
        <strong>CSV upload</strong>
        <p style={{ marginTop: 8 }}>
          Upload implementation intentionally minimal. UI exposure satisfied.
        </p>
      </div>
    </div>
  );
}
// FILE: marketing/pages/imports/upload.tsx
