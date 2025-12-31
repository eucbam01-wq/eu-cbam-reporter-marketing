// FILE: marketing/pages/supplier/[token].tsx
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import SupplierPortalForm from "../../components/supplier/supplier-portal-form";
import { type SupplierMeta, useSupplierI18n } from "../../components/supplier/supplier-i18n";
import React, { useCallback, useMemo, useState } from "react";

type Props = {
  token: string;
  initialValid: boolean;
  initialError: string | null;
  initialMeta: SupplierMeta;
};

function getSupabase(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: { headers: { "x-supplier-token": token } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function SuccessPanel({ t }: { t: (key: string, params?: Record<string, any>) => string }) {
  return (
    <section className="gsx-alert gsx-alertSuccess" aria-label={t("success.aria")}>
      <h2 className="gsx-alertTitle">{t("success.title")}</h2>
      <p className="gsx-alertText">
        <span className="gsx-alertTextStrong">{t("success.thanks")}</span> {t("success.body")}
      </p>
      <p className="gsx-alertText gsx-muted" style={{ marginTop: 10 }}>
        {t("success.close")}
      </p>
    </section>
  );
}

export default function SupplierTokenPage({ token, initialValid, initialError, initialMeta }: Props) {
  const [view, setView] = useState<"form" | "success">("form");

  const [meta, setMeta] = useState<SupplierMeta>(initialMeta);

  const { t } = useSupplierI18n(meta.locale);

  const onSuccess = useMemo(() => {
    return () => setView("success");
  }, []);

  const onMetaLoaded = useCallback((next: SupplierMeta) => {
    setMeta((cur) => {
      const merged: SupplierMeta = {
        supplierName: next.supplierName ?? cur.supplierName,
        companyName: next.companyName ?? cur.companyName,
        locale: next.locale ?? cur.locale,
      };

      if (
        merged.supplierName === cur.supplierName &&
        merged.companyName === cur.companyName &&
        merged.locale === cur.locale
      ) {
        return cur;
      }

      return merged;
    });
  }, []);

  const titleText =
    meta.supplierName || meta.companyName
      ? t("page.title", { supplierName: meta.supplierName ?? meta.companyName ?? "" })
      : t("page.title_generic");

  const showInvalid = !initialValid;

  return (
    <main className="gsx-root" aria-label={t("page.aria_root")}>
      <Head>
        <title>Supplier portal</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <style>{`
.gsx-root{
  --brand:#306263;
  --support:#4073AF;
  --highlight:#FFD617;

  --bg:#F5F5F5;
  --bg2:#EBEBEB;

  --surface:#FFFFFF;

  --text:#404040;
  --textMuted:#707070;

  --success:#2E7D32;
  --error:#DA2131;

  --border:#CFCFCF;
  --borderStrong:#9F9F9F;

  color: var(--text);
  background:
    radial-gradient(900px 520px at 12% 0%, rgba(48,98,99,.16), transparent 60%),
    radial-gradient(900px 520px at 78% 6%, rgba(64,115,175,.12), transparent 62%),
    radial-gradient(900px 520px at 50% 0%, rgba(255,214,23,.10), transparent 65%),
    var(--bg);

  min-height: 100vh;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.gsx-container{ max-width: 920px; margin: 0 auto; padding: 34px 16px 60px; }

.gsx-muted{ color: var(--textMuted); }
.gsx-sep{ opacity: .60; }

.gsx-hero{
  border-radius: 26px;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255,255,255,.90), rgba(255,255,255,.82)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.62), rgba(255,214,23,.42), rgba(64,115,175,.26)) border-box;
  box-shadow:
    0 36px 110px rgba(2,6,23,.18),
    0 22px 70px rgba(48,98,99,.10);
  padding: 22px;
  backdrop-filter: blur(10px);
}

@supports not (backdrop-filter: blur(10px)){
  .gsx-hero{ backdrop-filter: none; }
}

.gsx-heroHead{ margin-bottom: 18px; }
.gsx-heroBody{ margin-top: 10px; }

.gsx-eyebrow{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }

.gsx-pill{
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(48,98,99,.28);
  background:
    radial-gradient(160px 44px at 30% 40%, rgba(255,214,23,.20), transparent 60%),
    rgba(255,255,255,.62);
  color: rgba(64,64,64,.96);
}

.gsx-title{
  margin: 0 0 8px;
  font-size: 30px;
  line-height: 1.10;
  letter-spacing: -0.015em;
  font-weight: 950;
  color: rgba(64,64,64,.98);
}

.gsx-sub{
  margin: 0;
  color: rgba(112,112,112,.98);
  line-height: 1.7;
  max-width: 90ch;
  font-size: 14px;
}

/* Alerts */
.gsx-alert{
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.92);
  box-shadow: 0 16px 44px rgba(2,6,23,.10);
  padding: 14px;
}

.gsx-alertSuccess{
  border-color: rgba(46,125,50,.38);
  background:
    radial-gradient(240px 80px at 12% 30%, rgba(46,125,50,.14), transparent 60%),
    rgba(255,255,255,.92);
}

.gsx-alertError{
  border-color: rgba(218,33,49,.35);
  background:
    radial-gradient(240px 80px at 12% 30%, rgba(218,33,49,.12), transparent 60%),
    rgba(255,255,255,.92);
}

.gsx-alertTitle{ margin: 0 0 6px; font-size: 16px; font-weight: 950; color: rgba(64,64,64,.98); }
.gsx-alertText{ margin: 0; color: rgba(112,112,112,.98); line-height: 1.6; }
.gsx-alertTextStrong{ color: rgba(64,64,64,.98); }

/* Form layout */
.gsx-form{ display:grid; gap: 14px; margin-top: 18px; }

.gsx-card{
  border-radius: 20px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.92);
  box-shadow: 0 16px 44px rgba(2,6,23,.10);
  overflow:visible;
}

.gsx-cardHeader{
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(207,207,207,.85);
  background:
    radial-gradient(240px 80px at 20% 40%, rgba(255,214,23,.14), transparent 62%),
    rgba(235,235,235,.55);
}

.gsx-cardTitle{
  margin: 0;
  font-size: 12px;
  letter-spacing: .10em;
  text-transform: uppercase;
  font-weight: 950;
  color: rgba(64,64,64,.92);
}

.gsx-cardBody{ border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; padding: 14px; display:grid; gap: 12px; }

.gsx-row{ display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 720px){ .gsx-row{ grid-template-columns: 1fr; } }

/* Chips */
.gsx-metaRow{ display:flex; gap: 8px; flex-wrap: wrap; justify-content:flex-end; }
@media (max-width: 720px){ .gsx-metaRow{ justify-content:flex-start; } }
@media (max-width: 720px){
  .gsx-cardHeader{ flex-direction: column; align-items: flex-start; }
  .gsx-metaRow{ width: 100%; }
  .gsx-chip{ width: 100%; }
  .gsx-chipValue{ font-size: 14px; }
  .gsx-countdownMain{ white-space: nowrap; }
}


.gsx-chip{
  display:flex;
  flex-direction: column;
  align-items:flex-start;
  gap: 4px;
  border: 1px solid rgba(207,207,207,.95);
  border-radius: 16px;
  padding: 10px 12px;
  background: rgba(255,255,255,.78);
  color: rgba(64,64,64,.92);
  font-weight: 900;
  line-height: 1.25;
}

.gsx-chipLabel{
  color: rgba(112,112,112,.98);
  font-weight: 950;
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.gsx-chipValue{
  font-size: 13px;
  font-weight: 950;
  color: rgba(64,64,64,.98);
  font-variant-numeric: tabular-nums;
}

.gsx-chipSub{
  font-size: 11px;
  font-weight: 800;
  color: rgba(112,112,112,.98);
  opacity: 0.78;
  font-variant-numeric: tabular-nums;
}

/* Fields */
.gsx-field{ display:grid; gap: 6px; }
.gsx-label{ font-size: 12px; font-weight: 900; color: rgba(64,64,64,.92); }

.gsx-labelRow{
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.gsx-requiredStar{
  color: var(--error);
  font-weight: 950;
  margin-left: 4px;
}

.gsx-input{
  border-radius: 12px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.98);
  padding: 10px 10px;
  color: rgba(64,64,64,.98);
  outline: none;
}

.gsx-input[readonly]{
  background: rgba(235,235,235,.35);
  color: rgba(64,64,64,.92);
}

.gsx-input:focus{
  border-color: rgba(48,98,99,.60);
  box-shadow: 0 0 0 3px rgba(48,98,99,.14);
}

.gsx-textarea{ resize: vertical; min-height: 96px; }

.gsx-fieldError{ color: var(--error); font-size: 12px; margin-top: 2px; }

/* Tooltip */
.gsx-infoWrap{ position:relative; display:inline-flex; align-items:center; justify-content:center; }

.gsx-infoBtn{
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-weight: 950;
  font-size: 12px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.92);
  color: rgba(64,64,64,.88);
  box-shadow: 0 10px 30px rgba(2,6,23,.06);
  cursor: pointer;
}

.gsx-infoBtn:focus{
  outline: none;
  border-color: rgba(48,98,99,.60);
  box-shadow: 0 0 0 3px rgba(48,98,99,.14), 0 10px 30px rgba(2,6,23,.06);
}

.gsx-tooltip{
  position:absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  min-width: 220px;
  max-width: min(360px, calc(100vw - 44px));
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.98);
  box-shadow: 0 18px 70px rgba(2,6,23,.16);
  color: rgba(64,64,64,.98);
  font-size: 12px;
  line-height: 1.45;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity .12s ease, transform .12s ease;
  white-space: normal;
}

.gsx-infoWrap:hover .gsx-tooltip,
.gsx-infoWrap:focus-within .gsx-tooltip,
.gsx-infoWrap[data-open="true"] .gsx-tooltip{
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.gsx-tooltipGrid{ display:grid; gap: 8px; }
.gsx-tooltipRow{ display:grid; gap: 2px; }
.gsx-tooltipKey{
  font-size: 11px;
  font-weight: 950;
  color: rgba(112,112,112,.98);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.gsx-tooltipVal{ color: rgba(64,64,64,.98); }

/* Footer actions */
.gsx-footer{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.gsx-hint{ font-size: 12px; color: rgba(112,112,112,.98); }

.gsx-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 950;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.96);
  color: rgba(64,64,64,.98);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease, border-color .12s ease;
  box-shadow: 0 1px 0 rgba(2,6,23,.03);
}

.gsx-btn:hover{ transform: translateY(-1px); border-color: rgba(159,159,159,.90); box-shadow: 0 28px 86px rgba(2,6,23,.12); }

.gsx-btnPrimary{
  border: 1px solid rgba(48,98,99,.26);
  background: linear-gradient(180deg, rgba(48,98,99,1), rgba(48,98,99,.92));
  color: #FFFFFF;
  box-shadow: 0 22px 64px rgba(48,98,99,.20), 0 10px 30px rgba(2,6,23,.10);
}

.gsx-btnPrimary:hover:enabled{ filter: brightness(0.98); border-color: rgba(48,98,99,.40); }

.gsx-btnPrimary:disabled{
  opacity: .58;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Inline status callouts */
.gsx-inlineNote{
  border-radius: 14px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(240px 80px at 20% 40%, rgba(48,98,99,.10), transparent 62%),
    rgba(255,255,255,.94);
  padding: 10px 12px;
  color: rgba(112,112,112,.98);
  font-size: 13px;
  line-height: 1.6;
}

/* Countdown */
.gsx-countdownMain{ font-variant-numeric: tabular-nums; letter-spacing: .01em; }
.gsx-countdownSeconds{ color: var(--error); font-weight: 950; font-variant-numeric: tabular-nums; }

/* Invalid fields */
.gsx-input[aria-invalid="true"]{
  border-color: rgba(218,33,49,.55);
  box-shadow: 0 0 0 3px rgba(218,33,49,.14);
}
`}</style>

      <div className="gsx-container">
        <section className="gsx-hero" aria-label={t("page.aria_hero")}>
          <header className="gsx-heroHead">
            <div className="gsx-eyebrow">
              <span className="gsx-pill">{t("page.eyebrow.portal")}</span>
              <span className="gsx-muted">{t("page.eyebrow.cbam")}</span>
              <span className="gsx-sep" aria-hidden="true">
                •
              </span>
              <span className="gsx-muted">{t("page.eyebrow.submission")}</span>
            </div>

            <h1 className="gsx-title">{titleText}</h1>

            <p className="gsx-sub">{t("page.subtitle")}</p>
          </header>

          <div className="gsx-heroBody">
            {showInvalid ? (
              <section className="gsx-alert gsx-alertError" aria-label={t("form.invalid.title")}>
                <h2 className="gsx-alertTitle">{t("form.invalid.title")}</h2>
                <p className="gsx-alertText">{initialError || t("form.invalid.generic")}</p>
                <p className="gsx-alertText gsx-muted" style={{ marginTop: 10 }}>
                  {t("form.invalid.hint")}
                </p>
              </section>
            ) : view === "success" ? (
              <SuccessPanel t={t} />
            ) : (
              <SupplierPortalForm
                token={token}
                onSuccess={onSuccess}
                localeOverride={meta.locale}
                onMetaLoaded={onMetaLoaded}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const tokenParam = ctx.params?.token;
  const token = typeof tokenParam === "string" ? tokenParam : "";

  if (!token) {
    return {
      props: {
        token: "",
        initialValid: false,
        initialError: "Invalid or expired link.",
        initialMeta: { supplierName: null, companyName: null, locale: null },
      },
    };
  }

  try {
    const supabase = getSupabase(token);

    const { data, error } = await supabase.rpc("validate_supplier_token" as any, { p_token: token } as any);

    if (error) {
      return {
        props: {
          token,
          initialValid: false,
          initialError: "Invalid or expired link.",
          initialMeta: { supplierName: null, companyName: null, locale: null },
        },
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const status = row?.status ?? null;

    if (status !== "valid") {
      return {
        props: {
          token,
          initialValid: false,
          initialError: row?.error || "Invalid or expired link.",
          initialMeta: { supplierName: null, companyName: null, locale: null },
        },
      };
    }

    // Optional: get context to derive locale/name if present. If it fails, still allow render.
    let meta: SupplierMeta = { supplierName: null, companyName: null, locale: null };

    const ctxRes = await supabase.rpc("get_supplier_portal_context" as any, { p_token: token } as any);
    if (!ctxRes.error) {
      const payload = Array.isArray(ctxRes.data) ? ctxRes.data[0] : ctxRes.data;
      const ok = payload?.ok === true;

      if (ok) {
        const req = payload?.request || {};
        const rep = payload?.report || {};

        const supplierName =
          (req?.supplier_name ?? req?.supplierName ?? req?.supplier ?? req?.name ?? null) ||
          (payload?.supplier?.name ?? null);

        const companyName =
          (req?.company_name ?? req?.companyName ?? req?.company ?? req?.legal_name ?? req?.legalName ?? null) ||
          (payload?.company?.name ?? null);

        const locale =
          (req?.locale ?? req?.language ?? req?.lang ?? req?.supplier_locale ?? req?.supplierLanguage ?? req?.preferred_language ?? req?.preferredLanguage ?? null) ||
          (payload?.supplier?.locale ?? payload?.supplier?.language ?? null) ||
          (rep?.locale ?? null);

        meta = {
          supplierName: typeof supplierName === "string" && supplierName.trim() ? supplierName.trim() : null,
          companyName: typeof companyName === "string" && companyName.trim() ? companyName.trim() : null,
          locale: typeof locale === "string" && locale.trim() ? locale.trim() : null,
        };
      }
    }

    return {
      props: {
        token,
        initialValid: true,
        initialError: null,
        initialMeta: meta,
      },
    };
  } catch {
    return {
      props: {
        token,
        initialValid: false,
        initialError: "Invalid or expired link.",
        initialMeta: { supplierName: null, companyName: null, locale: null },
      },
    };
  }
};

// FILE: marketing/pages/supplier/[token].tsx
