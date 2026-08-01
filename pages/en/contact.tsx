import Head from "next/head";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

/*
  FILE PATH
  pages/en/contact.tsx

  FORM DELIVERY
  1. Preferred: set NEXT_PUBLIC_CONTACT_FORM_ENDPOINT to an API route or
     Supabase Edge Function that accepts the JSON payload used below.
  2. Optional for a Supabase Edge Function:
     NEXT_PUBLIC_SUPABASE_ANON_KEY
  3. Optional destination override for the built-in email fallback:
     NEXT_PUBLIC_CONTACT_EMAIL

  Without an endpoint, the form opens a prefilled email draft addressed to
  sales@grandscope.ai, or the address supplied through NEXT_PUBLIC_CONTACT_EMAIL.
*/

const CANONICAL_URL = "https://www.grandscope.ai/en/contact";
const CONTACT_ENDPOINT =
  typeof process !== "undefined"
    ? String(process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT || "").trim()
    : "";
const CONTACT_EMAIL =
  typeof process !== "undefined"
    ? String(process.env.NEXT_PUBLIC_CONTACT_EMAIL || "sales@grandscope.ai").trim()
    : "sales@grandscope.ai";
const SUPABASE_ANON_KEY =
  typeof process !== "undefined"
    ? String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
    : "";

const enquiryOptions = [
  "Request a product demo",
  "Pricing and plan fit",
  "Business or Enterprise assessment",
  "Implementation and data migration",
  "Security and procurement review",
  "Account or technical support",
  "Partnership or other",
] as const;

const organisationOptions = [
  "EU importer",
  "Freight forwarder",
  "Indirect customs representative",
  "Adviser or consultant",
  "Software or integration partner",
  "Other",
] as const;

const entityOptions = ["1", "2 to 5", "6 to 20", "More than 20", "Not sure"] as const;
const supplierOptions = [
  "Fewer than 25",
  "25 to 150",
  "151 to 500",
  "More than 500",
  "Not sure",
] as const;

const stageOptions = [
  "Exploring CBAM scope",
  "Preparing the first controlled workflow",
  "Replacing spreadsheets or manual entry",
  "Scaling an existing reporting process",
  "Planning a multi-entity rollout",
] as const;

type FormValues = {
  enquiryType: string;
  name: string;
  workEmail: string;
  company: string;
  role: string;
  organisationType: string;
  country: string;
  phone: string;
  entityCount: string;
  supplierCount: string;
  reportingStage: string;
  message: string;
  consent: boolean;
  website: string;
};

type ErrorMap = Partial<Record<keyof FormValues, string>>;
type SubmitState = "idle" | "submitting" | "success" | "email" | "error";

const initialForm: FormValues = {
  enquiryType: "Request a product demo",
  name: "",
  workEmail: "",
  company: "",
  role: "",
  organisationType: "",
  country: "",
  phone: "",
  entityCount: "",
  supplierCount: "",
  reportingStage: "",
  message: "",
  consent: false,
  website: "",
};

const faqItems = [
  {
    question: "What should I include in a demo request?",
    answer:
      "Include your organisation type, legal entity count, approximate supplier volume, current reporting process, and the result you need from GrandScope. This gives the product conversation a precise starting point.",
  },
  {
    question: "Can GrandScope discuss multi-entity or representative workflows?",
    answer:
      "Yes. Use the Business or Enterprise assessment option and describe whether you operate across several legal entities, clients, customs representatives, or supplier networks.",
  },
  {
    question: "Can I use this form for procurement or security review?",
    answer:
      "Yes. Select Security and procurement review and list the documents, controls, integration details, or internal deadline involved. Do not send confidential supplier evidence through this public form.",
  },
  {
    question: "Where should existing users send a product issue?",
    answer:
      "Select Account or technical support, include the affected workflow and a concise description of the issue, and avoid including passwords, access tokens, or confidential evidence files.",
  },
] as const;

