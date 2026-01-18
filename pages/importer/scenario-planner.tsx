// FILE: marketing/pages/importer/scenario-planner.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export default function ScenarioPlanner() {
  const sb = useMemo(() => supabase(), []);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sb.from("scenario_exposure_by_dimension")
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data || []);
      });
  }, [sb]);

  return (
    <>
      <Head>
        <title>GrandScope | Scenario Planner</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ padding: 24 }}>
        <h1>Scenario Planner</h1>
        {error && <pre>{error}</pre>}
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>CN</th>
              <th>Actual tCO2e</th>
              <th>Default tCO2e</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.supplier_name}</td>
                <td>{r.cn_code}</td>
                <td>{r.embedded_tco2e_actual_only}</td>
                <td>{r.embedded_tco2e_default_only}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
// FILE: marketing/pages/importer/scenario-planner.tsx
