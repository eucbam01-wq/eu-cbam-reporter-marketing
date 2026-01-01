// FILE: marketing/pages/supplier/supplier-portal-form.tsx
import React from "react";
// frontend/src/pages/supplier/[token]/supplier-portal-form.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type SupplierMeta, useSupplierI18n, type TFunc } from "../../src/supplier-i18n";

type PrecursorRow = {
  cn_code: string;
  quantity_tonnes: string;
  embedded_emissions_tco2e_per_tonne: string;
};

type EvidenceFileRef = {
  purpose: string;
  bucket: string;
  path: string;
  name: string;
  mime: string;
  size: number;
};

type FormInput = {
  identity: {
    operator_legal_name: string;
    installation_name: string;
    installation_address: {
      street: string;
      city: string;
      postal: string;
      country: string;
    };
    unlocode: string;
    coordinates: { lat: string; lng: string };
    nace_code: string;
  };
  goods: {
    cn_code: string;
    trade_name: string;
    production_route: string;
    quantity_tonnes: string;
  };
  scope1: {
    total_tco2e: string;
    source_streams: string[];
  };
  scope2: {
    electricity_mwh: string;
    source_type: "grid_average" | "actual";
    emission_factor_tco2e_per_mwh: string;
    evidence_file: File | null;
  };
  precursors: {
    used: boolean;
    items: PrecursorRow[];
  };
  carbon_price: {
    scheme_name: string;
    amount_paid: string;
    currency: string;
    quantity_covered_tco2e: string;
    rebate_or_free_allocation: boolean;
    rebate_amount: string;
  };
  notes: string;
};

type InvalidReason = "used" | "expired" | "invalid" | "generic";

function getSupplierSupabase(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anon) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: { headers: { "x-supplier-token": token } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function asSingleRow<T>(data: any): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return data as T;
}

function classifyInvalidReason(msg: string): InvalidReason {
  const s = (msg || "").toLowerCase();
  if ((s.includes("used") || s.includes("already")) && s.includes("use")) return "used";
  if (s.includes("used") && !s.includes("unused")) return "used";
  if (s.includes("expired") || s.includes("expires") || s.includes("expiry")) return "expired";
  if (s.includes("invalid") || s.includes("not found") || s.includes("no rows")) return "invalid";
  return "generic";
}

function extractSupplierMeta(raw: any): SupplierMeta {
  if (!raw || typeof raw !== "object") return { supplierName: null, companyName: null, locale: null };

  const pickDirect = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  const deepPick = (obj: any, keys: string[], maxDepth = 6): string | null => {
    if (!obj || typeof obj !== "object") return null;

    const seen = new Set<any>();
    const q: Array<{ v: any; depth: number }> = [{ v: obj, depth: 0 }];

    while (q.length) {
      const cur = q.shift();
      if (!cur) break;

      const { v, depth } = cur;
      if (!v || typeof v !== "object") continue;
      if (seen.has(v)) continue;
      seen.add(v);

      const direct = pickDirect(v, keys);
      if (direct) return direct;

      if (depth >= maxDepth) continue;

      const values = Array.isArray(v) ? v : Object.values(v);
      for (const child of values) {
        if (child && typeof child === "object") q.push({ v: child, depth: depth + 1 });
      }
    }

    return null;
  };

  const supplierName =
    deepPick(raw, ["supplier_name", "supplierName", "supplier_legal_name", "supplierLegalName"]) ||
    pickDirect(raw?.supplier, ["name", "supplier_name", "supplierName"]);

  const companyNameRaw =
    deepPick(raw, [
      "company_name",
      "companyName",
      "company_legal_name",
      "companyLegalName",
      "legal_name",
      "legalName",
      "importer_name",
      "importerName",
      "organization_name",
      "organizationName",
    ]) || pickDirect(raw?.company, ["name", "company_name", "companyName"]);

  const locale =
    deepPick(raw, [
      "locale",
      "language",
      "lang",
      "supplier_locale",
      "supplierLanguage",
      "preferred_language",
      "preferredLanguage",
    ]) ||
    pickDirect(raw?.supplier, ["locale", "language", "lang"]) ||
    pickDirect(raw?.report, ["locale", "language", "lang"]);

  const companyName = companyNameRaw || supplierName;

  return { supplierName, companyName, locale };
}