export default function ContactPage() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  const schema = useMemo(() => buildSchema(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const intent = String(params.get("intent") || params.get("subject") || "").toLowerCase();
    const plan = String(params.get("plan") || "").trim();

    if (!intent && !plan) return;

    let enquiryType = initialForm.enquiryType;
    if (/price|pricing|starter|professional/.test(intent) || /starter|professional/i.test(plan)) {
      enquiryType = "Pricing and plan fit";
    } else if (/enterprise|business|assessment/.test(intent) || /business|enterprise/i.test(plan)) {
      enquiryType = "Business or Enterprise assessment";
    } else if (/security|procurement/.test(intent)) {
      enquiryType = "Security and procurement review";
    } else if (/support|technical|account/.test(intent)) {
      enquiryType = "Account or technical support";
    }

    setForm((current) => ({
      ...current,
      enquiryType,
      message:
        plan && !current.message
          ? `I would like to discuss the ${plan} plan and confirm whether it fits our CBAM operating model.`
          : current.message,
    }));
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    const { name } = target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));

    if (submitState === "error") {
      setSubmitState("idle");
      setFeedback("");
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitState("idle");
    setFeedback("");
    formRef.current?.reset();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitState === "submitting") return;

    if (form.website.trim()) {
      setSubmitState("success");
      setFeedback("Your request has been received.");
      return;
    }

    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitState("idle");
      setFeedback("Check the highlighted fields and submit again.");
      focusFirstInvalidField(nextErrors);
      return;
    }

    const payload = buildPayload(form);
    setSubmitState("submitting");
    setFeedback("Sending your request...");

    try {
      if (CONTACT_ENDPOINT) {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (SUPABASE_ANON_KEY) {
          headers.apikey = SUPABASE_ANON_KEY;
          headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
        }

        const response = await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const responseText = await response.text().catch(() => "");
        let responseData: unknown = null;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch {
          responseData = responseText;
        }

        const responseRecord =
          responseData && typeof responseData === "object"
            ? (responseData as Record<string, unknown>)
            : null;
        const rejectedByBody =
          responseRecord?.ok === false ||
          responseRecord?.success === false ||
          Boolean(responseRecord?.error);

        if (!response.ok || rejectedByBody) {
          const detail = String(
            responseRecord?.error ||
              responseRecord?.message ||
              responseText ||
              `HTTP ${response.status}`,
          );
          throw new Error(detail);
        }

        setSubmitState("success");
        setFeedback("Your request has been received. GrandScope can now route it to the right conversation.");
        setForm(initialForm);
        formRef.current?.reset();
        return;
      }

      const mailtoUrl = buildMailtoUrl(payload);
      setSubmitState("email");
      setFeedback(
        `Your email app has been opened with the request prefilled for ${CONTACT_EMAIL}. Review it, then send the email.`,
      );
      window.location.href = mailtoUrl;
    } catch (error) {
      console.error("[GrandScopeContact] submission_failed", error);
      setSubmitState("error");
      setFeedback(
        CONTACT_ENDPOINT
          ? "The form could not send your request. Try again or use the email fallback configured for this page."
          : "The email draft could not be opened. Check that an email application is available on this device.",
      );
    }
  };

  const focusFirstInvalidField = (nextErrors: ErrorMap) => {
    if (typeof document === "undefined") return;
    const firstName = Object.keys(nextErrors)[0];
    const element = document.querySelector<HTMLElement>(`[name="${firstName}"]`);
    element?.focus();
  };

  const isComplete = submitState === "success" || submitState === "email";

  return (
    <>
      <Head>
        <title>Contact GrandScope | EU CBAM Software Demo and Pricing</title>
        <meta
          name="description"
          content="Contact GrandScope for an EU CBAM software demo, pricing assessment, multi-entity rollout, implementation, security review, or product support."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content="Contact GrandScope | EU CBAM Software" />
        <meta
          property="og:description"
          content="Discuss your supplier network, entity structure, emissions workflow, Annex 5.1 output, implementation, pricing, or procurement requirements."
        />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:image" content="https://www.grandscope.ai/og/cbam.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact GrandScope | EU CBAM Software" />
        <meta
          name="twitter:description"
          content="Request a product demo, plan assessment, implementation discussion, procurement review, or technical support conversation."
        />
        <meta name="twitter:image" content="https://www.grandscope.ai/og/cbam.png" />
      </Head>

      <main className="gsc-root" aria-label="Contact GrandScope">
        <style>{styles}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <section className="gsc-hero" aria-labelledby="contact-title">
          <div className="gsc-container">
            <div className="gsc-heroPanel">
              <div className="gsc-heroGrid">
                <div className="gsc-heroCopy">
                  <div className="gsc-eyebrow">
                    <span className="gsc-pill">Contact GrandScope</span>
                    <span>EU CBAM reporting software</span>
                  </div>

                  <h1 id="contact-title" className="gsc-h1">
                    Bring your CBAM workload. Leave with a clearer operating route.
                  </h1>

                  <p className="gsc-lead">
                    Tell us how your entities, suppliers, shipment data, emissions inputs,
                    and reporting responsibilities are organised. Use the form for a demo,
                    plan assessment, implementation discussion, procurement review, or
                    product support.
                  </p>

                  <div className="gsc-audience" aria-label="GrandScope audiences">
                    <span>{iconCheck()} Importers</span>
                    <span>{iconCheck()} Freight forwarders</span>
                    <span>{iconCheck()} Indirect representatives</span>
                  </div>

                  <div className="gsc-heroActions">
                    <a className="gsc-btn gsc-btnPrimary" href="#contact-form">
                      Start the conversation
                    </a>
                    <Link className="gsc-btn gsc-btnGhost" href="/en/pricing">
                      Review pricing first
                    </Link>
                  </div>
                </div>

                <aside className="gsc-briefCard" aria-label="Information for a useful GrandScope conversation">
                  <div className="gsc-briefHead">
                    <span className="gsc-iconBox">{iconClipboard()}</span>
                    <div>
                      <span className="gsc-kicker">Prepare the useful facts</span>
                      <h2>A precise brief beats a generic demo.</h2>
                    </div>
                  </div>

                  <div className="gsc-briefList">
                    <div>
                      <span>01</span>
                      <p>
                        <strong>Operating model</strong>
                        Importer, forwarder, indirect representative, adviser, or partner.
                      </p>
                    </div>
                    <div>
                      <span>02</span>
                      <p>
                        <strong>Scale</strong>
                        Legal entities, supplier count, covered goods, and reporting markets.
                      </p>
                    </div>
                    <div>
                      <span>03</span>
                      <p>
                        <strong>Current constraint</strong>
                        Supplier silence, spreadsheet control, data quality, XML output, or governance.
                      </p>
                    </div>
                  </div>

                  <div className="gsc-briefNote">
                    {iconShield()}
                    <span>
                      Do not place passwords, access tokens, or confidential supplier evidence in this public form.
                    </span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="gsc-section" aria-labelledby="form-title">
          <div className="gsc-container">
            <div className="gsc-contactGrid">
              <article className="gsc-formCard" id="contact-form">
                <header className="gsc-formHead">
                  <div>
                    <span className="gsc-kicker">Contact form</span>
                    <h2 id="form-title">Tell us what needs to work.</h2>
                    <p>
                      Required fields are marked. Operational detail helps route the request without unnecessary back and forth.
                    </p>
                  </div>
                  <span className="gsc-formStatus" data-state={submitState} aria-live="polite">
                    {submitState === "submitting" ? "Sending" : isComplete ? "Ready" : "Secure intake"}
                  </span>
                </header>

                {feedback ? (
                  <div
                    className={`gsc-feedback gsc-feedback-${
                      submitState === "error" ? "error" : isComplete ? "success" : "notice"
                    }`}
                    role={submitState === "error" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    <span>{submitState === "error" ? iconAlert() : isComplete ? iconCheckLarge() : iconInfo()}</span>
                    <p>{feedback}</p>
                  </div>
                ) : null}

                {isComplete ? (
                  <div className="gsc-successPanel">
                    <div className="gsc-successIcon">{iconCheckLarge()}</div>
                    <h3>{submitState === "email" ? "Finish in your email app" : "Request captured"}</h3>
                    <p>
                      {submitState === "email"
                        ? "The request remains under your control until you send the prepared email."
                        : "The information has been submitted through the configured contact endpoint."}
                    </p>
                    <div className="gsc-successActions">
                      <button type="button" className="gsc-btn gsc-btnPrimary" onClick={resetForm}>
                        Send another request
                      </button>
                      <Link className="gsc-btn gsc-btnGhost" href="/en/how-it-works">
                        Review the workflow
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} noValidate>
                    <div className="gsc-field gsc-fieldFull">
                      <label htmlFor="enquiryType">
                        What do you need? <b aria-hidden="true">*</b>
                      </label>
                      <select
                        id="enquiryType"
                        name="enquiryType"
                        value={form.enquiryType}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.enquiryType)}
                        aria-describedby={errors.enquiryType ? "enquiryType-error" : undefined}
                      >
                        {enquiryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.enquiryType ? (
                        <span className="gsc-error" id="enquiryType-error">
                          {errors.enquiryType}
                        </span>
                      ) : null}
                    </div>

                    <div className="gsc-formGrid">
                      <Field
                        id="name"
                        label="Full name"
                        required
                        value={form.name}
                        error={errors.name}
                        autoComplete="name"
                        onChange={handleChange}
                      />
                      <Field
                        id="workEmail"
                        label="Work email"
                        type="email"
                        required
                        value={form.workEmail}
                        error={errors.workEmail}
                        autoComplete="email"
                        onChange={handleChange}
                      />
                      <Field
                        id="company"
                        label="Organisation"
                        required
                        value={form.company}
                        error={errors.company}
                        autoComplete="organization"
                        onChange={handleChange}
                      />
                      <Field
                        id="role"
                        label="Role or responsibility"
                        value={form.role}
                        error={errors.role}
                        autoComplete="organization-title"
                        onChange={handleChange}
                      />

                      <SelectField
                        id="organisationType"
                        label="Organisation type"
                        required
                        value={form.organisationType}
                        error={errors.organisationType}
                        options={organisationOptions}
                        placeholder="Select organisation type"
                        onChange={handleChange}
                      />
                      <Field
                        id="country"
                        label="Country of establishment"
                        required
                        value={form.country}
                        error={errors.country}
                        autoComplete="country-name"
                        onChange={handleChange}
                      />
                      <Field
                        id="phone"
                        label="Phone number"
                        type="tel"
                        value={form.phone}
                        error={errors.phone}
                        autoComplete="tel"
                        hint="Optional"
                        onChange={handleChange}
                      />
                      <SelectField
                        id="reportingStage"
                        label="Current reporting stage"
                        value={form.reportingStage}
                        error={errors.reportingStage}
                        options={stageOptions}
                        placeholder="Select current stage"
                        onChange={handleChange}
                      />
                      <SelectField
                        id="entityCount"
                        label="Legal entities"
                        value={form.entityCount}
                        error={errors.entityCount}
                        options={entityOptions}
                        placeholder="Select entity range"
                        onChange={handleChange}
                      />
                      <SelectField
                        id="supplierCount"
                        label="Active suppliers"
                        value={form.supplierCount}
                        error={errors.supplierCount}
                        options={supplierOptions}
                        placeholder="Select supplier range"
                        onChange={handleChange}
                      />
                    </div>

                    <div className="gsc-field gsc-fieldFull">
                      <label htmlFor="message">
                        What should the conversation solve? <b aria-hidden="true">*</b>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={7}
                        maxLength={3000}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Describe the current process, the main constraint, the output you need, and any internal deadline."
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? "message-error" : "message-hint"}
                      />
                      <div className="gsc-fieldMeta">
                        <span id="message-hint">Do not include passwords, access tokens, or confidential evidence.</span>
                        <span>{form.message.length}/3000</span>
                      </div>
                      {errors.message ? (
                        <span className="gsc-error" id="message-error">
                          {errors.message}
                        </span>
                      ) : null}
                    </div>

                    <div className="gsc-honeypot" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        value={form.website}
                        onChange={handleChange}
                        autoComplete="off"
                        tabIndex={-1}
                      />
                    </div>

                    <label className={`gsc-consent ${errors.consent ? "gsc-consentError" : ""}`}>
                      <input
                        type="checkbox"
                        name="consent"
                        checked={form.consent}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.consent)}
                        aria-describedby={errors.consent ? "consent-error" : undefined}
                      />
                      <span>
                        I agree that GrandScope may use these details to respond to this enquiry. <b aria-hidden="true">*</b>
                      </span>
                    </label>
                    {errors.consent ? (
                      <span className="gsc-error gsc-consentMessage" id="consent-error">
                        {errors.consent}
                      </span>
                    ) : null}

                    <div className="gsc-submitRow">
                      <button
                        type="submit"
                        className="gsc-btn gsc-btnPrimary gsc-submit"
                        disabled={submitState === "submitting"}
                      >
                        {submitState === "submitting" ? (
                          <>
                            <span className="gsc-spinner" aria-hidden="true" />
                            Sending request
                          </>
                        ) : (
                          <>
                            Submit contact request
                            {iconArrow()}
                          </>
                        )}
                      </button>
                      <p>
                        {CONTACT_ENDPOINT
                          ? "The request is sent to the configured GrandScope contact endpoint."
                          : "The form will prepare an email in your device's email application."}
                      </p>
                    </div>
                  </form>
                )}
              </article>

              <aside className="gsc-sideColumn" aria-label="GrandScope contact guidance">
                <section className="gsc-sideCard gsc-sidePrimary">
                  <span className="gsc-kicker">Route the conversation</span>
                  <h2>Use the right lane from the start.</h2>

                  <div className="gsc-laneList">
                    <div>
                      <span className="gsc-laneIcon">{iconDemo()}</span>
                      <p>
                        <strong>Product and pricing</strong>
                        Demo scope, plan fit, supplier volume, entity limits, and operational controls.
                      </p>
                    </div>
                    <div>
                      <span className="gsc-laneIcon">{iconBuilding()}</span>
                      <p>
                        <strong>Implementation</strong>
                        Data migration, multi-entity setup, representative models, access controls, and integration planning.
                      </p>
                    </div>
                    <div>
                      <span className="gsc-laneIcon">{iconShield()}</span>
                      <p>
                        <strong>Security and procurement</strong>
                        Internal review requirements, governance questions, retention, controls, and procurement deadlines.
                      </p>
                    </div>
                    <div>
                      <span className="gsc-laneIcon">{iconSupport()}</span>
                      <p>
                        <strong>Existing user support</strong>
                        Account access, workflow issues, reporting context, or a concise technical problem description.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="gsc-sideCard">
                  <span className="gsc-kicker">What happens next</span>
                  <h2>A controlled handoff, not a generic inbox.</h2>
                  <ol className="gsc-nextList">
                    <li>
                      <span>1</span>
                      <p>
                        <strong>Request classified</strong>
                        The enquiry type establishes whether the request is product, pricing, implementation, procurement, or support.
                      </p>
                    </li>
                    <li>
                      <span>2</span>
                      <p>
                        <strong>Operating facts reviewed</strong>
                        Entity count, supplier volume, country, stage, and the stated constraint frame the discussion.
                      </p>
                    </li>
                    <li>
                      <span>3</span>
                      <p>
                        <strong>Relevant conversation prepared</strong>
                        The next step can focus on the workflow that matters rather than repeating basic discovery.
                      </p>
                    </li>
                  </ol>
                </section>

                <section className="gsc-sideCard gsc-sideLinkCard">
                  <div className="gsc-sideLinkIcon">{iconWorkflow()}</div>
                  <div>
                    <span className="gsc-kicker">Need more context first?</span>
                    <h2>Review the workflow before submitting.</h2>
                    <p>
                      See how entity data, import lines, supplier requests, calculations, evidence, validation, and reporting output connect.
                    </p>
                    <div className="gsc-sideLinks">
                      <Link href="/en/how-it-works">How GrandScope works {iconArrow()}</Link>
                      <Link href="/en/compliance-data">Compliance and data controls {iconArrow()}</Link>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>

        <section className="gsc-section gsc-faqSection" aria-labelledby="faq-title">
          <div className="gsc-container">
            <div className="gsc-faqSurface">
              <header className="gsc-sectionHead">
                <span className="gsc-kicker">Contact FAQ</span>
                <h2 id="faq-title">Remove uncertainty before you submit.</h2>
                <p>
                  Use the form for product, commercial, implementation, procurement, and support conversations. Keep sensitive evidence inside controlled product workflows.
                </p>
              </header>

              <div className="gsc-faqGrid">
                {faqItems.map((item) => (
                  <details className="gsc-faqItem" key={item.question}>
                    <summary>{item.question}</summary>
                    <div>{item.answer}</div>
                  </details>
                ))}
              </div>

              <div className="gsc-finalBand">
                <div>
                  <span className="gsc-kicker">Prefer to test the workflow?</span>
                  <h2>Start with one CBAM report, then discuss scale.</h2>
                  <p>
                    Use a real reporting case to identify the operational questions that matter before selecting a larger plan.
                  </p>
                </div>
                <div className="gsc-finalActions">
                  <Link className="gsc-btn gsc-btnPrimary" href="/check">
                    Start free CBAM report
                  </Link>
                  <Link className="gsc-btn gsc-btnGhost" href="/en/pricing">
                    Compare plans
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Field({
  id,
  label,
  type = "text",
  required = false,
  value,
  error,
  autoComplete,
  hint,
  onChange,
}: {
  id: keyof FormValues;
  label: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
  value: string;
  error?: string;
  autoComplete?: string;
  hint?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="gsc-field">
      <label htmlFor={id}>
        {label} {required ? <b aria-hidden="true">*</b> : null}
        {hint ? <small>{hint}</small> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        maxLength={type === "email" ? 254 : 160}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <span className="gsc-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function SelectField<T extends readonly string[]>({
  id,
  label,
  required = false,
  value,
  error,
  options,
  placeholder,
  onChange,
}: {
  id: keyof FormValues;
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  options: T;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className="gsc-field">
      <label htmlFor={id}>
        {label} {required ? <b aria-hidden="true">*</b> : null}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <span className="gsc-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function validateForm(values: FormValues): ErrorMap {
  const errors: ErrorMap = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!values.enquiryType.trim()) errors.enquiryType = "Select the purpose of the request.";
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!emailPattern.test(values.workEmail.trim())) errors.workEmail = "Enter a valid work email address.";
  if (values.company.trim().length < 2) errors.company = "Enter your organisation name.";
  if (!values.organisationType.trim()) errors.organisationType = "Select your organisation type.";
  if (values.country.trim().length < 2) errors.country = "Enter the country of establishment.";
  if (values.message.trim().length < 20) {
    errors.message = "Provide at least 20 characters describing what the conversation should solve.";
  }
  if (!values.consent) errors.consent = "Confirm that GrandScope may use the details to respond.";

  return errors;
}

