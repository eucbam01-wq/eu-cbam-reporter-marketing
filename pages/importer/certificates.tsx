// FILE: marketing/pages/importer/certificates.tsx
import Head from "next/head";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CertificatesPage() {
  const [carryover, setCarryover] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cbam_certificate_balance_by_year")
        .select("*")
        .order("year", { ascending: true });

      setCarryover(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="gsx-root">
      <Head>
        <title>GrandScope | Certificates</title>
      </Head>

      <h1>Carryover (cumulative balance)</h1>

      {!loading && carryover.length === 0 && (
        <div className="gsx-empty">
          Carryover appears after certificates are settled and rolled into the next reporting year.
          With only one reporting year or no purchases, no carryover is generated.
        </div>
      )}

      {carryover.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Required</th>
              <th>Purchased</th>
              <th>Net</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {carryover.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td>{r.certificates_required}</td>
                <td>{r.certificates_purchased}</td>
                <td>{r.net_for_year}</td>
                <td>{r.net_for_year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
// FILE: marketing/pages/importer/certificates.tsx
