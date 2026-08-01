import Head from "next/head";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from "react";

/*
  FILE PATH
  pages/en/contact.tsx

  FORM DELIVERY
  Set NEXT_PUBLIC_CONTACT_FORM_ENDPOINT to a JSON endpoint or Supabase Edge
  Function that accepts the payload created in buildPayload().

  Optional:
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_CONTACT_EMAIL

  Without an endpoint, the form opens a prefilled email draft addressed to
  sales@grandscope.ai, or the address configured in NEXT_PUBLIC_CONTACT_EMAIL.
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

type ContactMethod = "email" | "phone";
type SubmitState =
  | "idle"
  | "sending"
  | "success"
  | "email"
  | "error"
  | "validation";

type FormValues = {
  enquiryType: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  phone: string;
  message: string;
  consent: boolean;
  website: string;
};

type ErrorMap = Partial<Record<keyof FormValues | "contactMethod", string>>;

const initialForm: FormValues = {
  enquiryType: "Request a product demo",
  name: "",
  email: "",
  company: "",
  subject: "",
  phone: "",
  message: "",
  consent: false,
  website: "",
};

const faqItems = [
  {
    question: "What should I include in a demo request?",
    answer:
      "Include your organisation type, approximate supplier volume, entity structure, current reporting process, and the result you need from GrandScope. Add any internal deadline that affects the discussion.",
  },
  {
    question: "Can GrandScope discuss multi-entity or representative workflows?",
    answer:
      "Yes. Select Business or Enterprise assessment and explain whether you operate across several legal entities, clients, customs representatives, or supplier networks.",
  },
  {
    question: "Can I use this form for procurement or security review?",
    answer:
      "Yes. Select Security and procurement review and list the documents, controls, integration details, or procurement deadline involved. Do not paste confidential supplier evidence into this public form.",
  },
  {
    question: "Where should an existing user report a product issue?",
    answer:
      "Select Account or technical support, state the affected workflow, and describe the issue clearly. Do not include passwords, access tokens, or confidential evidence files.",
  },
] as const;

export default function ContactPage() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [errors, setErrors] = useState<ErrorMap>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const schema = useMemo(() => buildSchema(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const intent = String(
      params.get("intent") || params.get("subject") || "",
    ).toLowerCase();
    const plan = String(params.get("plan") || "").trim();

    if (!intent && !plan) return;

    let enquiryType = initialForm.enquiryType;

    if (
      /price|pricing|starter|professional/.test(intent) ||
      /starter|professional/i.test(plan)
    ) {
      enquiryType = "Pricing and plan fit";
    } else if (
      /enterprise|business|assessment/.test(intent) ||
      /business|enterprise/i.test(plan)
    ) {
      enquiryType = "Business or Enterprise assessment";
    } else if (/security|procurement/.test(intent)) {
      enquiryType = "Security and procurement review";
    } else if (/support|technical|account/.test(intent)) {
      enquiryType = "Account or technical support";
    } else if (/implementation|migration|onboarding/.test(intent)) {
      enquiryType = "Implementation and data migration";
    }

    setForm((current) => ({
      ...current,
      enquiryType,
      subject:
        current.subject ||
        (plan ? `${plan} plan discussion` : enquiryType),
      message:
        current.message ||
        (plan
          ? `I would like to discuss the ${plan} plan and confirm whether it fits our CBAM operating model.`
          : ""),
    }));
  }, []);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = event.target;
    const { name } = target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));

    if (submitState === "error" || submitState === "validation") {
      setSubmitState("idle");
      setFeedback("");
    }
  };

  const changeContactMethod = (method: ContactMethod) => {
    setContactMethod(method);
    setErrors((current) => ({
      ...current,
      contactMethod: undefined,
      phone: undefined,
    }));

    if (submitState === "validation") {
      setSubmitState("idle");
      setFeedback("");
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setContactMethod("email");
    setErrors({});
    setSubmitState("idle");
    setFeedback("");
    formRef.current?.reset();
  };

  const focusFirstInvalidField = (nextErrors: ErrorMap) => {
    if (typeof document === "undefined") return;
    const firstName = Object.keys(nextErrors)[0];
    const element = document.querySelector<HTMLElement>(
      `[name="${firstName}"]`,
    );
    element?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitState === "sending") return;

    if (form.website.trim()) {
      setSubmitState("success");
      setFeedback("Your request has been received.");
      return;
    }

    const nextErrors = validateForm(form, contactMethod);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitState("validation");
      setFeedback(validationMessage(nextErrors));
      focusFirstInvalidField(nextErrors);
      return;
    }

    const payload = buildPayload(form, contactMethod);
    setSubmitState("sending");
    setFeedback("Sending your message...");

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
        setFeedback("");
        setForm(initialForm);
        setContactMethod("email");
        formRef.current?.reset();
        return;
      }

      setSubmitState("email");
      setFeedback(
        `Your email application has been opened with the message prepared for ${CONTACT_EMAIL}. Review it, then send the email.`,
      );
      window.location.href = buildMailtoUrl(payload);
    } catch (error) {
      console.error("[GrandScopeContact] submission_failed", error);
      setSubmitState("error");
      setFeedback(
        CONTACT_ENDPOINT
          ? `Unable to send right now. Please email ${CONTACT_EMAIL}.`
          : `The email draft could not be opened. Please email ${CONTACT_EMAIL}.`,
      );
    }
  };

  const isComplete =
    submitState === "success" || submitState === "email";

  const introCopy = (
    <>
      <p className="gsc-introStrong">
        Contact GrandScope for product, pricing, implementation, procurement,
        and account support.
      </p>
      <p className="gsc-introText">
        Use this page when you need a CBAM software demo, a plan assessment,
        help with a multi-entity operating model, implementation guidance, a
        security review, or technical support. Include your organisation, the
        workflow involved, and any deadline so the request can be routed
        without unnecessary back and forth.
      </p>
      <p className="gsc-introText">
        Review <Link href="/en/how-it-works">How it works</Link>,{" "}
        <Link href="/en/compliance-data">Compliance data</Link>, or{" "}
        <Link href="/en/pricing">Pricing</Link> before submitting when you need
        more product context.
      </p>
    </>
  );

  return (
    <>
      <Head>
        <title>Contact GrandScope | EU CBAM Software Demo and Support</title>
        <meta
          name="description"
          content="Contact GrandScope for an EU CBAM software demo, pricing assessment, implementation discussion, security review, procurement request, or account support."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Contact GrandScope | EU CBAM Software"
        />
        <meta
          property="og:description"
          content="Request a GrandScope product demo, plan assessment, implementation discussion, procurement review, or technical support conversation."
        />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta
          property="og:image"
          content="https://www.grandscope.ai/og/cbam.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Contact GrandScope | EU CBAM Software"
        />
        <meta
          name="twitter:description"
          content="Contact GrandScope for product, pricing, implementation, procurement, and account support."
        />
        <meta
          name="twitter:image"
          content="https://www.grandscope.ai/og/cbam.png"
        />
      </Head>

      <main className="gsc-root" aria-label="Contact GrandScope">
        <style>{styles}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <div className="gsc-container">
          <section className="gsc-contentShell">
            <div className="gsc-layout">
              <header className="gsc-header">
                <nav className="gsc-breadcrumb" aria-label="Breadcrumb">
                  <Link href="/en">Home</Link>
                  <span aria-hidden="true">/</span>
                  <span>Contact</span>
                </nav>

                <span className="gsc-kicker">GrandScope contact</span>
                <h1 id="contact-page-title">Contact GrandScope</h1>
                <div className="gsc-underline" aria-hidden="true" />

                <div className="gsc-copyMobile">{introCopy}</div>
              </header>

              <aside
                className="gsc-details"
                aria-labelledby="contact-topics-title"
              >
                <div className="gsc-card gsc-accentCard gsc-detailsCard">
                  <span className="gsc-kicker">Route your request</span>
                  <h2 id="contact-topics-title">
                    What GrandScope can help with
                  </h2>
                  <p className="gsc-cardLead">
                    Choose the closest enquiry type in the form. The details
                    below show what to include for a useful response.
                  </p>

                  <div className="gsc-topicList">
                    <ContactTopic
                      icon={iconDemo()}
                      title="Product demos and pricing"
                      text="Plan fit, supplier volume, legal entity limits, workflow requirements, and the result you need from the software."
                    />
                    <ContactTopic
                      icon={iconImplementation()}
                      title="Implementation and data migration"
                      text="Existing data sources, rollout scope, representative models, access controls, and onboarding requirements."
                    />
                    <ContactTopic
                      icon={iconShield()}
                      title="Security and procurement"
                      text="Vendor review documents, retention questions, governance controls, integrations, and internal procurement deadlines."
                    />
                    <ContactTopic
                      icon={iconSupport()}
                      title="Account and technical support"
                      text="The affected workflow, expected behaviour, actual result, and enough context to reproduce the problem safely."
                    />
                  </div>

                  <div className="gsc-directContact">
                    <h3>Direct email fallback</h3>
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                    <p>
                      Include your organisation name, enquiry type, and
                      deadline. Never send passwords, access tokens, or
                      confidential supplier evidence by email.
                    </p>
                  </div>
                </div>

                <div className="gsc-card gsc-nextCard">
                  <span className="gsc-kicker">What happens next</span>
                  <h2>A controlled handoff, not a generic inbox</h2>
                  <ol>
                    <li>
                      <span>1</span>
                      <p>
                        <strong>Request classified</strong>
                        The enquiry type establishes the correct commercial,
                        implementation, procurement, or support route.
                      </p>
                    </li>
                    <li>
                      <span>2</span>
                      <p>
                        <strong>Operating facts reviewed</strong>
                        Your organisation, subject, message, and preferred
                        contact method frame the response.
                      </p>
                    </li>
                    <li>
                      <span>3</span>
                      <p>
                        <strong>Relevant next step prepared</strong>
                        The reply can focus on the required workflow rather than
                        restarting basic discovery.
                      </p>
                    </li>
                  </ol>
                </div>
              </aside>

              <div className="gsc-formArea">
                <div className="gsc-card gsc-accentCard gsc-formCard">
                  <div className="gsc-formHeading">
                    <div>
                      <span className="gsc-kicker">Contact form</span>
                      <h2 id="send-message">Send us a message</h2>
                    </div>
                    <span
                      className={`gsc-formState gsc-formState-${submitState}`}
                      aria-live="polite"
                    >
                      {submitState === "sending"
                        ? "Sending"
                        : isComplete
                          ? "Ready"
                          : "Secure intake"}
                    </span>
                  </div>

                  <p className="gsc-formIntro">
                    Required fields are marked with an asterisk. The asterisk
                    changes from red to green when a required field has content.
                  </p>

                  {feedback && submitState !== "success" ? (
                    <div
                      className={`gsc-feedback gsc-feedback-${
                        submitState === "error"
                          ? "error"
                          : submitState === "validation"
                            ? "validation"
                            : submitState === "email"
                              ? "success"
                              : "notice"
                      }`}
                      role={submitState === "error" ? "alert" : "status"}
                      aria-live="polite"
                    >
                      {submitState === "error"
                        ? iconAlert()
                        : submitState === "validation"
                          ? iconInfo()
                          : submitState === "email"
                            ? iconCheck()
                            : iconInfo()}
                      <p>{feedback}</p>
                    </div>
                  ) : null}

                  {submitState === "success" ? (
                    <div
                      className="gsc-success"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="gsc-successIcon">
                        {iconCheckLarge()}
                      </div>
                      <h3>Message sent</h3>
                      <p>
                        Thanks. Your GrandScope request has been submitted
                        through the configured contact endpoint.
                      </p>
                      <button
                        type="button"
                        className="gsc-button gsc-buttonPrimary"
                        onClick={resetForm}
                      >
                        Send another message
                      </button>
                    </div>
                  ) : submitState === "email" ? (
                    <div
                      className="gsc-success"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="gsc-successIcon">{iconMail()}</div>
                      <h3>Finish in your email application</h3>
                      <p>
                        The message is prepared for {CONTACT_EMAIL}. It remains
                        under your control until you send it.
                      </p>
                      <button
                        type="button"
                        className="gsc-button gsc-buttonPrimary"
                        onClick={resetForm}
                      >
                        Start another request
                      </button>
                    </div>
                  ) : (
                    <form ref={formRef} onSubmit={handleSubmit} noValidate>
                      <fieldset className="gsc-contactMethod">
                        <legend>
                          Preferred contact method{" "}
                          <span aria-hidden="true">*</span>
                        </legend>
                        <div className="gsc-radioRow">
                          <label>
                            <input
                              type="radio"
                              name="contactMethod"
                              value="email"
                              checked={contactMethod === "email"}
                              onChange={() => changeContactMethod("email")}
                            />
                            <span>Email</span>
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="contactMethod"
                              value="phone"
                              checked={contactMethod === "phone"}
                              onChange={() => changeContactMethod("phone")}
                            />
                            <span>Phone</span>
                          </label>
                        </div>
                      </fieldset>

                      <StackedSelect
                        id="enquiryType"
                        label="Enquiry type"
                        value={form.enquiryType}
                        options={enquiryOptions}
                        required
                        error={errors.enquiryType}
                        onChange={handleChange}
                      />

                      <StackedInput
                        id="name"
                        label="Full name"
                        type="text"
                        value={form.name}
                        placeholder="Full name"
                        autoComplete="name"
                        required
                        error={errors.name}
                        onChange={handleChange}
                      />

                      <StackedInput
                        id="email"
                        label="Work email"
                        type="email"
                        value={form.email}
                        placeholder="Work email"
                        autoComplete="email"
                        required
                        error={errors.email}
                        onChange={handleChange}
                      />

                      <StackedInput
                        id="company"
                        label="Organisation"
                        type="text"
                        value={form.company}
                        placeholder="Organisation"
                        autoComplete="organization"
                        required
                        error={errors.company}
                        onChange={handleChange}
                      />

                      <StackedInput
                        id="subject"
                        label="Subject"
                        type="text"
                        value={form.subject}
                        placeholder="Subject"
                        autoComplete="off"
                        required
                        error={errors.subject}
                        onChange={handleChange}
                      />

                      <StackedInput
                        id="phone"
                        label="Phone number"
                        type="tel"
                        value={form.phone}
                        placeholder={
                          contactMethod === "phone"
                            ? "Phone number"
                            : "Phone number (optional)"
                        }
                        autoComplete="tel"
                        required={contactMethod === "phone"}
                        error={errors.phone}
                        onChange={handleChange}
                      />

                      <StackedTextarea
                        id="message"
                        label="Message"
                        value={form.message}
                        placeholder="Tell us what you need, the workflow involved, and any deadline..."
                        required
                        error={errors.message}
                        onChange={handleChange}
                      />

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

                      <label
                        className={`gsc-consent ${
                          errors.consent ? "gsc-consentError" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="consent"
                          checked={form.consent}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.consent)}
                          aria-describedby={
                            errors.consent ? "consent-error" : undefined
                          }
                        />
                        <span>
                          I agree that GrandScope may use these details to
                          respond to this enquiry.{" "}
                          <b aria-hidden="true">*</b>
                        </span>
                      </label>
                      {errors.consent ? (
                        <span
                          className="gsc-error gsc-consentMessage"
                          id="consent-error"
                        >
                          {errors.consent}
                        </span>
                      ) : null}

                      <div className="gsc-submitWrap">
                        <button
                          type="submit"
                          className="gsc-button gsc-buttonPrimary"
                          disabled={submitState === "sending"}
                        >
                          {submitState === "sending" ? (
                            <>
                              <span
                                className="gsc-spinner"
                                aria-hidden="true"
                              />
                              Sending...
                            </>
                          ) : (
                            <>
                              Send message
                              {iconArrow()}
                            </>
                          )}
                        </button>
                      </div>

                      <p className="gsc-deliveryNote">
                        {CONTACT_ENDPOINT
                          ? "The message is sent to the configured GrandScope contact endpoint."
                          : `The form prepares an email addressed to ${CONTACT_EMAIL}.`}
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <section
              className="gsc-copyDesktop"
              aria-label="Contact GrandScope introduction"
            >
              {introCopy}
            </section>

            <section
              className="gsc-faq"
              id="contact-faq"
              aria-labelledby="contact-faq-title"
            >
              <span className="gsc-kicker">Contact FAQ</span>
              <h2 id="contact-faq-title">
                Quick answers before you submit
              </h2>
              <p className="gsc-faqLead">
                Keep sensitive evidence inside controlled product workflows.
                Use this public form for routing, context, and next-step
                planning.
              </p>

              <div className="gsc-faqGrid">
                {faqItems.map((item) => (
                  <details key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>

              <div className="gsc-bottomCta">
                <div>
                  <span className="gsc-kicker">
                    Need product context first?
                  </span>
                  <h2>
                    Review the workflow or compare plans before contacting us
                  </h2>
                </div>
                <div className="gsc-bottomActions">
                  <Link
                    className="gsc-button gsc-buttonPrimary"
                    href="/en/how-it-works"
                  >
                    How GrandScope works
                  </Link>
                  <Link
                    className="gsc-button gsc-buttonSecondary"
                    href="/en/pricing"
                  >
                    Compare plans
                  </Link>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

function ContactTopic({
  icon,
  title,
  text,
}: {
  icon: ReactElement;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span className="gsc-topicIcon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function StackedInput({
  id,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  required,
  error,
  onChange,
}: {
  id: keyof FormValues;
  label: string;
  type: "text" | "email" | "tel";
  value: string;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const complete = value.trim().length > 0;

  return (
    <div className="gsc-formField">
      <label htmlFor={id} className="gsc-srOnly">
        {label}
      </label>
      <div className="gsc-requiredWrap">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          onChange={onChange}
          maxLength={type === "email" ? 254 : 180}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {required ? (
          <span
            className={`gsc-requiredStar ${
              complete ? "gsc-requiredComplete" : ""
            }`}
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="gsc-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function StackedSelect<T extends readonly string[]>({
  id,
  label,
  value,
  options,
  required,
  error,
  onChange,
}: {
  id: keyof FormValues;
  label: string;
  value: string;
  options: T;
  required?: boolean;
  error?: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const complete = value.trim().length > 0;

  return (
    <div className="gsc-formField">
      <label htmlFor={id} className="gsc-srOnly">
        {label}
      </label>
      <div className="gsc-requiredWrap gsc-selectWrap">
        <select
          id={id}
          name={id}
          value={value}
          required={required}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {required ? (
          <span
            className={`gsc-requiredStar ${
              complete ? "gsc-requiredComplete" : ""
            }`}
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="gsc-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function StackedTextarea({
  id,
  label,
  value,
  placeholder,
  required,
  error,
  onChange,
}: {
  id: keyof FormValues;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const complete = value.trim().length > 0;

  return (
    <div className="gsc-formField">
      <label htmlFor={id} className="gsc-srOnly">
        {label}
      </label>
      <div className="gsc-requiredWrap gsc-textareaWrap">
        <textarea
          id={id}
          name={id}
          rows={6}
          value={value}
          placeholder={placeholder}
          required={required}
          maxLength={3000}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        {required ? (
          <span
            className={`gsc-requiredStar ${
              complete ? "gsc-requiredComplete" : ""
            }`}
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </div>
      <div className="gsc-fieldMeta" id={`${id}-hint`}>
        <span>
          Do not include passwords, access tokens, or confidential supplier
          evidence.
        </span>
        <span>{value.length}/3000</span>
      </div>
      {error ? (
        <span className="gsc-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function validateForm(
  values: FormValues,
  contactMethod: ContactMethod,
): ErrorMap {
  const errors: ErrorMap = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = values.phone.replace(/\D/g, "");

  if (!values.enquiryType.trim()) {
    errors.enquiryType = "Select an enquiry type.";
  }
  if (values.name.trim().length < 2) {
    errors.name = "Enter your full name.";
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.company.trim().length < 2) {
    errors.company = "Enter your organisation name.";
  }
  if (values.subject.trim().length < 3) {
    errors.subject = "Enter a clear subject.";
  }

  if (contactMethod === "phone" && phoneDigits.length === 0) {
    errors.phone =
      "Enter a phone number or select Email as the preferred contact method.";
  } else if (
    phoneDigits.length > 0 &&
    (phoneDigits.length < 7 || phoneDigits.length > 20)
  ) {
    errors.phone = "Enter a valid phone number between 7 and 20 digits.";
  }

  if (values.message.trim().length < 20) {
    errors.message =
      "Provide at least 20 characters explaining what you need.";
  }

  if (!values.consent) {
    errors.consent =
      "Confirm that GrandScope may use these details to respond.";
  }

  return errors;
}

function validationMessage(errors: ErrorMap) {
  if (errors.email) return errors.email;
  if (errors.phone) return errors.phone;
  if (errors.consent && Object.keys(errors).length === 1) {
    return errors.consent;
  }
  return "Please complete all required fields marked with an asterisk.";
}

function buildPayload(
  values: FormValues,
  contactMethod: ContactMethod,
) {
  return {
    type: "grandscope_contact_request",
    source: CANONICAL_URL,
    submittedAt: new Date().toISOString(),
    to: CONTACT_EMAIL,
    subject: `[GrandScope] ${values.enquiryType} - ${values.subject.trim()}`,
    enquiryType: values.enquiryType.trim(),
    preferredContactMethod: contactMethod,
    name: values.name.trim(),
    email: values.email.trim(),
    workEmail: values.email.trim(),
    company: values.company.trim(),
    phone: values.phone.trim(),
    message: [
      `Organisation: ${values.company.trim()}`,
      `Preferred contact method: ${
        contactMethod === "phone" ? "Phone" : "Email"
      }`,
      values.phone.trim() ? `Phone: ${values.phone.trim()}` : "",
      "",
      values.message.trim(),
    ]
      .filter(Boolean)
      .join("\n"),
    rawMessage: values.message.trim(),
    consent: values.consent,
  };
}

type ContactPayload = ReturnType<typeof buildPayload>;

function buildMailtoUrl(payload: ContactPayload) {
  const body = [
    "GrandScope contact request",
    "",
    `Enquiry type: ${payload.enquiryType}`,
    `Preferred contact method: ${
      payload.preferredContactMethod === "phone" ? "Phone" : "Email"
    }`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Organisation: ${payload.company}`,
    `Phone: ${payload.phone || "Not provided"}`,
    "",
    "Message:",
    payload.rawMessage,
  ].join("\n");

  return `mailto:${encodeURIComponent(
    CONTACT_EMAIL,
  )}?subject=${encodeURIComponent(
    payload.subject,
  )}&body=${encodeURIComponent(body)}`;
}

function buildSchema() {
  const organization = {
    "@type": "Organization",
    "@id": "https://www.grandscope.ai/#organization",
    name: "GrandScope",
    url: "https://www.grandscope.ai",
    logo: "https://www.grandscope.ai/logo.png",
    email: CONTACT_EMAIL,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales and product enquiries",
        email: CONTACT_EMAIL,
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
    publisher: {
      "@id": "https://www.grandscope.ai/#organization",
    },
  };

  const contactPage = {
    "@type": ["WebPage", "ContactPage"],
    "@id": `${CANONICAL_URL}#webpage`,
    name: "Contact GrandScope",
    url: CANONICAL_URL,
    inLanguage: "en",
    description:
      "Contact GrandScope for an EU CBAM software demo, pricing assessment, implementation discussion, procurement review, or account support.",
    isPartOf: {
      "@id": "https://www.grandscope.ai/#organization",
    },
    about: {
      "@id": "https://www.grandscope.ai/#software",
    },
    breadcrumb: {
      "@id": `${CANONICAL_URL}#breadcrumb`,
    },
    mainEntity: {
      "@id": `${CANONICAL_URL}#faq`,
    },
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
    "@graph": [
      organization,
      software,
      contactPage,
      breadcrumb,
      faq,
    ],
  };
}

function iconCheck() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
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
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconMail() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m5 8 7 5 7-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconDemo() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m10 8 5 3-5 3V8ZM8 21h8M12 17v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconImplementation() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 21V5l8-3v19M12 8h8v13M2 21h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7h2M7 11h2M7 15h2M15 11h2M15 15h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconShield() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 5 6v5c0 4.8 2.9 8.3 7 10 4.1-1.7 7-5.2 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconSupport() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 13v-2a8 8 0 0 1 16 0v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 13a3 3 0 0 1 3-3h1v7H7a3 3 0 0 1-3-3v-1ZM20 13a3 3 0 0 0-3-3h-1v7h1a3 3 0 0 0 3-3v-1ZM16 19c-1 1-2.3 2-4 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconAlert() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4 3 20h18L12 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconInfo() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 11v5M12 8h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  --surface:#FFFFFF;
  --text:#404040;
  --muted:#707070;
  --border:#D3D3D3;
  --borderStrong:#A8A8A8;
  --success:#2E7D32;
  --warning:#F29527;
  --danger:#DA2131;
  --shadowCard:0 14px 42px rgba(2,6,23,.09);
  --shadowSoft:0 6px 20px rgba(2,6,23,.07);

  min-height:100vh;
  color:var(--text);
  background:
    radial-gradient(900px 520px at 8% 0%,rgba(48,98,99,.13),transparent 60%),
    radial-gradient(900px 520px at 90% 4%,rgba(64,115,175,.10),transparent 62%),
    radial-gradient(900px 520px at 50% 0%,rgba(255,214,23,.07),transparent 65%),
    var(--bg);
  font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.gsc-root,.gsc-root *,.gsc-root *::before,.gsc-root *::after{box-sizing:border-box}
.gsc-root button,.gsc-root input,.gsc-root select,.gsc-root textarea{font:inherit}
.gsc-root a{color:inherit}
.gsc-container{width:100%;max-width:1240px;margin:0 auto;padding:0 22px}
.gsc-contentShell{padding:38px 0 72px}
.gsc-layout{
  display:grid;
  grid-template-columns:1fr;
  gap:25px;
  grid-template-areas:
    "form"
    "header"
    "details";
}
.gsc-header{grid-area:header;min-width:0;align-self:start}
.gsc-details{grid-area:details;min-width:0;align-self:start;display:grid;gap:18px}
.gsc-formArea{grid-area:form;min-width:0;align-self:start}
.gsc-breadcrumb{display:flex;align-items:center;gap:8px;margin-bottom:14px;color:var(--muted);font-size:12px;font-weight:700}
.gsc-breadcrumb a{color:var(--support);text-decoration:none}
.gsc-breadcrumb a:hover{text-decoration:underline}
.gsc-kicker{display:inline-block;color:var(--brand);font-size:11px;font-weight:900;letter-spacing:.095em;text-transform:uppercase}
.gsc-header h1{max-width:900px;margin:8px 0 0;font-size:clamp(44px,5.6vw,70px);line-height:1.02;letter-spacing:-.045em;font-weight:950;text-wrap:balance}
.gsc-underline{width:124px;height:3px;margin-top:15px;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support))}
.gsc-copyMobile{margin-top:22px}
.gsc-copyDesktop{display:none;margin-top:28px}
.gsc-introStrong,.gsc-introText{max-width:1040px;margin:0;color:var(--text);line-height:1.72}
.gsc-introStrong{font-size:18px;font-weight:850}
.gsc-introText{margin-top:10px;color:var(--muted);font-size:16px}
.gsc-introText a{color:var(--support);font-weight:800;text-decoration:none;border-bottom:1px dotted rgba(64,115,175,.45)}
.gsc-introText a:hover{border-bottom-style:solid}

.gsc-card{background:rgba(255,255,255,.96);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadowCard)}
.gsc-accentCard{border:1px solid transparent;background:
  linear-gradient(rgba(255,255,255,.97),rgba(255,255,255,.97)) padding-box,
  linear-gradient(135deg,rgba(48,98,99,.75),rgba(255,214,23,.50),rgba(64,115,175,.38)) border-box}
.gsc-detailsCard{padding:28px}
.gsc-detailsCard h2,.gsc-nextCard h2,.gsc-faq h2,.gsc-bottomCta h2{margin:8px 0 0;letter-spacing:-.027em;font-weight:950}
.gsc-detailsCard h2{font-size:clamp(28px,3vw,40px);line-height:1.12}
.gsc-cardLead{margin:11px 0 0;color:var(--muted);line-height:1.65}
.gsc-topicList{display:grid;gap:13px;margin-top:22px}
.gsc-topicList article{display:grid;grid-template-columns:46px minmax(0,1fr);gap:13px;align-items:start;padding:15px;border:1px solid var(--border);border-radius:16px;background:#fff}
.gsc-topicIcon{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:15px;border:1px solid rgba(48,98,99,.22);background:rgba(48,98,99,.06);color:var(--brand)}
.gsc-topicList h3{margin:1px 0 0;font-size:16px;font-weight:900}
.gsc-topicList p{margin:5px 0 0;color:var(--muted);font-size:14px;line-height:1.57}
.gsc-directContact{margin-top:20px;padding-top:20px;border-top:1px solid var(--border)}
.gsc-directContact h3{margin:0;font-size:17px;font-weight:900}
.gsc-directContact a{display:inline-block;margin-top:7px;color:var(--support);font-weight:900;text-decoration:none}
.gsc-directContact a:hover{text-decoration:underline}
.gsc-directContact p{margin:9px 0 0;color:var(--muted);font-size:13px;line-height:1.6}
.gsc-nextCard{padding:24px}
.gsc-nextCard h2{font-size:26px;line-height:1.15}
.gsc-nextCard ol{list-style:none;padding:0;margin:19px 0 0;display:grid;gap:14px}
.gsc-nextCard li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:11px;align-items:start}
.gsc-nextCard li>span{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;border:1px solid var(--border);background:rgba(235,235,235,.75);font-size:12px;font-weight:950}
.gsc-nextCard p{margin:0;color:var(--muted);font-size:14px;line-height:1.55}
.gsc-nextCard strong{display:block;margin-bottom:3px;color:var(--text);font-size:15px}

.gsc-formCard{padding:29px;position:relative;overflow:hidden}
.gsc-formCard::before{content:"";position:absolute;left:22px;right:22px;top:10px;height:2px;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support))}
.gsc-formHeading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-top:7px}
.gsc-formHeading h2{margin:7px 0 0;font-size:clamp(25px,2.2vw,32px);line-height:1.12;letter-spacing:-.025em;font-weight:950}
.gsc-formState{display:inline-flex;align-items:center;justify-content:center;min-height:29px;padding:6px 9px;border-radius:999px;border:1px solid rgba(48,98,99,.23);background:rgba(48,98,99,.07);color:var(--brand);font-size:10px;font-weight:900;letter-spacing:.065em;text-transform:uppercase;white-space:nowrap}
.gsc-formState-sending{color:var(--support);background:rgba(64,115,175,.08);border-color:rgba(64,115,175,.24)}
.gsc-formState-success,.gsc-formState-email{color:var(--success);background:rgba(46,125,50,.08);border-color:rgba(46,125,50,.24)}
.gsc-formIntro{margin:11px 0 0;color:var(--muted);font-size:13px;line-height:1.55}
.gsc-formCard form{margin-top:22px}
.gsc-contactMethod{padding:0;margin:0 0 16px;border:0}
.gsc-contactMethod legend{padding:0;color:var(--text);font-size:14px;font-weight:900}
.gsc-contactMethod legend span{color:var(--danger)}
.gsc-radioRow{display:flex;flex-wrap:wrap;gap:11px;margin-top:10px}
.gsc-radioRow label{display:inline-flex;align-items:center;gap:8px;min-width:116px;padding:10px 13px;border:1px solid var(--border);border-radius:12px;background:#fff;color:var(--text);font-size:14px;font-weight:800;cursor:pointer}
.gsc-radioRow label:has(input:checked){border-color:rgba(48,98,99,.55);background:rgba(48,98,99,.07);box-shadow:0 0 0 3px rgba(48,98,99,.07)}
.gsc-radioRow input{width:17px;height:17px;margin:0;accent-color:var(--brand)}
.gsc-formField{margin-bottom:14px}
.gsc-requiredWrap{position:relative}
.gsc-requiredWrap input,.gsc-requiredWrap select,.gsc-requiredWrap textarea{display:block;width:100%;min-width:0;border:1px solid var(--border);border-radius:11px;background:#fff;color:var(--text);outline:none;box-shadow:0 1px 0 rgba(2,6,23,.02);transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
.gsc-requiredWrap input,.gsc-requiredWrap select{height:50px;padding:0 45px 0 14px}
.gsc-requiredWrap select{appearance:none;padding-right:64px;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 27px) 22px,calc(100% - 21px) 22px;background-size:6px 6px,6px 6px;background-repeat:no-repeat}
.gsc-requiredWrap textarea{min-height:142px;padding:14px 45px 14px 14px;resize:vertical;line-height:1.58}
.gsc-requiredWrap input:hover,.gsc-requiredWrap select:hover,.gsc-requiredWrap textarea:hover{border-color:var(--borderStrong)}
.gsc-requiredWrap input:focus,.gsc-requiredWrap select:focus,.gsc-requiredWrap textarea:focus{border-color:var(--support);box-shadow:0 0 0 4px rgba(64,115,175,.12)}
.gsc-requiredWrap input[aria-invalid="true"],.gsc-requiredWrap select[aria-invalid="true"],.gsc-requiredWrap textarea[aria-invalid="true"]{border-color:var(--danger);box-shadow:0 0 0 3px rgba(218,33,49,.08)}
.gsc-requiredStar{position:absolute;right:15px;top:50%;transform:translateY(-50%);pointer-events:none;user-select:none;color:rgba(218,33,49,.95);font-size:17px;font-weight:950;line-height:1;text-shadow:0 0 6px rgba(218,33,49,.48),0 0 12px rgba(218,33,49,.30);filter:drop-shadow(0 0 5px rgba(218,33,49,.42));transition:color .18s ease,text-shadow .18s ease,filter .18s ease}
.gsc-selectWrap .gsc-requiredStar{right:43px}
.gsc-textareaWrap .gsc-requiredStar{top:17px;transform:none}
.gsc-requiredComplete{color:rgba(46,125,50,.97);text-shadow:0 0 6px rgba(46,125,50,.48),0 0 12px rgba(46,125,50,.27);filter:drop-shadow(0 0 5px rgba(46,125,50,.40))}
.gsc-fieldMeta{display:flex;justify-content:space-between;gap:12px;margin-top:7px;color:var(--muted);font-size:10.5px;line-height:1.45}
.gsc-error{display:block;margin-top:6px;color:var(--danger);font-size:12px;font-weight:800;line-height:1.4}
.gsc-honeypot{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(1px,1px,1px,1px)!important;white-space:nowrap!important}
.gsc-consent{display:flex;gap:10px;align-items:flex-start;margin-top:3px;padding:12px;border:1px solid var(--border);border-radius:13px;background:rgba(245,245,245,.68);color:var(--muted);font-size:12px;line-height:1.5;cursor:pointer}
.gsc-consent input{width:18px;height:18px;flex:0 0 18px;margin-top:1px;accent-color:var(--brand)}
.gsc-consent b{color:var(--danger)}
.gsc-consentError{border-color:rgba(218,33,49,.48);background:rgba(218,33,49,.05)}
.gsc-consentMessage{margin-left:1px}
.gsc-submitWrap{display:flex;justify-content:center;margin-top:22px}
.gsc-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:52px;padding:13px 21px;border-radius:999px;border:1px solid var(--border);text-decoration:none;font-weight:900;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease,filter .14s ease}
.gsc-button:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(2,6,23,.13)}
.gsc-button:focus-visible{outline:3px solid rgba(64,115,175,.24);outline-offset:3px}
.gsc-button:disabled{cursor:not-allowed;opacity:.66;transform:none;box-shadow:none}
.gsc-buttonPrimary{color:#fff;background:linear-gradient(180deg,var(--brand),var(--brandDark));border-color:rgba(48,98,99,.42)}
.gsc-buttonSecondary{color:var(--text);background:#fff}
.gsc-deliveryNote{margin:11px 0 0;color:var(--muted);font-size:10.5px;line-height:1.45;text-align:center}
.gsc-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;animation:gsc-spin .8s linear infinite}
@keyframes gsc-spin{to{transform:rotate(360deg)}}
.gsc-feedback{display:grid;grid-template-columns:24px minmax(0,1fr);gap:10px;align-items:start;margin-top:16px;padding:12px 13px;border-radius:13px;border:1px solid var(--border);font-size:13px;line-height:1.5}
.gsc-feedback p{margin:0}
.gsc-feedback-notice{color:#355E8E;background:rgba(64,115,175,.08);border-color:rgba(64,115,175,.24)}
.gsc-feedback-validation{color:#996214;background:rgba(242,149,39,.08);border-color:rgba(242,149,39,.28)}
.gsc-feedback-success{color:#276A2B;background:rgba(46,125,50,.08);border-color:rgba(46,125,50,.24)}
.gsc-feedback-error{color:#A91E2B;background:rgba(218,33,49,.07);border-color:rgba(218,33,49,.24)}
.gsc-success{display:flex;min-height:390px;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px 12px}
.gsc-successIcon{display:flex;align-items:center;justify-content:center;width:65px;height:65px;border-radius:21px;color:var(--success);background:rgba(46,125,50,.09);border:1px solid rgba(46,125,50,.22)}
.gsc-success h3{margin:18px 0 0;font-size:25px;font-weight:950;letter-spacing:-.025em}
.gsc-success p{max-width:430px;margin:10px 0 20px;color:var(--muted);line-height:1.62}

.gsc-faq{margin-top:34px;padding-top:28px;border-top:1px solid rgba(168,168,168,.42)}
.gsc-faq>h2{font-size:clamp(28px,3vw,40px);line-height:1.12}
.gsc-faqLead{max-width:820px;margin:10px 0 0;color:var(--muted);line-height:1.65}
.gsc-faqGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:20px}
.gsc-faqGrid details{border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.91);padding:13px 14px}
.gsc-faqGrid summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;color:var(--text);font-weight:900;line-height:1.45}
.gsc-faqGrid summary::-webkit-details-marker{display:none}
.gsc-faqGrid summary::before{content:"?";display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex:0 0 28px;border-radius:9px;border:1px solid rgba(48,98,99,.22);background:rgba(48,98,99,.06);color:var(--brand)}
.gsc-faqGrid summary::after{content:"▾";margin-left:auto;color:var(--muted);transition:transform .14s ease}
.gsc-faqGrid details[open] summary::after{transform:rotate(180deg)}
.gsc-faqGrid details p{margin:10px 0 1px;padding-left:38px;color:var(--muted);font-size:14px;line-height:1.65}
.gsc-bottomCta{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-top:18px;padding:22px;border:1px solid transparent;border-radius:19px;background:
  linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.90)) padding-box,
  linear-gradient(135deg,rgba(48,98,99,.55),rgba(255,214,23,.42),rgba(64,115,175,.28)) border-box;box-shadow:var(--shadowSoft)}
.gsc-bottomCta h2{max-width:690px;font-size:27px;line-height:1.14}
.gsc-bottomActions{display:flex;gap:10px;flex-wrap:wrap;flex:0 0 auto}
.gsc-srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}

@media(min-width:992px){
  .gsc-layout{
    grid-template-columns:minmax(0,1.08fr) minmax(380px,480px);
    column-gap:38px;
    row-gap:25px;
    align-items:start;
    grid-template-areas:
      "header header"
      "details form";
  }
  .gsc-copyMobile{display:none}
  .gsc-copyDesktop{display:block}
  .gsc-formArea{position:sticky;top:24px}
}
@media(max-width:760px){
  .gsc-container{padding:0 16px}
  .gsc-contentShell{padding-top:22px}
  .gsc-header h1{font-size:clamp(41px,12vw,54px)}
  .gsc-formCard,.gsc-detailsCard,.gsc-nextCard{padding:20px}
  .gsc-faqGrid{grid-template-columns:1fr}
  .gsc-bottomCta{align-items:flex-start;flex-direction:column}
  .gsc-bottomActions{width:100%}
  .gsc-bottomActions .gsc-button{flex:1 1 180px}
}
@media(max-width:540px){
  .gsc-container{padding:0 12px}
  .gsc-layout{gap:19px}
  .gsc-formCard{padding:17px}
  .gsc-formHeading{flex-direction:column}
  .gsc-formState{white-space:normal;text-align:center}
  .gsc-radioRow{display:grid;grid-template-columns:1fr 1fr}
  .gsc-radioRow label{min-width:0}
  .gsc-topicList article{grid-template-columns:42px minmax(0,1fr);padding:13px}
  .gsc-topicIcon{width:42px;height:42px}
  .gsc-fieldMeta{align-items:flex-start;flex-direction:column}
  .gsc-submitWrap .gsc-button{width:100%}
  .gsc-bottomActions{display:grid;grid-template-columns:1fr}
  .gsc-bottomActions .gsc-button{width:100%}
}
@media(prefers-reduced-motion:reduce){
  .gsc-root *{scroll-behavior:auto!important;transition:none!important;animation-duration:.001ms!important;animation-iteration-count:1!important}
}
`;