function buildPayload(values: FormValues) {
  return {
    type: "grandscope_contact_request",
    source: "https://www.grandscope.ai/en/contact",
    submittedAt: new Date().toISOString(),
    subject: `[GrandScope] ${values.enquiryType} - ${values.company.trim()}`,
    enquiryType: values.enquiryType.trim(),
    name: values.name.trim(),
    email: values.workEmail.trim(),
    workEmail: values.workEmail.trim(),
    company: values.company.trim(),
    role: values.role.trim(),
    organisationType: values.organisationType.trim(),
    country: values.country.trim(),
    phone: values.phone.trim(),
    entityCount: values.entityCount.trim(),
    supplierCount: values.supplierCount.trim(),
    reportingStage: values.reportingStage.trim(),
    message: values.message.trim(),
    consent: values.consent,
  };
}

type ContactPayload = ReturnType<typeof buildPayload>;

function buildMailtoUrl(payload: ContactPayload) {
  const subject = payload.subject;
  const body = [
    "GrandScope contact request",
    "",
    `Enquiry: ${payload.enquiryType}`,
    `Name: ${payload.name}`,
    `Work email: ${payload.workEmail}`,
    `Organisation: ${payload.company}`,
    `Role: ${payload.role || "Not provided"}`,
    `Organisation type: ${payload.organisationType}`,
    `Country: ${payload.country}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Legal entities: ${payload.entityCount || "Not provided"}`,
    `Active suppliers: ${payload.supplierCount || "Not provided"}`,
    `Reporting stage: ${payload.reportingStage || "Not provided"}`,
    "",
    "What the conversation should solve:",
    payload.message,
  ].join("\n");

  return `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildSchema() {
  const organization = {
    "@type": "Organization",
    "@id": "https://www.grandscope.ai/#org",
    name: "GrandScope",
    url: "https://www.grandscope.ai",
    logo: "https://www.grandscope.ai/logo.png",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales and product enquiries",
        url: CANONICAL_URL,
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: CANONICAL_URL,
        availableLanguage: ["English"],
      },
    ],
  };

  const software = {
    "@type": "SoftwareApplication",
    "@id": "https://www.grandscope.ai/#software",
    name: "GrandScope EU CBAM Reporter",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.grandscope.ai/en",
    publisher: { "@id": "https://www.grandscope.ai/#org" },
  };

  const contactPage = {
    "@type": ["WebPage", "ContactPage"],
    "@id": `${CANONICAL_URL}#webpage`,
    name: "Contact GrandScope",
    url: CANONICAL_URL,
    inLanguage: "en",
    description:
      "Contact GrandScope for an EU CBAM software demo, pricing assessment, implementation, procurement review, or product support.",
    isPartOf: { "@id": "https://www.grandscope.ai/#org" },
    about: { "@id": "https://www.grandscope.ai/#software" },
    breadcrumb: { "@id": `${CANONICAL_URL}#breadcrumb` },
    mainEntity: { "@id": `${CANONICAL_URL}#faq` },
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${CANONICAL_URL}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.grandscope.ai/en",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Contact",
        item: CANONICAL_URL,
      },
    ],
  };

  const faq = {
    "@type": "FAQPage",
    "@id": `${CANONICAL_URL}#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, software, contactPage, breadcrumb, faq],
  };
}

function iconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconCheckLarge() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8 12 2.6 2.6L16.5 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5h6M9 3h6v4H9V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="2" />
      <path d="m8 13 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconShield() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.8 2.9 8.3 7 10 4.1-1.7 7-5.2 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconDemo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="m10 8 5 3-5 3V8ZM8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21V5l8-3v19M12 8h8v13M2 21h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7h2M7 11h2M7 15h2M15 11h2M15 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconSupport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 13a3 3 0 0 1 3-3h1v7H7a3 3 0 0 1-3-3v-1ZM20 13a3 3 0 0 0-3-3h-1v7h1a3 3 0 0 0 3-3v-1ZM16 19c-1 1-2.3 2-4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconWorkflow() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="15" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 6h4a3 3 0 0 1 3 3v6M15 18h-4a3 3 0 0 1-3-3V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconAlert() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 3 20h18L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconInfo() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const styles = `
.gsc-root{
  --brand:#306263;
  --brandDark:#285556;
  --support:#4073AF;
  --highlight:#FFD617;
  --bg:#F5F5F5;
  --bg2:#EBEBEB;
  --surface:#FFFFFF;
  --surface2:#E3E3E3;
  --text:#404040;
  --muted:#707070;
  --border:#CFCFCF;
  --borderStrong:#9F9F9F;
  --success:#2E7D32;
  --warning:#F29527;
  --danger:#DA2131;
  --shadowSoft:0 16px 44px rgba(2,6,23,.10);
  --shadowLift:0 28px 86px rgba(2,6,23,.14);

  min-height:100vh;
  color:var(--text);
  background:
    radial-gradient(900px 520px at 8% 0%,rgba(48,98,99,.15),transparent 60%),
    radial-gradient(900px 520px at 90% 4%,rgba(64,115,175,.12),transparent 62%),
    radial-gradient(900px 520px at 50% 0%,rgba(255,214,23,.08),transparent 65%),
    var(--bg);
  font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.gsc-root,.gsc-root *,.gsc-root *::before,.gsc-root *::after{box-sizing:border-box}
.gsc-root button,.gsc-root input,.gsc-root select,.gsc-root textarea{font:inherit}
.gsc-container{width:100%;max-width:1180px;margin:0 auto;padding:0 16px}

.gsc-hero{padding:28px 0 34px}
.gsc-heroPanel{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.94),rgba(255,255,255,.84)) padding-box,
    linear-gradient(135deg,rgba(48,98,99,.64),rgba(255,214,23,.42),rgba(64,115,175,.30)) border-box;
  box-shadow:0 48px 140px rgba(2,6,23,.18),0 40px 120px rgba(48,98,99,.09);
  padding:30px;
}
.gsc-heroPanel::after{
  content:"";
  position:absolute;
  width:470px;
  height:470px;
  right:-220px;
  top:-270px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,214,23,.23),rgba(64,115,175,.11) 43%,transparent 70%);
  pointer-events:none;
}
.gsc-heroGrid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(330px,.88fr);gap:28px;align-items:center}
.gsc-heroCopy{min-width:0}
.gsc-eyebrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:17px;color:var(--muted);font-size:13px;font-weight:800}
.gsc-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:32px;
  padding:7px 11px;
  border-radius:999px;
  border:1px solid rgba(48,98,99,.28);
  background:rgba(255,255,255,.82);
  color:var(--text);
  font-size:12px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.gsc-h1{max-width:820px;margin:0;font-size:clamp(48px,4.8vw,66px);line-height:1.02;letter-spacing:-.045em;font-weight:950;text-wrap:balance}
