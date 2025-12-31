// FILE: marketing/pages/supplier/[token].tsx
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * IMPORTANT
 * This page is intentionally isolated (no PublicLayout) so suppliers never see the marketing navbar/footer.
 * It is also intentionally set to noindex/nofollow.
 */

type LoadState = "idle" | "loading" | "ready" | "error";

type SupplierRequestItem = {
  cn_code?: string | null;
  procedure_code?: string | null;
  net_mass_kg?: number | null;
};

type SupplierRequestPayload = {
  request_id?: string | null;
  supplier_name?: string | null;
  reporting_period?: string | null;
  deadline_utc?: string | null;
  items?: SupplierRequestItem[];
  locale?: string | null;
};

type RpcOk<T> = { ok: true; data: T };
type RpcErr = { ok: false; error: string; details?: any };

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}

async function tryRpc<T>(
  supabase: SupabaseClient,
  candidates: { fn: string; args: Record<string, any> }[]
): Promise<RpcOk<T> | RpcErr> {
  let lastErr: any = null;
  for (const c of candidates) {
    const { data, error } = await supabase.rpc(c.fn as any, c.args as any);
    if (!error) return { ok: true, data: data as T };
    lastErr = { fn: c.fn, error };
  }
  return {
    ok: false,
    error: "RPC call failed. Ensure the expected RPC function exists and is exposed to anon.",
    details: lastErr
  };
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 py-10"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{
        background:
          "radial-gradient(900px 260px at 15% 0%, rgba(48,98,99,.08), transparent 58%), radial-gradient(900px 260px at 85% 0%, rgba(255,214,23,.08), transparent 62%), rgba(255,255,255,.96)"
      }}
    >
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-slate-900">{children}</div>;
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-xs text-slate-600">{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
        props.className
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={classNames(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={classNames(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
        props.className
      )}
    />
  );
}

function Divider() {
  return <div className="my-8 h-px w-full bg-slate-200" />;
}

function formatNum(n: any) {
  if (n === null || n === undefined || n === "") return "";
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toString();
}

type PrecursorRow = {
  cn_code: string;
  quantity_tonnes: string;
  embedded_emissions_tco2e_per_tonne: string;
};

type FormState = {
  contact_name: string;
  contact_email: string;

  direct_emissions_tco2e: string;
  indirect_emissions_tco2e: string;

  electricity_source: "grid_average" | "actual_ppa";
  electricity_mwh: string;
  electricity_emission_factor_tco2e_per_mwh: string;
  electricity_evidence: File | null;

  precursors_used: "no" | "yes";
  precursors: PrecursorRow[];

  carbon_price_rebate_applies: "no" | "yes";
  rebate_amount_value: string;
  rebate_currency: string;

  notes: string;
};