function parseValidateReturn(raw: any): {
  request_id: string | null;
  cn_code: string | null;
  expires_at: string | null;
  status?: string | null;
  error?: string;
} {
  let request_id: string | null = null;
  let cn_code: string | null = null;
  let expires_at: string | null = null;
  let status: string | null = null;

  if (typeof raw === "string") {
    const s = raw.trim();
    const m = s.match(/^\((.*)\)$/);
    const inner = m ? m[1] : s;

    const parts: Array<string | null> = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '"') {
        if (inQuotes && inner[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        parts.push(cur === "NULL" ? null : cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    parts.push(cur === "NULL" ? null : cur);

    const cleaned = parts.map((p) => (typeof p === "string" ? p.trim() : p));

    if (cleaned.length >= 3) {
      request_id = (cleaned[0] ?? null) as any;
      cn_code = (cleaned[1] ?? null) as any;
      expires_at = (cleaned[2] ?? null) as any;
    }
  } else if (Array.isArray(raw)) {
    request_id = (raw[0] ?? null) as any;
    cn_code = (raw[1] ?? null) as any;
    expires_at = (raw[2] ?? null) as any;
  } else if (raw && typeof raw === "object") {
    request_id = (raw.request_id ?? null) as any;
    cn_code = (raw.cn_code ?? null) as any;
    expires_at = (raw.expires_at ?? null) as any;
    status = (raw.status ?? null) as any;
    if ((raw as any).error) return { request_id, cn_code, expires_at, status, error: (raw as any).error as any };
  }

  return { request_id, cn_code, expires_at, status };
}

function isValidNumberString(v: string): boolean {
  const s = (v || "").trim();
  if (!s) return false;
  return /^\d+(\.\d+)?$/.test(s);
}

function isValidNace(v: string): boolean {
  return /^[0-9]{4}$/.test((v || "").trim());
}

function isValidCnCode(v: string): boolean {
  return /^[0-9]{6,8}$/.test((v || "").trim());
}

function isValidLatLng(v: string): boolean {
  const s = (v || "").trim();
  if (!s) return false;
  return /^\-?\d+(\.\d{1,6})?$/.test(s);
}

function formatUtcYYYYMMDDHHMM(tsMs: number): string {
  const d = new Date(tsMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function getSupplierTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function formatLocalYYYYMMDDHHMM(tsMs: number, timeZone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(undefined, {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });

    const parts = fmt.formatToParts(new Date(tsMs));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const yyyy = get("year");
    const mm = get("month");
    const dd = get("day");
    const hh = get("hour");
    const mi = get("minute");
    const tz = get("timeZoneName");
    const tzSuffix = tz ? ` ${tz}` : (timeZone ? ` ${timeZone}` : "");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}${tzSuffix}`;
  } catch {
    return `${formatUtcYYYYMMDDHHMM(tsMs)} UTC`;
  }
}

function formatExpiryCountdown(
  expiresAt: string | null,
  nowMs: number,
  timeZone: string
): { mode: "none" | "invalid" | "expired" | "running"; days: number; hours: number; minutes: number; seconds: number | null; sub: string | null; raw: string | null } {
  if (!expiresAt) return { mode: "none", days: 0, hours: 0, minutes: 0, seconds: null, sub: null, raw: null };

  const expMs = Date.parse(expiresAt);
  if (Number.isNaN(expMs)) return { mode: "invalid", days: 0, hours: 0, minutes: 0, seconds: null, sub: null, raw: expiresAt };

  const diffMs = expMs - nowMs;
  const sub = formatLocalYYYYMMDDHHMM(expMs, timeZone);

  if (diffMs <= 0) return { mode: "expired", days: 0, hours: 0, minutes: 0, seconds: null, sub, raw: null };

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { mode: "running", days, hours, minutes, seconds, sub, raw: null };
}

function useNow(tickMs: number): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return nowMs;
}

function hasForbiddenNumberChars(v: string): boolean {
  return /[^0-9.,\s]/.test(v || "");
}

function sanitizeDecimalInput(next: string, prev: string): string {
  if (hasForbiddenNumberChars(next)) return prev;

  const raw = (next ?? "").replace(",", ".");
  let out = "";
  let dot = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !dot) {
      out += ".";
      dot = true;
      continue;
    }
  }

  if (out.startsWith(".")) out = `0${out}`;
  return out;
}

function finalizeDecimalInput(v: string): string {
  let s = (v ?? "").trim();
  if (!s) return "";
  if (s.endsWith(".")) s = s.slice(0, -1);
  return s;
}

function decimalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const k = e.key;

  if (
    k === "Backspace" ||
    k === "Delete" ||
    k === "Tab" ||
    k === "Enter" ||
    k === "Escape" ||
    k === "ArrowLeft" ||
    k === "ArrowRight" ||
    k === "Home" ||
    k === "End"
  ) {
    return;
  }

  if (k.length === 1 && /[0-9.,\-]/.test(k)) return;

  e.preventDefault();
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="gsx-fieldError">{msg}</div>;
}

function InfoTooltip({ t, meaningKey, exampleKey }: { t: TFunc; meaningKey: string; exampleKey: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth || 0;
    const padding = 12;
    const maxWidth = 360;
    const width = Math.max(240, Math.min(maxWidth, vw - padding * 2));
    const left = Math.max(padding, Math.min(rect.left, vw - width - padding));
    const top = rect.bottom + 8;

    setPos({ top, left, width });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (ev: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (ev.target && el.contains(ev.target as Node)) return;
      setOpen(false);
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="gsx-infoWrap"
      data-open={open ? "true" : "false"}
      onPointerEnter={(e) => {
        if ((e as any).pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if ((e as any).pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className="gsx-infoBtn"
        aria-label={t("common.info")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>

      <span
        className="gsx-tooltip"
        role="tooltip"
        style={
          open && pos
            ? {
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                zIndex: 10000,
                display: "block",
              }
            : { display: "none" }
        }
      >
        <span className="gsx-tooltipGrid">
          <span className="gsx-tooltipRow">
            <span className="gsx-tooltipKey">{t("common.meaning")}</span>
            <span className="gsx-tooltipVal">{t(meaningKey)}</span>
          </span>
          <span className="gsx-tooltipRow">
            <span className="gsx-tooltipKey">{t("common.example")}</span>
            <span className="gsx-tooltipVal">{t(exampleKey)}</span>
          </span>
        </span>
      </span>
    </span>
  );
}

function FieldLabelWithInfo({
  t,
  labelKey,
  required,
  meaningKey,
  exampleKey,
}: {
  t: TFunc;
  labelKey: string;
  required: boolean;
  meaningKey: string;
  exampleKey: string;
}) {
  return (
    <div className="gsx-labelRow">
      <span className="gsx-label">
        {t(labelKey)}
        {required ? (
          <span aria-hidden="true" className="gsx-requiredStar">
            *
          </span>
        ) : null}
      </span>

      <InfoTooltip t={t} meaningKey={meaningKey} exampleKey={exampleKey} />
    </div>
  );
}

function defaultInput(cnCode: string | null): FormInput {
  return {
    identity: {
      operator_legal_name: "",
      installation_name: "",
      installation_address: { street: "", city: "", postal: "", country: "" },
      unlocode: "",
      coordinates: { lat: "", lng: "" },
      nace_code: "",
    },
    goods: {
      cn_code: cnCode ?? "",
      trade_name: "",
      production_route: "",
      quantity_tonnes: "",
    },
    scope1: {
      total_tco2e: "",
      source_streams: [],
    },
    scope2: {
      electricity_mwh: "",
      source_type: "grid_average",
      emission_factor_tco2e_per_mwh: "",
      evidence_file: null,
    },
    precursors: {
      used: false,
      items: [{ cn_code: "", quantity_tonnes: "", embedded_emissions_tco2e_per_tonne: "" }],
    },
    carbon_price: {
      scheme_name: "",
      amount_paid: "",
      currency: "",
      quantity_covered_tco2e: "",
      rebate_or_free_allocation: false,
      rebate_amount: "",
    },
    notes: "",
  };
}

export default function SupplierPortalForm({
  token,
  onSuccess,
  onMetaLoaded,
  localeOverride,
  initialMeta,
}: {
  token: string;
  onSuccess?: () => void;
  onMetaLoaded?: (meta: SupplierMeta) => void;
  localeOverride?: string | null;
  initialMeta?: SupplierMeta;
}) {
  const supabase = useMemo(() => getSupplierSupabase(token), [token]);

  const onMetaLoadedRef = useRef<typeof onMetaLoaded>(onMetaLoaded);
  useEffect(() => {
    onMetaLoadedRef.current = onMetaLoaded;
  }, [onMetaLoaded]);

  const [loading, setLoading] = useState(true);
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null);

  const [requestId, setRequestId] = useState<string | null>(null);
  const [cnCode, setCnCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState<string | null>(() => initialMeta?.supplierName ?? null);
  const [companyName, setCompanyName] = useState<string | null>(() => initialMeta?.companyName ?? null);
  const [supplierLocale, setSupplierLocale] = useState<string | null>(() => initialMeta?.locale ?? null);

  useEffect(() => {
    if (!initialMeta) return;

    if (initialMeta.supplierName) {
      setSupplierName((cur) => (cur === initialMeta.supplierName ? cur : initialMeta.supplierName));
    }
    if (initialMeta.companyName) {
      setCompanyName((cur) => (cur === initialMeta.companyName ? cur : initialMeta.companyName));
    }
    if (initialMeta.locale) {
      setSupplierLocale((cur) => (cur === initialMeta.locale ? cur : initialMeta.locale));
    }
  }, [initialMeta?.supplierName, initialMeta?.companyName, initialMeta?.locale]);


  const { t } = useSupplierI18n(localeOverride ?? supplierLocale);

  const nowMs = useNow(1000);
  const supplierTimeZone = useMemo(() => getSupplierTimeZone(), []);
  const expiry = useMemo(() => formatExpiryCountdown(expiresAt, nowMs, supplierTimeZone), [expiresAt, nowMs, supplierTimeZone]);

  const [input, setInput] = useState<FormInput>(() => defaultInput(null));

  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileRef[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setInvalidReason(null);

      try {
        const { data: vData, error: vErr } = await supabase.rpc("validate_supplier_token" as any, { p_token: token } as any);
        if (vErr) throw vErr;

        const raw = asSingleRow<any>(vData);
        const parsed = parseValidateReturn(raw);

        const status = ((raw as any)?.status ?? parsed.status ?? null) as any;
        const ok = status ? status === "valid" : (raw as any)?.ok === true || (parsed.request_id !== null && parsed.request_id !== "");

        if (!ok) {
          const msg = (raw as any)?.error ?? parsed.error ?? "Invalid or expired supplier link.";
          if (!ignore) {
            setInvalidReason(classifyInvalidReason(msg));
            setLoading(false);
          }
          return;
        }

        if (!ignore) {
          setRequestId(parsed.request_id);
          setCnCode(parsed.cn_code);
          setExpiresAt(parsed.expires_at);
          setInput((cur) => ({
            ...cur,
            goods: { ...cur.goods, cn_code: parsed.cn_code ?? cur.goods.cn_code },
          }));
        }

        const metaFromValidate = extractSupplierMeta(raw);
        if (!ignore) {
          if (metaFromValidate.supplierName) setSupplierName(metaFromValidate.supplierName);
          if (metaFromValidate.companyName) setCompanyName(metaFromValidate.companyName);
          if (metaFromValidate.locale) setSupplierLocale(metaFromValidate.locale);
          if (onMetaLoadedRef.current) onMetaLoadedRef.current(metaFromValidate);
        }

        try {
          const ctxRes = await supabase.rpc("get_supplier_portal_context" as any, { p_token: token } as any);
          if (!ctxRes.error) {
            const payload = asSingleRow<any>(ctxRes.data);
            const metaFromContext = extractSupplierMeta(payload);

            if (!ignore) {
              if (metaFromContext.supplierName) setSupplierName(metaFromContext.supplierName);
              if (metaFromContext.companyName) setCompanyName(metaFromContext.companyName);
              if (metaFromContext.locale) setSupplierLocale(metaFromContext.locale);
              if (onMetaLoadedRef.current) onMetaLoadedRef.current(metaFromContext);
            }
          }
        } catch {
          // ignore
        }

        if (!ignore) setLoading(false);
      } catch (err: any) {
        if (!ignore) {
          setInvalidReason(classifyInvalidReason(err?.message ?? "Invalid or expired supplier link."));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, supabase]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};

    const id = input.identity;
    const goods = input.goods;
    const s1 = input.scope1;
    const s2 = input.scope2;
    const prec = input.precursors;
    const cp = input.carbon_price;

    if (!id.operator_legal_name.trim()) e["identity.operator_legal_name"] = t("validation.required");
    if (!id.installation_name.trim()) e["identity.installation_name"] = t("validation.required");

    if (!id.installation_address.street.trim()) e["identity.installation_address.street"] = t("validation.required");
    if (!id.installation_address.city.trim()) e["identity.installation_address.city"] = t("validation.required");
    if (!id.installation_address.country.trim()) e["identity.installation_address.country"] = t("validation.required");

    if (!id.nace_code.trim()) e["identity.nace_code"] = t("validation.required");
    else if (!isValidNace(id.nace_code)) e["identity.nace_code"] = t("validation.nace");

    const hasUnlocode = Boolean(id.unlocode.trim());

    const latVal = ((id as any)?.coordinates?.lat ?? (id as any)?.lat ?? "").toString().trim();
    const lngVal = ((id as any)?.coordinates?.lng ?? (id as any)?.lng ?? "").toString().trim();

    const hasLat = Boolean(latVal);
    const hasLng = Boolean(lngVal);

    // Location is legally required: provide UNLOCODE OR coordinates.
    // If UNLOCODE is missing, require both lat and lng and validate format.
    if (!hasUnlocode) {
      if (!hasLat) e["identity.coordinates.lat"] = t("validation.required");
      else if (!isValidLatLng(latVal)) e["identity.coordinates.lat"] = t("validation.latlng");

      if (!hasLng) e["identity.coordinates.lng"] = t("validation.required");
      else if (!isValidLatLng(lngVal)) e["identity.coordinates.lng"] = t("validation.latlng");
    }

    if (!goods.cn_code.trim()) e["goods.cn_code"] = t("validation.required");
    else if (!isValidCnCode(goods.cn_code)) e["goods.cn_code"] = t("validation.cncode");

    if (!goods.trade_name.trim()) e["goods.trade_name"] = t("validation.required");
    if (!goods.production_route.trim()) e["goods.production_route"] = t("validation.required");

    if (!goods.quantity_tonnes.trim()) e["goods.quantity_tonnes"] = t("validation.required");
    else if (!isValidNumberString(goods.quantity_tonnes)) e["goods.quantity_tonnes"] = t("validation.number");

    if (!s1.total_tco2e.trim()) e["scope1.total_tco2e"] = t("validation.required");
    else if (!isValidNumberString(s1.total_tco2e)) e["scope1.total_tco2e"] = t("validation.number");

    if (!s2.electricity_mwh.trim()) e["scope2.electricity_mwh"] = t("validation.required");
    else if (!isValidNumberString(s2.electricity_mwh)) e["scope2.electricity_mwh"] = t("validation.number");

    if (s2.source_type === "actual") {
      if (!s2.emission_factor_tco2e_per_mwh.trim()) e["scope2.emission_factor_tco2e_per_mwh"] = t("validation.required");
      else if (!isValidNumberString(s2.emission_factor_tco2e_per_mwh)) e["scope2.emission_factor_tco2e_per_mwh"] = t("validation.number");

      const hasEvidence = evidenceFiles.some((x) => x.purpose === "scope2_actual_evidence") || Boolean(s2.evidence_file);
      if (!hasEvidence) e["scope2.evidence"] = t("validation.file_required");
    }

    if (prec.used) {
      if (!prec.items || prec.items.length === 0) e["precursors.items"] = t("validation.required");
      else {
        prec.items.forEach((row, idx) => {
          const base = `precursors.items.${idx}`;

          if (!row.cn_code.trim()) e[`${base}.cn_code`] = t("validation.required");
          else if (!isValidCnCode(row.cn_code)) e[`${base}.cn_code`] = t("validation.cncode");

          if (!row.quantity_tonnes.trim()) e[`${base}.quantity_tonnes`] = t("validation.required");
          else if (!isValidNumberString(row.quantity_tonnes)) e[`${base}.quantity_tonnes`] = t("validation.number");

          if (!row.embedded_emissions_tco2e_per_tonne.trim()) e[`${base}.embedded_emissions_tco2e_per_tonne`] = t("validation.required");
          else if (!isValidNumberString(row.embedded_emissions_tco2e_per_tonne)) e[`${base}.embedded_emissions_tco2e_per_tonne`] = t("validation.number");
        });
      }
    }

    const carbonHasAny =
      Boolean(cp.scheme_name.trim()) ||
      Boolean(cp.amount_paid.trim()) ||
      Boolean(cp.currency.trim()) ||
      Boolean(cp.quantity_covered_tco2e.trim()) ||
      Boolean(cp.rebate_amount.trim()) ||
      Boolean(cp.rebate_or_free_allocation);

    if (carbonHasAny) {
      if (!cp.scheme_name.trim()) e["carbon_price.scheme_name"] = t("validation.required");

      if (!cp.amount_paid.trim()) e["carbon_price.amount_paid"] = t("validation.required");
      else if (!isValidNumberString(cp.amount_paid)) e["carbon_price.amount_paid"] = t("validation.number");

      if (!cp.currency.trim()) e["carbon_price.currency"] = t("validation.required");

      if (!cp.quantity_covered_tco2e.trim()) e["carbon_price.quantity_covered_tco2e"] = t("validation.required");
      else if (!isValidNumberString(cp.quantity_covered_tco2e)) e["carbon_price.quantity_covered_tco2e"] = t("validation.number");

      if (cp.rebate_or_free_allocation) {
        if (!cp.rebate_amount.trim()) e["carbon_price.rebate_amount"] = t("validation.required");
        else if (!isValidNumberString(cp.rebate_amount)) e["carbon_price.rebate_amount"] = t("validation.number");
      }
    }

    return e;
  }, [input, t, evidenceFiles]);

  const canSubmit = Object.keys(errors).length === 0 && submitStatus !== "submitting";

  function markTouched(key: string) {
    setTouched((cur) => ({ ...cur, [key]: true }));
  }

  async function uploadScope2EvidenceIfNeeded(): Promise<void> {
    if (!requestId) return;
    if (input.scope2.source_type !== "actual") return;

    const existing = evidenceFiles.find((x) => x.purpose === "scope2_actual_evidence");
    if (existing) return;

    const f = input.scope2.evidence_file;
    if (!f) return;

    const bucket = (process.env.NEXT_PUBLIC_SUPABASE_EVIDENCE_BUCKET as string | undefined) || "supplier-evidence";
    const safeName = (f.name || "evidence").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${requestId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from(bucket).upload(path, f, {
      cacheControl: "3600",
      upsert: false,
      contentType: f.type || "application/octet-stream",
    });

    if (error) throw error;

    const ref: EvidenceFileRef = {
      purpose: "scope2_actual_evidence",
      bucket,
      path,
      name: f.name || safeName,
      mime: f.type || "application/octet-stream",
      size: f.size || 0,
    };

    setEvidenceFiles((cur) => [...cur.filter((x) => x.purpose !== "scope2_actual_evidence"), ref]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      if (Object.keys(errors).length > 0) {
        setTouched((cur) => ({ ...cur, all: true }));
        setSubmitStatus("idle");
        return;
      }

      await uploadScope2EvidenceIfNeeded();

      const id = input.identity;
      const goods = input.goods;
      const s1 = input.scope1;
      const s2 = input.scope2;
      const prec = input.precursors;
      const cp = input.carbon_price;

      const identity: any = {
        operator_legal_name: id.operator_legal_name.trim(),
        installation_name: id.installation_name.trim(),
        installation_address: {
          street: id.installation_address.street.trim(),
          city: id.installation_address.city.trim(),
          postal: id.installation_address.postal.trim(),
          country: id.installation_address.country.trim(),
        },
        nace_code: id.nace_code.trim(),
      };

      const unlocode = id.unlocode.trim();
      const lat = ((id as any)?.coordinates?.lat ?? (id as any)?.lat ?? "").toString().trim();
      const lng = ((id as any)?.coordinates?.lng ?? (id as any)?.lng ?? "").toString().trim();

      if (unlocode) identity.unlocode = unlocode;
      else identity.coordinates = { lat, lng };

      const payload = {
        identity,
        goods: {
          cn_code: goods.cn_code.trim(),
          trade_name: goods.trade_name.trim(),
          production_route: goods.production_route.trim(),
          quantity_tonnes: goods.quantity_tonnes.trim(),
        },
        scope1: {
          total_tco2e: s1.total_tco2e.trim(),
          source_streams: s1.source_streams || [],
        },
        scope2: {
          electricity_mwh: s2.electricity_mwh.trim(),
          source_type: s2.source_type,
          ...(s2.source_type === "actual" ? { emission_factor_tco2e_per_mwh: s2.emission_factor_tco2e_per_mwh.trim() } : {}),
        },
        precursors: {
          used: prec.used,
          items: prec.used
            ? (prec.items || []).map((r) => ({
                cn_code: r.cn_code.trim(),
                quantity_tonnes: r.quantity_tonnes.trim(),
                embedded_emissions_tco2e_per_tonne: r.embedded_emissions_tco2e_per_tonne.trim(),
              }))
            : [],
        },
        carbon_price:
          (Boolean(cp.scheme_name.trim()) ||
            Boolean(cp.amount_paid.trim()) ||
            Boolean(cp.currency.trim()) ||
            Boolean(cp.quantity_covered_tco2e.trim()) ||
            Boolean(cp.rebate_amount.trim()) ||
            Boolean(cp.rebate_or_free_allocation))
            ? {
                scheme_name: cp.scheme_name.trim(),
                amount_paid: cp.amount_paid.trim(),
                currency: cp.currency.trim(),
                quantity_covered_tco2e: cp.quantity_covered_tco2e.trim(),
                rebate_or_free_allocation: cp.rebate_or_free_allocation,
                ...(cp.rebate_or_free_allocation ? { rebate_amount: cp.rebate_amount.trim() } : {}),
              }
            : {},

        derived: {},
        evidence_files: evidenceFiles,
        notes: input.notes,
        client_submitted_at: new Date().toISOString(),
      };

      const { data: sData, error: sErr } = await supabase.rpc("submit_supplier_portal_submission" as any, { p_token: token, p_payload: payload } as any);
      if (sErr) throw sErr;

      const s = asSingleRow<any>(sData);
      const ok = typeof s === "string" || (s as any)?.ok === true || s === true;
      if (!ok) throw new Error((s as any)?.error ?? "Submission failed");

      setSubmitStatus("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const reason = classifyInvalidReason(err?.message ?? "");
      if (reason === "used" || reason === "expired" || reason === "invalid") {
        setInvalidReason(reason);
        setSubmitStatus("error");
        setSubmitError(null);
        return;
      }

      setSubmitStatus("error");
      setSubmitError(t("form.submission.error.body"));
    }
  }

  if (loading) return <section className="gsx-alert" aria-label={t("form.loading")}>{t("form.loading")}</section>;

  if (invalidReason) {
    const key =
      invalidReason === "used"
        ? "form.invalid.used"
        : invalidReason === "expired"
        ? "form.invalid.expired"
        : invalidReason === "invalid"
        ? "form.invalid.invalid"
        : "form.invalid.generic";

    return (
      <section className="gsx-alert gsx-alertError" aria-label={t("form.invalid.title")}>
        <h2 className="gsx-alertTitle">{t("form.invalid.title")}</h2>
        <p className="gsx-alertText">{t(key)}</p>
        <p className="gsx-alertText gsx-muted" style={{ marginTop: 10 }}>
          {t("form.invalid.hint")}
        </p>
      </section>
    );
  }

  const companyDisplay = companyName || supplierName || "";

  const showErr = (k: string) => errors[k] ?? null;

  return (
    <form onSubmit={onSubmit} className="gsx-form">
      <section className="gsx-card" aria-label={t("form.section.company")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.company")}</h2>

          <div className="gsx-metaRow" aria-label="Request metadata">
            <span className="gsx-chip">
              <span className="gsx-chipLabel">{t("form.meta.time_remaining")}</span>
              <span className="gsx-chipValue gsx-countdownMain">
                {expiry.mode === "none"
                  ? "-"
                  : expiry.mode === "invalid"
                  ? expiry.raw ?? "-"
                  : expiry.mode === "expired"
                  ? t("form.expiry.expired")
                  : (
                      <span>
                        {expiry.days > 0 ? <span>{expiry.days}{t("common.day_short")} </span> : null}
                        {expiry.days > 0 || expiry.hours > 0 ? <span>{expiry.hours}{t("common.hour_short")} </span> : null}
                        {expiry.days > 0 || expiry.hours > 0 || expiry.minutes > 0 ? <span>{expiry.minutes}{t("common.minute_short")} </span> : null}
                        {expiry.seconds !== null ? (
                          <span>
                            <span className="gsx-countdownSeconds">{String(expiry.seconds).padStart(2, "0")}</span>
                            {t("common.second_short")}
                          </span>
                        ) : null}
                      </span>
                    )}
              </span>
              {expiry.sub ? <span className="gsx-chipSub">{expiry.sub}</span> : null}
            </span>

            <span className="gsx-chip">
              <span className="gsx-chipLabel">{t("form.meta.product_code")}</span>
              <span className="gsx-chipValue">{cnCode ?? "-"}</span>
            </span>
          </div>
        </div>

        <div className="gsx-cardBody">
          <label className="gsx-field">
            <FieldLabelWithInfo t={t} labelKey="form.company_name.label" required={false} meaningKey="form.company_name.help.meaning" exampleKey="form.company_name.help.example" />
            <input className="gsx-input" value={companyDisplay} readOnly aria-readonly="true" />
          </label>
        </div>
      </section>

      <section className="gsx-card" aria-label={t("form.section.factory")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.factory")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.operator_legal_name.label" required={true} meaningKey="form.identity.operator_legal_name.help.meaning" exampleKey="form.identity.operator_legal_name.help.example" />
              <input className="gsx-input" value={input.identity.operator_legal_name} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, operator_legal_name: e.target.value } }))} />
              <FieldError msg={showErr("identity.operator_legal_name")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.installation_name.label" required={true} meaningKey="form.identity.installation_name.help.meaning" exampleKey="form.identity.installation_name.help.example" />
              <input className="gsx-input" value={input.identity.installation_name} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, installation_name: e.target.value } }))} />
              <FieldError msg={showErr("identity.installation_name")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.address.street.label" required={true} meaningKey="form.identity.address.street.help.meaning" exampleKey="form.identity.address.street.help.example" />
              <input className="gsx-input" value={input.identity.installation_address.street} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, installation_address: { ...cur.identity.installation_address, street: e.target.value } } }))} />
              <FieldError msg={showErr("identity.installation_address.street")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.address.city.label" required={true} meaningKey="form.identity.address.city.help.meaning" exampleKey="form.identity.address.city.help.example" />
              <input className="gsx-input" value={input.identity.installation_address.city} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, installation_address: { ...cur.identity.installation_address, city: e.target.value } } }))} />
              <FieldError msg={showErr("identity.installation_address.city")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.address.postal.label" required={false} meaningKey="form.identity.address.postal.help.meaning" exampleKey="form.identity.address.postal.help.example" />
              <input className="gsx-input" value={input.identity.installation_address.postal} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, installation_address: { ...cur.identity.installation_address, postal: e.target.value } } }))} />
              <FieldError msg={showErr("identity.installation_address.postal")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.address.country.label" required={true} meaningKey="form.identity.address.country.help.meaning" exampleKey="form.identity.address.country.help.example" />
              <input className="gsx-input" value={input.identity.installation_address.country} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, installation_address: { ...cur.identity.installation_address, country: e.target.value } } }))} />
              <FieldError msg={showErr("identity.installation_address.country")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.unlocode.label" required={false} meaningKey="form.identity.unlocode.help.meaning" exampleKey="form.identity.unlocode.help.example" />
              <input className="gsx-input" value={input.identity.unlocode} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, unlocode: e.target.value } }))} />
              <FieldError msg={showErr("identity.unlocode")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.identity.nace_code.label" required={true} meaningKey="form.identity.nace_code.help.meaning" exampleKey="form.identity.nace_code.help.example" />
              <input className="gsx-input" value={input.identity.nace_code} onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, nace_code: e.target.value } }))} />
              <FieldError msg={showErr("identity.nace_code")} />
            </label>
          </div>

          {!input.identity.unlocode.trim() && (
            <div className="gsx-row">
              <label className="gsx-field">
                <FieldLabelWithInfo t={t} labelKey="form.identity.coordinates.lat.label" required={true} meaningKey="form.identity.coordinates.lat.help.meaning" exampleKey="form.identity.coordinates.lat.help.example" />
                <input className="gsx-input" inputMode="decimal" placeholder="0.000000" value={input.identity.coordinates.lat} onKeyDown={decimalKeyDown}
                  onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, coordinates: { ...cur.identity.coordinates, lat: sanitizeDecimalInput(e.target.value, cur.identity.coordinates.lat) } } }))} />
                <FieldError msg={showErr("identity.coordinates.lat")} />
              </label>

              <label className="gsx-field">
                <FieldLabelWithInfo t={t} labelKey="form.identity.coordinates.lng.label" required={true} meaningKey="form.identity.coordinates.lng.help.meaning" exampleKey="form.identity.coordinates.lng.help.example" />
                <input className="gsx-input" inputMode="decimal" placeholder="0.000000" value={input.identity.coordinates.lng} onKeyDown={decimalKeyDown}
                  onChange={(e) => setInput((cur) => ({ ...cur, identity: { ...cur.identity, coordinates: { ...cur.identity.coordinates, lng: sanitizeDecimalInput(e.target.value, cur.identity.coordinates.lng) } } }))} />
                <FieldError msg={showErr("identity.coordinates.lng")} />
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="gsx-card" aria-label={t("form.section.goods")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.goods")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.goods.cn_code.label" required={true} meaningKey="form.goods.cn_code.help.meaning" exampleKey="form.goods.cn_code.help.example" />
              <input className="gsx-input" value={input.goods.cn_code} readOnly={Boolean(cnCode)} aria-readonly={Boolean(cnCode)} onChange={(e) => setInput((cur) => ({ ...cur, goods: { ...cur.goods, cn_code: e.target.value } }))} />
              <FieldError msg={showErr("goods.cn_code")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.goods.trade_name.label" required={true} meaningKey="form.goods.trade_name.help.meaning" exampleKey="form.goods.trade_name.help.example" />
              <input className="gsx-input" value={input.goods.trade_name} onChange={(e) => setInput((cur) => ({ ...cur, goods: { ...cur.goods, trade_name: e.target.value } }))} />
              <FieldError msg={showErr("goods.trade_name")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.goods.production_route.label" required={true} meaningKey="form.goods.production_route.help.meaning" exampleKey="form.goods.production_route.help.example" />
              <select className="gsx-input" value={input.goods.production_route} onChange={(e) => setInput((cur) => ({ ...cur, goods: { ...cur.goods, production_route: e.target.value } }))}>
                <option value="">{t("common.select")}</option>
                <option value="electric_arc_furnace">{t("form.goods.production_route.options.eaf")}</option>
                <option value="blast_furnace">{t("form.goods.production_route.options.bf")}</option>
                <option value="other">{t("form.goods.production_route.options.other")}</option>
              </select>
              <FieldError msg={showErr("goods.production_route")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.goods.quantity_tonnes.label" required={true} meaningKey="form.goods.quantity_tonnes.help.meaning" exampleKey="form.goods.quantity_tonnes.help.example" />
              <input className="gsx-input" inputMode="decimal" placeholder="0.000" value={input.goods.quantity_tonnes} onKeyDown={decimalKeyDown}
                onChange={(e) => setInput((cur) => ({ ...cur, goods: { ...cur.goods, quantity_tonnes: sanitizeDecimalInput(e.target.value, cur.goods.quantity_tonnes) } }))} onBlur={() => setInput((cur) => ({ ...cur, goods: { ...cur.goods, quantity_tonnes: finalizeDecimalInput(cur.goods.quantity_tonnes) } }))} />
              <FieldError msg={showErr("goods.quantity_tonnes")} />
            </label>
          </div>
        </div>
      </section>

      <section className="gsx-card" aria-label={t("form.section.scope1")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.scope1")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.scope1.total_tco2e.label" required={true} meaningKey="form.scope1.total_tco2e.help.meaning" exampleKey="form.scope1.total_tco2e.help.example" />
              <input className="gsx-input" inputMode="decimal" placeholder="0.000" value={input.scope1.total_tco2e} onKeyDown={decimalKeyDown}
                onChange={(e) => setInput((cur) => ({ ...cur, scope1: { ...cur.scope1, total_tco2e: sanitizeDecimalInput(e.target.value, cur.scope1.total_tco2e) } }))} onBlur={() => setInput((cur) => ({ ...cur, scope1: { ...cur.scope1, total_tco2e: finalizeDecimalInput(cur.scope1.total_tco2e) } }))} />
              <FieldError msg={showErr("scope1.total_tco2e")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.scope1.source_streams.label" required={false} meaningKey="form.scope1.source_streams.help.meaning" exampleKey="form.scope1.source_streams.help.example" />
              <select className="gsx-input" multiple value={input.scope1.source_streams} onChange={(e) => setInput((cur) => ({ ...cur, scope1: { ...cur.scope1, source_streams: Array.from(e.target.selectedOptions).map((o) => o.value) } }))}>
                <option value="natural_gas">{t("form.scope1.source_streams.options.natural_gas")}</option>
                <option value="diesel">{t("form.scope1.source_streams.options.diesel")}</option>
                <option value="coal">{t("form.scope1.source_streams.options.coal")}</option>
                <option value="coke">{t("form.scope1.source_streams.options.coke")}</option>
                <option value="other">{t("form.scope1.source_streams.options.other")}</option>
              </select>
            </label>
          </div>

          <label className="gsx-field">
            <FieldLabelWithInfo t={t} labelKey="form.notes.label" required={false} meaningKey="form.notes.help.meaning" exampleKey="form.notes.help.example" />
            <textarea className="gsx-input gsx-textarea" placeholder={t("form.notes.placeholder")} value={input.notes} onChange={(e) => setInput((cur) => ({ ...cur, notes: e.target.value }))} rows={4} />
          </label>
        </div>
      </section>

      <section className="gsx-card" aria-label={t("form.section.scope2")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.scope2")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.scope2.electricity_mwh.label" required={true} meaningKey="form.scope2.electricity_mwh.help.meaning" exampleKey="form.scope2.electricity_mwh.help.example" />
              <input className="gsx-input" inputMode="decimal" placeholder="0.000" value={input.scope2.electricity_mwh} onKeyDown={decimalKeyDown}
                onChange={(e) => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, electricity_mwh: sanitizeDecimalInput(e.target.value, cur.scope2.electricity_mwh) } }))} onBlur={() => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, electricity_mwh: finalizeDecimalInput(cur.scope2.electricity_mwh) } }))} />
              <FieldError msg={showErr("scope2.electricity_mwh")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo t={t} labelKey="form.scope2.source_type.label" required={true} meaningKey="form.scope2.source_type.help.meaning" exampleKey="form.scope2.source_type.help.example" />
              <select className="gsx-input" value={input.scope2.source_type} onChange={(e) => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, source_type: e.target.value === "actual" ? "actual" : "grid_average" } }))}>
                <option value="grid_average">{t("form.scope2.source_type.grid_average")}</option>
                <option value="actual">{t("form.scope2.source_type.actual")}</option>
              </select>
            </label>
          </div>

          {input.scope2.source_type === "actual" && (
            <div className="gsx-row">
              <label className="gsx-field">
                <FieldLabelWithInfo t={t} labelKey="form.scope2.emission_factor.label" required={true} meaningKey="form.scope2.emission_factor.help.meaning" exampleKey="form.scope2.emission_factor.help.example" />
                <input className="gsx-input" inputMode="decimal" placeholder="0.000" value={input.scope2.emission_factor_tco2e_per_mwh} onKeyDown={decimalKeyDown}
                  onChange={(e) => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, emission_factor_tco2e_per_mwh: sanitizeDecimalInput(e.target.value, cur.scope2.emission_factor_tco2e_per_mwh) } }))} onBlur={() => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, emission_factor_tco2e_per_mwh: finalizeDecimalInput(cur.scope2.emission_factor_tco2e_per_mwh) } }))} />
                <FieldError msg={showErr("scope2.emission_factor_tco2e_per_mwh")} />
              </label>

              <label className="gsx-field">
                <FieldLabelWithInfo t={t} labelKey="form.scope2.evidence.label" required={true} meaningKey="form.scope2.evidence.help.meaning" exampleKey="form.scope2.evidence.help.example" />
                <input className="gsx-input" type="file" onChange={(e) => setInput((cur) => ({ ...cur, scope2: { ...cur.scope2, evidence_file: e.target.files && e.target.files[0] ? e.target.files[0] : null } }))} />
                <FieldError msg={showErr("scope2.evidence")} />
              </label>
            </div>
          )}
        </div>
      </section>

            <section className="gsx-card" aria-label={t("form.section.precursors")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.precursors")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.precursors.used.label"
                required={true}
                meaningKey="form.precursors.used.help.meaning"
                exampleKey="form.precursors.used.help.example"
              />
              <select
                className="gsx-input"
                value={input.precursors.used ? "yes" : "no"}
                onChange={(e) => setInput((cur) => ({ ...cur, precursors: { ...cur.precursors, used: e.target.value === "yes" } }))}
              >
                <option value="no">{t("common.no")}</option>
                <option value="yes">{t("common.yes")}</option>
              </select>
            </label>
            <div className="gsx-inlineNote" role="note">
              {t("form.precursors.inline_note")}
            </div>
          </div>

          {input.precursors.used && (
            <>
              {input.precursors.items.map((row, idx) => (
                <div key={`prec_${idx}`}>
                  <div className="gsx-row">
                    <label className="gsx-field">
                      <FieldLabelWithInfo
                        t={t}
                        labelKey="form.precursors.cn_code.label"
                        required={true}
                        meaningKey="form.precursors.cn_code.help.meaning"
                        exampleKey="form.precursors.cn_code.help.example"
                      />
                      <input
                        className="gsx-input"
                        inputMode="numeric"
                        value={row.cn_code}
                        onChange={(e) =>
                          setInput((cur) => {
                            const items = [...cur.precursors.items];
                            items[idx] = { ...items[idx], cn_code: e.target.value };
                            return { ...cur, precursors: { ...cur.precursors, items } };
                          })
                        }
                      />
                      <FieldError msg={showErr(`precursors.items.${idx}.cn_code`)} />
                    </label>

                    <label className="gsx-field">
                      <FieldLabelWithInfo
                        t={t}
                        labelKey="form.precursors.quantity_tonnes.label"
                        required={true}
                        meaningKey="form.precursors.quantity_tonnes.help.meaning"
                        exampleKey="form.precursors.quantity_tonnes.help.example"
                      />
                      <input
                        className="gsx-input"
                        inputMode="decimal"
                        placeholder="0.000"
                        value={row.quantity_tonnes}
                        onKeyDown={decimalKeyDown}
                        onChange={(e) =>
                          setInput((cur) => {
                            const items = [...cur.precursors.items];
                            items[idx] = {
                              ...items[idx],
                              quantity_tonnes: sanitizeDecimalInput(e.target.value, items[idx].quantity_tonnes),
                            };
                            return { ...cur, precursors: { ...cur.precursors, items } };
                          })
                        }
                        onBlur={() =>
                          setInput((cur) => {
                            const items = [...cur.precursors.items];
                            items[idx] = { ...items[idx], quantity_tonnes: finalizeDecimalInput(items[idx].quantity_tonnes) };
                            return { ...cur, precursors: { ...cur.precursors, items } };
                          })
                        }
                      />
                      <FieldError msg={showErr(`precursors.items.${idx}.quantity_tonnes`)} />
                    </label>
                  </div>

                  <div className="gsx-row">
                    <label className="gsx-field">
                      <FieldLabelWithInfo
                        t={t}
                        labelKey="form.precursors.embedded_emissions_tco2e_per_tonne.label"
                        required={true}
                        meaningKey="form.precursors.embedded_emissions_tco2e_per_tonne.help.meaning"
                        exampleKey="form.precursors.embedded_emissions_tco2e_per_tonne.help.example"
                      />
                      <input
                        className="gsx-input"
                        inputMode="decimal"
                        placeholder="0.000"
                        value={row.embedded_emissions_tco2e_per_tonne}
                        onKeyDown={decimalKeyDown}
                        onChange={(e) =>
                          setInput((cur) => {
                            const items = [...cur.precursors.items];
                            items[idx] = {
                              ...items[idx],
                              embedded_emissions_tco2e_per_tonne: sanitizeDecimalInput(
                                e.target.value,
                                items[idx].embedded_emissions_tco2e_per_tonne
                              ),
                            };
                            return { ...cur, precursors: { ...cur.precursors, items } };
                          })
                        }
                        onBlur={() =>
                          setInput((cur) => {
                            const items = [...cur.precursors.items];
                            items[idx] = {
                              ...items[idx],
                              embedded_emissions_tco2e_per_tonne: finalizeDecimalInput(items[idx].embedded_emissions_tco2e_per_tonne),
                            };
                            return { ...cur, precursors: { ...cur.precursors, items } };
                          })
                        }
                      />
                      <FieldError msg={showErr(`precursors.items.${idx}.embedded_emissions_tco2e_per_tonne`)} />
                    </label>

                    <div className="gsx-footer" aria-label="Input material controls">
                      <button
                        type="button"
                        className="gsx-btn"
                        onClick={() =>
                          setInput((cur) => ({
                            ...cur,
                            precursors: {
                              ...cur.precursors,
                              items: [...cur.precursors.items, { cn_code: "", quantity_tonnes: "", embedded_emissions_tco2e_per_tonne: "" }],
                            },
                          }))
                        }
                      >
                        {t("form.precursors.add_row")}
                      </button>

                      {input.precursors.items.length > 1 && (
                        <button
                          type="button"
                          className="gsx-btn"
                          onClick={() =>
                            setInput((cur) => {
                              const items = [...cur.precursors.items];
                              items.splice(idx, 1);
                              return { ...cur, precursors: { ...cur.precursors, items } };
                            })
                          }
                        >
                          {t("form.precursors.remove_row")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <section className="gsx-card" aria-label={t("form.section.carbon_price")}>
        <div className="gsx-cardHeader">
          <h2 className="gsx-cardTitle">{t("form.section.carbon_price")}</h2>
          <div className="gsx-metaRow" />
        </div>

        <div className="gsx-cardBody">
          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.carbon_price.scheme_name.label"
                required={false}
                meaningKey="form.carbon_price.scheme_name.help.meaning"
                exampleKey="form.carbon_price.scheme_name.help.example"
              />
              <input
                className="gsx-input"
                value={input.carbon_price.scheme_name}
                onChange={(e) => setInput((cur) => ({ ...cur, carbon_price: { ...cur.carbon_price, scheme_name: e.target.value } }))}
              />
              <FieldError msg={showErr("carbon_price.scheme_name")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.carbon_price.amount_paid.label"
                required={Boolean(input.carbon_price.scheme_name.trim())}
                meaningKey="form.carbon_price.amount_paid.help.meaning"
                exampleKey="form.carbon_price.amount_paid.help.example"
              />
              <input
                className="gsx-input"
                inputMode="decimal"
                placeholder="0.00"
                value={input.carbon_price.amount_paid}
                onKeyDown={decimalKeyDown}
                onChange={(e) =>
                  setInput((cur) => ({ ...cur, carbon_price: { ...cur.carbon_price, amount_paid: sanitizeDecimalInput(e.target.value, cur.carbon_price.amount_paid) } }))
                }
                onBlur={() => setInput((cur) => ({ ...cur, carbon_price: { ...cur.carbon_price, amount_paid: finalizeDecimalInput(cur.carbon_price.amount_paid) } }))}
              />
              <FieldError msg={showErr("carbon_price.amount_paid")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.carbon_price.currency.label"
                required={Boolean(input.carbon_price.scheme_name.trim())}
                meaningKey="form.carbon_price.currency.help.meaning"
                exampleKey="form.carbon_price.currency.help.example"
              />
              <input
                className="gsx-input"
                value={input.carbon_price.currency}
                onChange={(e) => setInput((cur) => ({ ...cur, carbon_price: { ...cur.carbon_price, currency: e.target.value } }))}
              />
              <FieldError msg={showErr("carbon_price.currency")} />
            </label>

            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.carbon_price.quantity_covered_tco2e.label"
                required={Boolean(input.carbon_price.scheme_name.trim())}
                meaningKey="form.carbon_price.quantity_covered_tco2e.help.meaning"
                exampleKey="form.carbon_price.quantity_covered_tco2e.help.example"
              />
              <input
                className="gsx-input"
                inputMode="decimal"
                placeholder="0.000"
                value={input.carbon_price.quantity_covered_tco2e}
                onKeyDown={decimalKeyDown}
                onChange={(e) =>
                  setInput((cur) => ({
                    ...cur,
                    carbon_price: { ...cur.carbon_price, quantity_covered_tco2e: sanitizeDecimalInput(e.target.value, cur.carbon_price.quantity_covered_tco2e) },
                  }))
                }
                onBlur={() =>
                  setInput((cur) => ({
                    ...cur,
                    carbon_price: { ...cur.carbon_price, quantity_covered_tco2e: finalizeDecimalInput(cur.carbon_price.quantity_covered_tco2e) },
                  }))
                }
              />
              <FieldError msg={showErr("carbon_price.quantity_covered_tco2e")} />
            </label>
          </div>

          <div className="gsx-row">
            <label className="gsx-field">
              <FieldLabelWithInfo
                t={t}
                labelKey="form.carbon_price.rebate_or_free_allocation.label"
                required={false}
                meaningKey="form.carbon_price.rebate_or_free_allocation.help.meaning"
                exampleKey="form.carbon_price.rebate_or_free_allocation.help.example"
              />
              <select
                className="gsx-input"
                value={input.carbon_price.rebate_or_free_allocation ? "yes" : "no"}
                onChange={(e) =>
                  setInput((cur) => ({
                    ...cur,
                    carbon_price: {
                      ...cur.carbon_price,
                      rebate_or_free_allocation: e.target.value === "yes",
                      ...(e.target.value === "yes" ? {} : { rebate_amount: "" }),
                    },
                  }))
                }
              >
                <option value="no">{t("common.no")}</option>
                <option value="yes">{t("common.yes")}</option>
              </select>
            </label>
            <div className="gsx-inlineNote" role="note">
              {t("form.carbon_price.inline_note")}
            </div>
          </div>

          {input.carbon_price.rebate_or_free_allocation && (
            <div className="gsx-row">
              <label className="gsx-field">
                <FieldLabelWithInfo
                  t={t}
                  labelKey="form.carbon_price.rebate_amount.label"
                  required={true}
                  meaningKey="form.carbon_price.rebate_amount.help.meaning"
                  exampleKey="form.carbon_price.rebate_amount.help.example"
                />
                <input
                  className="gsx-input"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={input.carbon_price.rebate_amount}
                  onKeyDown={decimalKeyDown}
                  onChange={(e) =>
                    setInput((cur) => ({
                      ...cur,
                      carbon_price: { ...cur.carbon_price, rebate_amount: sanitizeDecimalInput(e.target.value, cur.carbon_price.rebate_amount) },
                    }))
                  }
                  onBlur={() =>
                    setInput((cur) => ({ ...cur, carbon_price: { ...cur.carbon_price, rebate_amount: finalizeDecimalInput(cur.carbon_price.rebate_amount) } }))
                  }
                />
                <FieldError msg={showErr("carbon_price.rebate_amount")} />
              </label>
            </div>
          )}
        </div>
      </section>

<div className="gsx-footer" aria-label="Submission controls">
        <div className="gsx-hint">
          <span className="gsx-requiredStar">*</span> {t("form.footer.required")}
        </div>

        <button type="submit" className="gsx-btn gsx-btnPrimary" disabled={!canSubmit}>
          {submitStatus === "submitting" ? t("form.submitting") : t("form.submit")}
        </button>
      </div>

      {!onSuccess && submitStatus === "success" && (
        <section className="gsx-alert gsx-alertSuccess" aria-label={t("form.submission.success.title")}>
          <h3 className="gsx-alertTitle">{t("form.submission.success.title")}</h3>
          <p className="gsx-alertText">{t("form.submission.success.body")}</p>
        </section>
      )}

      {submitStatus === "error" && submitError && (
        <section className="gsx-alert gsx-alertError" aria-label={t("form.submission.error.title")}>
          <h3 className="gsx-alertTitle">{t("form.submission.error.title")}</h3>
          <p className="gsx-alertText">{submitError}</p>
        </section>
      )}
    </form>
  );
}
// frontend/src/pages/supplier/[token]/supplier-portal-form.tsx
// FILE: marketing/pages/supplier/supplier-portal-form.tsx