.gsc-lead{max-width:760px;margin:22px 0 0;color:var(--muted);font-size:20px;line-height:1.76}
.gsc-audience{display:flex;align-items:center;gap:17px;flex-wrap:wrap;margin-top:20px;color:var(--muted);font-size:13px;font-weight:800}
.gsc-audience span{display:inline-flex;align-items:center;gap:6px}
.gsc-audience svg{color:var(--success)}
.gsc-heroActions,.gsc-finalActions,.gsc-successActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.gsc-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  min-height:54px;
  padding:13px 19px;
  border-radius:14px;
  border:1px solid var(--border);
  text-decoration:none;
  font-weight:900;
  cursor:pointer;
  transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease,filter .14s ease;
}
.gsc-btn:hover{transform:translateY(-1px);box-shadow:var(--shadowLift);border-color:var(--borderStrong)}
.gsc-btn:focus-visible{outline:3px solid rgba(64,115,175,.24);outline-offset:3px}
.gsc-btn:disabled{cursor:not-allowed;opacity:.66;transform:none;box-shadow:none}
.gsc-btnPrimary{background:linear-gradient(180deg,var(--brand),var(--brandDark));color:#fff;border-color:rgba(48,98,99,.40)}
.gsc-btnGhost{background:rgba(255,255,255,.96);color:var(--text)}

.gsc-briefCard{
  min-width:0;
  padding:24px;
  border-radius:22px;
  border:1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(360px 180px at 8% 8%,rgba(255,214,23,.16),transparent 62%),
    rgba(255,255,255,.92);
  box-shadow:var(--shadowSoft);
}
.gsc-briefHead{display:flex;gap:13px;align-items:flex-start}
.gsc-iconBox,.gsc-laneIcon,.gsc-sideLinkIcon{
  display:flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
  color:var(--brand);
  border:1px solid rgba(48,98,99,.22);
  background:#fff;
}
.gsc-iconBox{width:46px;height:46px;border-radius:15px}
.gsc-kicker{display:inline-block;color:var(--brand);font-size:11px;font-weight:900;letter-spacing:.095em;text-transform:uppercase}
.gsc-briefHead h2,.gsc-sideCard h2,.gsc-formHead h2,.gsc-sectionHead h2,.gsc-finalBand h2{margin:7px 0 0;letter-spacing:-.025em;font-weight:950}
.gsc-briefHead h2{font-size:24px;line-height:1.16}
.gsc-briefList{display:grid;gap:10px;margin-top:19px}
.gsc-briefList>div{display:grid;grid-template-columns:35px minmax(0,1fr);gap:11px;padding:12px;border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,.96)}
.gsc-briefList>div>span{display:flex;align-items:center;justify-content:center;width:35px;height:35px;border-radius:12px;background:rgba(235,235,235,.70);border:1px solid var(--border);font-size:11px;font-weight:950}
.gsc-briefList p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.5}
.gsc-briefList strong{display:block;margin-bottom:3px;color:var(--text);font-size:14px}
.gsc-briefNote{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px;border-radius:15px;background:rgba(48,98,99,.08);color:var(--muted);font-size:12.5px;line-height:1.5}
.gsc-briefNote svg{flex:0 0 21px;color:var(--brand)}