function defaultForm(): FormState {
  return {
    contact_name: "",
    contact_email: "",

    direct_emissions_tco2e: "",
    indirect_emissions_tco2e: "",

    electricity_source: "grid_average",
    electricity_mwh: "",
    electricity_emission_factor_tco2e_per_mwh: "",
    electricity_evidence: null,

    precursors_used: "no",
    precursors: [],

    carbon_price_rebate_applies: "no",
    rebate_amount_value: "",
    rebate_currency: "EUR",

    notes: ""
  };
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function SupplierPortalForm({
  token,
  request
}: {
  token: string;
  request: SupplierRequestPayload;
}) {
  const [state, setState] = useState<FormState>(() => defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const supabase = useMemo(() => getSupabase(), []);

  const evidenceBucket = process.env.NEXT_PUBLIC_SUPABASE_EVIDENCE_BUCKET || "supplier-evidence";

  const title = `${request?.supplier_name || "Supplier"} \u2013 EU CBAM Carbon Emissions Form`;

  const canSubmit = useMemo(() => {
    if (!state.contact_name.trim()) return false;
    if (!isEmail(state.contact_email)) return false;
    if (!state.direct_emissions_tco2e.trim()) return false;
    if (!state.indirect_emissions_tco2e.trim()) return false;

    if (!state.electricity_mwh.trim()) return false;
    if (state.electricity_source === "actual_ppa") {
      if (!state.electricity_emission_factor_tco2e_per_mwh.trim()) return false;
      if (!state.electricity_evidence) return false;
    }

    if (state.precursors_used === "yes") {
      if (state.precursors.length === 0) return false;
      for (const r of state.precursors) {
        if (!r.cn_code.trim()) return false;
        if (!r.quantity_tonnes.trim()) return false;
        if (!r.embedded_emissions_tco2e_per_tonne.trim()) return false;
      }
    }

    if (state.carbon_price_rebate_applies === "yes") {
      if (!state.rebate_amount_value.trim()) return false;
      if (!state.rebate_currency.trim()) return false;
    }

    return true;
  }, [state]);

  async function uploadEvidence(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const key = `supplier/${token}/${Date.now()}_${safe}`;
    const { error } = await supabase.storage.from(evidenceBucket).upload(key, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });
    if (error) throw new Error(`Evidence upload failed: ${error.message}`);
    return key;
  }

  async function onSubmit() {
    setSubmitting(true);
    setSubmitErr(null);

    try {
      let evidence_key: string | null = null;
      if (state.electricity_source === "actual_ppa" && state.electricity_evidence) {
        evidence_key = await uploadEvidence(state.electricity_evidence);
      }

      const payload = {
        client_submitted_at: new Date().toISOString(),
        token,
        request_id: request.request_id || null,
        contact: {
          name: state.contact_name.trim(),
          email: state.contact_email.trim()
        },
        electricity: {
          source: state.electricity_source,
          mwh: Number(state.electricity_mwh),
          emission_factor_tco2e_per_mwh:
            state.electricity_source === "actual_ppa"
              ? Number(state.electricity_emission_factor_tco2e_per_mwh)
              : null,
          evidence_key
        },
        emissions: {
          direct_emissions_tco2e: Number(state.direct_emissions_tco2e),
          indirect_emissions_tco2e: Number(state.indirect_emissions_tco2e)
        },
        precursors:
          state.precursors_used === "yes"
            ? state.precursors.map((r) => ({
                cn_code: r.cn_code.trim(),
                quantity_tonnes: Number(r.quantity_tonnes),
                embedded_emissions_tco2e_per_tonne: Number(r.embedded_emissions_tco2e_per_tonne)
              }))
            : [],
        carbon_price: {
          rebate_applies: state.carbon_price_rebate_applies === "yes",
          rebate_amount_value:
            state.carbon_price_rebate_applies === "yes" ? Number(state.rebate_amount_value) : null,
          rebate_currency:
            state.carbon_price_rebate_applies === "yes" ? state.rebate_currency.trim() : null
        },
        notes: state.notes?.trim() || null
      };

      const res = await tryRpc<any>(supabase, [
        { fn: "supplier_portal_submit", args: { p_token: token, p_payload: payload } },
        { fn: "supplier_submit_payload", args: { p_token: token, p_payload: payload } },
        { fn: "supplier_submission_submit", args: { p_token: token, p_payload: payload } }
      ]);

      if (!res.ok) {
        throw new Error(
          `${res.error}${res.details ? ` | details: ${JSON.stringify(res.details)}` : ""}`
        );
      }

      setSubmitOk(true);
    } catch (e: any) {
      setSubmitErr(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge>Supplier portal</Badge>
        {request.reporting_period ? <Badge>Reporting period: {request.reporting_period}</Badge> : null}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-700">
        Required under EU law for goods supplied to the European Union.
      </p>

      <div className="mt-8">
        <Card>
          <div className="p-6">
            {submitOk ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Submitted successfully. You can close this page.
              </div>
            ) : null}

            {submitErr ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {submitErr}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Contact name</FieldLabel>
                <Input
                  value={state.contact_name}
                  onChange={(e) => setState((s) => ({ ...s, contact_name: e.target.value }))}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>
              <div>
                <FieldLabel>Contact email</FieldLabel>
                <Input
                  value={state.contact_email}
                  onChange={(e) => setState((s) => ({ ...s, contact_email: e.target.value }))}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <Divider />

            <div>
              <div className="text-sm font-semibold text-slate-900">Electricity</div>
              <HelpText>
                Grid average requires MWh only. Actual (PPA) requires an electricity emission factor and
                evidence.
              </HelpText>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Electricity source</FieldLabel>
                  <Select
                    value={state.electricity_source}
                    onChange={(e) =>
                      setState((s) => ({ ...s, electricity_source: e.target.value as any }))
                    }
                  >
                    <option value="grid_average">Grid average</option>
                    <option value="actual_ppa">Actual (PPA)</option>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Electricity (MWh)</FieldLabel>
                  <Input
                    value={state.electricity_mwh}
                    onChange={(e) => setState((s) => ({ ...s, electricity_mwh: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>

                {state.electricity_source === "actual_ppa" ? (
                  <>
                    <div>
                      <FieldLabel>Electricity emission factor (tCO2e/MWh)</FieldLabel>
                      <Input
                        value={state.electricity_emission_factor_tco2e_per_mwh}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            electricity_emission_factor_tco2e_per_mwh: e.target.value
                          }))
                        }
                        inputMode="decimal"
                        placeholder="0.0000"
                      />
                    </div>

                    <div>
                      <FieldLabel>Evidence file</FieldLabel>
                      <HelpText>Upload the supporting document required for Actual (PPA).</HelpText>
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            electricity_evidence: e.target.files?.[0] || null
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <Divider />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Direct emissions (tCO2e)</FieldLabel>
                <Input
                  value={state.direct_emissions_tco2e}
                  onChange={(e) => setState((s) => ({ ...s, direct_emissions_tco2e: e.target.value }))}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
              <div>
                <FieldLabel>Indirect emissions (tCO2e)</FieldLabel>
                <Input
                  value={state.indirect_emissions_tco2e}
                  onChange={(e) => setState((s) => ({ ...s, indirect_emissions_tco2e: e.target.value }))}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
            </div>

            <Divider />

            <div>
              <div className="text-sm font-semibold text-slate-900">Precursors</div>
              <HelpText>
                If you used input materials (precursors) for this product, add each material row with CN
                code, quantity used (tonnes), and embedded emissions (tCO2e/tonne).
              </HelpText>

              <div className="mt-4">
                <FieldLabel>Were precursors used?</FieldLabel>
                <Select
                  value={state.precursors_used}
                  onChange={(e) => setState((s) => ({ ...s, precursors_used: e.target.value as any }))}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </div>

              {state.precursors_used === "yes" ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Precursor rows</div>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          precursors: [
                            ...s.precursors,
                            { cn_code: "", quantity_tonnes: "", embedded_emissions_tco2e_per_tonne: "" }
                          ]
                        }))
                      }
                    >
                      Add input material
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {state.precursors.map((r, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Material {idx + 1}</div>
                          <button
                            type="button"
                            className="text-sm font-medium text-rose-700 hover:text-rose-900"
                            onClick={() =>
                              setState((s) => ({
                                ...s,
                                precursors: s.precursors.filter((_, i) => i !== idx)
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <FieldLabel>CN code</FieldLabel>
                            <Input
                              value={r.cn_code}
                              onChange={(e) => {
                                const v = e.target.value;
                                setState((s) => ({
                                  ...s,
                                  precursors: s.precursors.map((x, i) =>
                                    i === idx ? { ...x, cn_code: v } : x
                                  )
                                }));
                              }}
                              placeholder="e.g. 720711"
                            />
                          </div>

                          <div>
                            <FieldLabel>Quantity used (tonnes)</FieldLabel>
                            <Input
                              value={r.quantity_tonnes}
                              onChange={(e) => {
                                const v = e.target.value;
                                setState((s) => ({
                                  ...s,
                                  precursors: s.precursors.map((x, i) =>
                                    i === idx ? { ...x, quantity_tonnes: v } : x
                                  )
                                }));
                              }}
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <FieldLabel>Embedded emissions (tCO2e/tonne)</FieldLabel>
                            <Input
                              value={r.embedded_emissions_tco2e_per_tonne}
                              onChange={(e) => {
                                const v = e.target.value;
                                setState((s) => ({
                                  ...s,
                                  precursors: s.precursors.map((x, i) =>
                                    i === idx ? { ...x, embedded_emissions_tco2e_per_tonne: v } : x
                                  )
                                }));
                              }}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {state.precursors.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Add at least one input material row.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <Divider />

            <div>
              <div className="text-sm font-semibold text-slate-900">Carbon price</div>
              <HelpText>
                If a carbon price rebate applies, the rebate amount is required. If not applicable, select No.
              </HelpText>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Rebate applies?</FieldLabel>
                  <Select
                    value={state.carbon_price_rebate_applies}
                    onChange={(e) =>
                      setState((s) => ({ ...s, carbon_price_rebate_applies: e.target.value as any }))
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </div>

                {state.carbon_price_rebate_applies === "yes" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Rebate amount</FieldLabel>
                      <Input
                        value={state.rebate_amount_value}
                        onChange={(e) => setState((s) => ({ ...s, rebate_amount_value: e.target.value }))}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <FieldLabel>Currency</FieldLabel>
                      <Input
                        value={state.rebate_currency}
                        onChange={(e) => setState((s) => ({ ...s, rebate_currency: e.target.value }))}
                        placeholder="EUR"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Divider />

            <div>
              <FieldLabel>Notes / methodology</FieldLabel>
              <HelpText>Optional. Provide any helpful context on calculation method or assumptions.</HelpText>
              <Textarea
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                rows={4}
                placeholder="Optional"
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                This link is valid only for the supplier token you received.
              </div>
              <button
                type="button"
                disabled={!canSubmit || submitting || submitOk}
                onClick={onSubmit}
                className={classNames(
                  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition",
                  canSubmit && !submitting && !submitOk
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                {submitting ? "Submitting..." : submitOk ? "Submitted" : "Submit"}
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 text-xs text-slate-500">
        If you have issues submitting, contact the importer who sent this link and provide your token.
      </div>
    </Panel>
  );
}

export default function SupplierTokenPage({ initialRequest, initialError }: { initialRequest: SupplierRequestPayload | null; initialError: string | null; }) {
  const router = useRouter();
  const token = useMemo(() => {
    const t = router.query?.token;
    return typeof t === "string" ? t : "";
  }, [router.query]);

  const [loadState, setLoadState] = useState<LoadState>(() => {
    if (initialRequest) return "ready";
    if (initialError) return "error";
    return "idle";
  });
  const [err, setErr] = useState<string | null>(initialError || null);
  const [request, setRequest] = useState<SupplierRequestPayload | null>(initialRequest || null);
useEffect(() => {
    let alive = true;
    async function load() {
      if (!token) return;
      if (initialRequest || initialError) return;
      setLoadState("loading");
      setErr(null);

      try {
        const supabase = getSupabase();

        // Try the most likely RPC function names first.
        // Your DB already enforces validity, expiry and single-use at DB level.
        const res = await tryRpc<SupplierRequestPayload>(supabase, [
          { fn: "supplier_portal_init", args: { p_token: token } },
          { fn: "supplier_validate_token", args: { p_token: token } },
          { fn: "supplier_request_by_token", args: { p_token: token } }
        ]);

        if (!res.ok) {
          throw new Error(
            `${res.error}${res.details ? ` | details: ${JSON.stringify(res.details)}` : ""}`
          );
        }

        const data = res.data || {};
        if (!alive) return;
        setRequest(data);
        setLoadState("ready");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Unable to load supplier request");
        setLoadState("error");
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <Panel>
      <Head>
        <title>Supplier portal</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <Card>
        <div className="p-6">
          <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Supplier portal
          </div>

          {loadState === "idle" || loadState === "loading" ? (
            <div className="text-sm text-slate-700">Loading...</div>
          ) : null}

          {loadState === "error" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {err || "Invalid or expired link."}
            </div>
          ) : null}

          {loadState === "ready" && request ? (
            <SupplierPortalForm token={token} request={request} />
          ) : null}
        </div>
      </Card>
    </Panel>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const tokenParam = ctx.params?.token;
  const token = typeof tokenParam === "string" ? tokenParam : "";

  if (!token) {
    return { props: { initialRequest: null, initialError: "Invalid link." } };
  }

  try {
    const supabase = getSupabase();

    const res = await tryRpc<SupplierRequestPayload>(supabase, [
      { fn: "supplier_portal_init", args: { p_token: token } },
      { fn: "supplier_validate_token", args: { p_token: token } },
      { fn: "supplier_request_by_token", args: { p_token: token } }
    ]);

    if (!res.ok) {
      return { props: { initialRequest: null, initialError: "Invalid or expired link." } };
    }

    return { props: { initialRequest: res.data || null, initialError: null } };
  } catch (e: any) {
    return { props: { initialRequest: null, initialError: "Unable to load supplier request." } };
  }
};

// FILE: marketing/pages/supplier/[token].tsx