.gsc-section{padding:20px 0 34px}
.gsc-contactGrid{display:grid;grid-template-columns:minmax(0,1.16fr) minmax(330px,.84fr);gap:18px;align-items:start}
.gsc-formCard,.gsc-sideCard,.gsc-faqSurface{
  border:1px solid var(--border);
  background:rgba(255,255,255,.95);
  box-shadow:var(--shadowSoft);
}
.gsc-formCard{position:relative;overflow:hidden;border-radius:24px;padding:25px}
.gsc-formCard::before,.gsc-faqSurface::before{
  content:"";
  position:absolute;
  left:20px;
  right:20px;
  top:10px;
  height:2px;
  border-radius:999px;
  background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support));
}
.gsc-formHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-top:7px}
.gsc-formHead h2{font-size:clamp(29px,3vw,40px);line-height:1.1}
.gsc-formHead p{max-width:680px;margin:10px 0 0;color:var(--muted);line-height:1.65}
.gsc-formStatus{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:6px 10px;border-radius:999px;border:1px solid rgba(48,98,99,.22);background:rgba(48,98,99,.08);color:var(--brand);font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.gsc-formStatus[data-state="success"],.gsc-formStatus[data-state="email"]{color:var(--success);background:rgba(46,125,50,.08);border-color:rgba(46,125,50,.22)}
.gsc-formStatus[data-state="submitting"]{color:var(--support);background:rgba(64,115,175,.08);border-color:rgba(64,115,175,.22)}

.gsc-feedback{display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;align-items:start;margin-top:18px;padding:13px 14px;border-radius:16px;border:1px solid var(--border);font-size:13.5px;line-height:1.55}
.gsc-feedback p{margin:0}
.gsc-feedback svg{margin-top:1px}
.gsc-feedback-notice{background:rgba(64,115,175,.08);border-color:rgba(64,115,175,.24);color:#355E8E}
.gsc-feedback-success{background:rgba(46,125,50,.08);border-color:rgba(46,125,50,.24);color:#276A2B}
.gsc-feedback-error{background:rgba(218,33,49,.07);border-color:rgba(218,33,49,.24);color:#A91E2B}

.gsc-formCard form{margin-top:23px}
.gsc-formGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
.gsc-field{min-width:0}
.gsc-fieldFull{margin-top:15px}
.gsc-field>label{display:flex;align-items:center;gap:6px;margin-bottom:7px;color:var(--text);font-size:13px;font-weight:900}
.gsc-field>label b,.gsc-consent b{color:var(--danger)}
.gsc-field>label small{margin-left:auto;color:var(--muted);font-size:11px;font-weight:700}
.gsc-field input,.gsc-field select,.gsc-field textarea{
  display:block;
  width:100%;
  min-width:0;
  color:var(--text);
  background:#fff;
  border:1px solid var(--border);
  border-radius:13px;
  outline:none;
  box-shadow:0 1px 0 rgba(2,6,23,.02);
  transition:border-color .14s ease,box-shadow .14s ease,background .14s ease;
}
.gsc-field input,.gsc-field select{height:50px;padding:0 13px}
.gsc-field textarea{min-height:154px;padding:13px;resize:vertical;line-height:1.55}
.gsc-field input:hover,.gsc-field select:hover,.gsc-field textarea:hover{border-color:var(--borderStrong)}
.gsc-field input:focus,.gsc-field select:focus,.gsc-field textarea:focus{border-color:var(--support);box-shadow:0 0 0 4px rgba(64,115,175,.12)}
.gsc-field input[aria-invalid="true"],.gsc-field select[aria-invalid="true"],.gsc-field textarea[aria-invalid="true"]{border-color:var(--danger);box-shadow:0 0 0 3px rgba(218,33,49,.08)}
.gsc-fieldMeta{display:flex;justify-content:space-between;gap:12px;margin-top:7px;color:var(--muted);font-size:11px;line-height:1.4}
.gsc-error{display:block;margin-top:6px;color:var(--danger);font-size:12px;font-weight:800;line-height:1.4}
.gsc-honeypot{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(1px,1px,1px,1px)!important;white-space:nowrap!important}
.gsc-consent{display:flex;gap:10px;align-items:flex-start;margin-top:17px;padding:13px;border:1px solid var(--border);border-radius:15px;background:rgba(245,245,245,.64);color:var(--muted);font-size:12.5px;line-height:1.5;cursor:pointer}
.gsc-consent input{width:18px;height:18px;flex:0 0 18px;margin-top:1px;accent-color:var(--brand)}
.gsc-consentError{border-color:rgba(218,33,49,.48);background:rgba(218,33,49,.05)}
.gsc-consentMessage{margin-left:1px}
.gsc-submitRow{display:flex;align-items:center;gap:14px;margin-top:18px}
.gsc-submit{min-width:232px}
.gsc-submitRow>p{margin:0;color:var(--muted);font-size:11.5px;line-height:1.45}
.gsc-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;animation:gsc-spin .8s linear infinite}
@keyframes gsc-spin{to{transform:rotate(360deg)}}

.gsc-successPanel{display:flex;min-height:540px;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 16px}
.gsc-successIcon{display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:21px;color:var(--success);background:rgba(46,125,50,.09);border:1px solid rgba(46,125,50,.22)}
.gsc-successIcon svg{width:30px;height:30px}
.gsc-successPanel h3{margin:18px 0 0;font-size:28px;letter-spacing:-.025em}
.gsc-successPanel p{max-width:520px;margin:10px 0 0;color:var(--muted);line-height:1.65}
.gsc-successActions{justify-content:center}

.gsc-sideColumn{display:grid;gap:14px}
.gsc-sideCard{border-radius:21px;padding:20px}
.gsc-sidePrimary{background:
  radial-gradient(400px 190px at 4% 0%,rgba(255,214,23,.14),transparent 63%),
  rgba(255,255,255,.96)}
.gsc-sideCard h2{font-size:24px;line-height:1.15}
.gsc-laneList{display:grid;gap:10px;margin-top:17px}
.gsc-laneList>div{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;padding:12px;border-radius:16px;border:1px solid var(--border);background:#fff}
.gsc-laneIcon{width:42px;height:42px;border-radius:14px}
.gsc-laneList p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
.gsc-laneList strong{display:block;margin-bottom:3px;color:var(--text);font-size:14px}
.gsc-nextList{list-style:none;padding:0;margin:17px 0 0;display:grid;gap:12px}
.gsc-nextList li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:start}
.gsc-nextList li>span{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;background:rgba(235,235,235,.72);border:1px solid var(--border);font-size:12px;font-weight:950}
.gsc-nextList p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
.gsc-nextList strong{display:block;color:var(--text);font-size:14px;margin-bottom:3px}
.gsc-sideLinkCard{display:grid;grid-template-columns:50px minmax(0,1fr);gap:13px;align-items:start;background:
  radial-gradient(380px 170px at 90% 5%,rgba(64,115,175,.11),transparent 62%),
  rgba(255,255,255,.96)}
.gsc-sideLinkIcon{width:50px;height:50px;border-radius:16px;color:var(--support);border-color:rgba(64,115,175,.22)}
.gsc-sideLinkCard p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.58}
.gsc-sideLinks{display:grid;gap:8px;margin-top:14px}
.gsc-sideLinks a{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--support);font-size:13px;font-weight:900;text-decoration:none}
.gsc-sideLinks a:hover{text-decoration:underline}

.gsc-faqSection{padding-bottom:42px}
.gsc-faqSurface{position:relative;border-radius:24px;padding:25px}
.gsc-sectionHead{max-width:780px;padding-top:7px}
.gsc-sectionHead h2{font-size:clamp(29px,3vw,40px);line-height:1.1}
.gsc-sectionHead p{margin:10px 0 0;color:var(--muted);line-height:1.65}
.gsc-faqGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:21px}
.gsc-faqItem{border:1px solid var(--border);border-radius:17px;background:#fff;padding:13px 14px}
.gsc-faqItem summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;font-weight:950;line-height:1.4}
.gsc-faqItem summary::-webkit-details-marker{display:none}
.gsc-faqItem summary::before{content:"?";display:flex;align-items:center;justify-content:center;width:29px;height:29px;flex:0 0 29px;border-radius:10px;border:1px solid rgba(48,98,99,.22);background:radial-gradient(140px 44px at 20% 30%,rgba(255,214,23,.2),transparent 62%),#fff;color:var(--brand)}
.gsc-faqItem summary::after{content:"▾";margin-left:auto;color:var(--muted);transition:transform .14s ease}
.gsc-faqItem[open] summary::after{transform:rotate(180deg)}
.gsc-faqItem>div{padding:10px 0 1px 39px;color:var(--muted);line-height:1.65;font-size:13.5px}
.gsc-finalBand{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-top:18px;padding:22px;border-radius:20px;border:1px solid transparent;background:
  linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.90)) padding-box,
  linear-gradient(135deg,rgba(48,98,99,.54),rgba(255,214,23,.42),rgba(64,115,175,.28)) border-box}
.gsc-finalBand h2{font-size:28px;line-height:1.12}
.gsc-finalBand p{max-width:650px;margin:8px 0 0;color:var(--muted);line-height:1.6}
.gsc-finalActions{flex:0 0 auto;margin-top:0}

@media(max-width:980px){
  .gsc-heroGrid,.gsc-contactGrid{grid-template-columns:1fr}
  .gsc-briefCard{max-width:none}
  .gsc-sideColumn{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gsc-sideLinkCard{grid-column:1/-1}
}
@media(max-width:760px){
  .gsc-heroPanel,.gsc-formCard,.gsc-faqSurface{padding:18px}
  .gsc-h1{font-size:clamp(42px,11vw,54px)}
  .gsc-lead{font-size:18px}
  .gsc-formGrid,.gsc-faqGrid,.gsc-sideColumn{grid-template-columns:1fr}
  .gsc-sideLinkCard{grid-column:auto}
  .gsc-finalBand{align-items:flex-start;flex-direction:column}
  .gsc-finalActions{width:100%}
  .gsc-finalActions .gsc-btn{flex:1 1 180px}
}
@media(max-width:560px){
  .gsc-container{padding:0 12px}
  .gsc-hero{padding-top:18px}
  .gsc-heroPanel{border-radius:22px}
  .gsc-h1{font-size:40px;line-height:1.04}
  .gsc-audience{display:grid;gap:8px}
  .gsc-heroActions,.gsc-successActions{display:grid;grid-template-columns:1fr;width:100%}
  .gsc-heroActions .gsc-btn,.gsc-successActions .gsc-btn{width:100%}
  .gsc-formHead{flex-direction:column}
  .gsc-formStatus{white-space:normal;text-align:center}
  .gsc-fieldMeta{align-items:flex-start;flex-direction:column}
  .gsc-submitRow{align-items:stretch;flex-direction:column}
  .gsc-submit{width:100%}
  .gsc-sideLinkCard{grid-template-columns:1fr}
  .gsc-finalActions{display:grid;grid-template-columns:1fr}
  .gsc-finalActions .gsc-btn{width:100%}
}
@media(prefers-reduced-motion:reduce){
  .gsc-root *{scroll-behavior:auto!important;transition:none!important;animation-duration:.001ms!important;animation-iteration-count:1!important}
}
`;
