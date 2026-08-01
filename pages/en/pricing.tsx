import Head from "next/head";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "€149",
    cadence: "/month",
    description:
      "For smaller importers building a controlled CBAM reporting process for one legal entity.",
    badge: "Start controlled",
    href: "/check",
    cta: "Start free report",
    featured: false,
    features: [
      "1 legal entity",
      "Up to 25 active suppliers",
      "Shipment and CN code intake",
      "Supplier data requests",
      "Embedded emissions calculations",
      "Controlled default-value workflow",
      "Annex 5.1 XML ZIP export",
      "Core audit trail",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "€399",
    cadence: "/month",
    description:
      "For importers managing repeat reporting cycles, larger supplier networks, and more complex operational reviews.",
    badge: "Most practical",
    href: "/en/contact",
    cta: "Request Professional demo",
    featured: true,
    features: [
      "Everything in Starter",
      "Up to 5 legal entities",
      "Up to 150 active suppliers",
      "Bulk supplier campaigns",
      "Reminder and escalation workflows",
      "Scenario planning",
      "Certificate and exposure forecasting",
      "Advanced validation and reporting flags",
      "Team access and role controls",
      "Priority support",
    ],
  },
  {
    name: "Business",
    price: "€899",
    cadence: "/month",
    description:
      "For larger import groups, representatives, and compliance teams requiring broad coverage and stronger controls.",
    badge: "Scale operations",
    href: "/en/contact",
    cta: "Book Business assessment",
    featured: false,
    features: [
      "Everything in Professional",
      "Up to 20 legal entities",
      "Unlimited active suppliers",
      "Multi-client or multi-entity workflows",
      "Advanced forecasting dashboards",
      "Compliance alerts and risk scoring",
      "Inspector-ready evidence packs",
      "Extended audit and calculation lineage",
      "API-ready data access",
      "Dedicated onboarding",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description:
      "For enterprise groups, customs intermediaries, and regulated operating models with bespoke governance or integrations.",
    badge: "Built to fit",
    href: "/en/contact",
    cta: "Speak to enterprise",
    featured: false,
    features: [
      "Custom entity and supplier limits",
      "Broker and representative operating models",
      "SSO and advanced access controls",
      "Custom integrations",
      "Data migration support",
      "Service-level commitments",
      "Security and procurement review",
      "Custom retention and governance controls",
      "Implementation planning",
      "Named account support",
    ],
  },
] as const;

const comparisonRows = [
  ["Legal entities", "1", "Up to 5", "Up to 20", "Custom"],
  ["Active suppliers", "25", "150", "Unlimited", "Custom"],
  ["Supplier portal", "Included", "Included", "Included", "Included"],
  ["Bulk supplier campaigns", "—", "Included", "Included", "Included"],
  ["Annex 5.1 XML ZIP export", "Included", "Included", "Included", "Included"],
  ["Forecasting", "Basic", "Advanced", "Advanced", "Custom"],
  ["Alerts and risk scoring", "Core", "Advanced", "Advanced", "Custom"],
  ["Audit lineage", "Core", "Advanced", "Inspector-ready", "Custom"],
  ["Team and role controls", "Core", "Advanced", "Advanced", "Custom"],
  ["API and integrations", "—", "—", "API-ready", "Custom"],
  ["Support", "Email", "Priority", "Dedicated onboarding", "Named account"],
] as const;

const faqItems = [
  {
    question: "Can I test GrandScope before subscribing?",
    answer:
      "Yes. You can begin with a free CBAM report to test the core workflow before selecting a paid plan.",
  },
  {
    question: "Which plan is best for a single importer entity?",
    answer:
      "Starter is designed for a single legal entity with a smaller supplier network. Professional becomes the stronger fit when you need bulk supplier campaigns, multiple entities, forecasting, or broader team access.",
  },
  {
    question: "Are supplier portal users charged as seats?",
    answer:
      "No. Supplier contacts use secure data-request links and are not treated as paid internal user seats.",
  },
  {
    question: "Can freight forwarders or indirect representatives use GrandScope?",
    answer:
      "Yes. Business and Enterprise are designed for multi-client, multi-entity, and representative operating models. The exact structure can be confirmed during onboarding.",
  },
  {
    question: "Does every plan include Annex 5.1 XML export?",
    answer:
      "Yes. Every paid plan includes the core Annex 5.1 XML ZIP export workflow. Higher plans add stronger validation, forecasting, governance, and operating controls.",
  },
  {
    question: "Can we change plans as supplier volume grows?",
    answer:
      "Yes. Plans can be upgraded as your supplier count, entity count, reporting complexity, or internal control requirements increase.",
  },
  {
    question: "Is onboarding included?",
    answer:
      "Starter includes self-serve onboarding. Professional includes priority support, Business includes dedicated onboarding, and Enterprise includes implementation planning.",
  },
  {
    question: "Do prices include VAT?",
    answer:
      "Displayed prices exclude VAT and any other applicable taxes unless stated otherwise during checkout or contracting.",
  },
] as const;

export function PricingPage() {
  const schema = buildSchema();

  return (
    <>
      <Head>
        <title>GrandScope Pricing | EU CBAM Reporting Software</title>
        <meta
          name="description"
          content="Choose a GrandScope plan for supplier data collection, embedded emissions calculations, Annex 5.1 XML export, forecasting, audit controls, and multi-entity CBAM operations."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.grandscope.ai/en/pricing" />
        <meta property="og:title" content="GrandScope Pricing | EU CBAM Reporting Software" />
        <meta
          property="og:description"
          content="Pricing for EU CBAM reporting software built for importers, freight forwarders, indirect representatives, and multi-entity compliance teams."
        />
        <meta property="og:url" content="https://www.grandscope.ai/en/pricing" />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:image" content="https://www.grandscope.ai/og/cbam.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GrandScope Pricing | EU CBAM Reporting Software" />
        <meta
          name="twitter:description"
          content="Choose a GrandScope plan for supplier data collection, Annex 5.1 XML export, forecasting, audit controls, and multi-entity CBAM operations."
        />
        <meta name="twitter:image" content="https://www.grandscope.ai/og/cbam.png" />
      </Head>

      <main className="gsp-root" aria-label="GrandScope pricing">
        <style>{styles}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

      <section className="gsp-hero" aria-labelledby="pricing-title">
        <div className="gsp-container">
          <div className="gsp-heroPanel">
            <div className="gsp-eyebrow">
              <span className="gsp-pill">GrandScope pricing</span>
              <span className="gsp-muted">EU CBAM reporting software</span>
            </div>

            <div className="gsp-heroGrid">
              <div>
                <h1 id="pricing-title" className="gsp-h1">
                  Choose the operating level your CBAM workload demands.
                </h1>
                <p className="gsp-lead">
                  Start with one entity and a controlled supplier workflow, then
                  scale into forecasting, multi-entity reporting, advanced audit
                  controls, and enterprise integrations.
                </p>

                <div className="gsp-heroActions">
                  <Link className="gsp-btn gsp-btnPrimary" href="/check">
                    Start free CBAM report
                  </Link>
                  <Link className="gsp-btn gsp-btnGhost" href="/en/contact">
                    Request pricing walkthrough
                  </Link>
                </div>

                <div className="gsp-trustRow" aria-label="Pricing assurances">
                  <span>{iconCheck()} Free report available</span>
                  <span>{iconCheck()} Upgrade as operations grow</span>
                  <span>{iconCheck()} Supplier users are not paid seats</span>
                </div>
              </div>

              <aside className="gsp-heroAside" aria-label="Pricing summary">
                <div className="gsp-asideKicker">Recommended starting point</div>
                <div className="gsp-asideTitle">Professional</div>
                <div className="gsp-asidePrice">
                  €399 <span>/month</span>
                </div>
                <p>
                  Best for importers that need multi-entity reporting, bulk
                  supplier campaigns, stronger validation, and forecasting.
                </p>
                <Link className="gsp-miniLink" href="/en/contact">
                  Review Professional fit
                </Link>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="gsp-section" aria-labelledby="plans-title">
        <div className="gsp-container">
          <header className="gsp-sectionHead">
            <span className="gsp-kicker">Plans</span>
            <h2 id="plans-title" className="gsp-h2">
              Clear limits. No vague compliance bundles.
            </h2>
            <p className="gsp-sub">
              Every paid plan covers the core reporting chain from shipment
              intake and supplier data collection through calculations, audit
              records, and Annex 5.1 export.
            </p>
          </header>

          <div className="gsp-planGrid">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`gsp-planCard ${
                  plan.featured ? "gsp-planFeatured" : ""
                }`}
              >
                <div className="gsp-cardTop">
                  <span className="gsp-cardBadge">{plan.badge}</span>
                  {plan.featured ? (
                    <span className="gsp-recommended">Recommended</span>
                  ) : null}
                </div>

                <h3>{plan.name}</h3>
                <p className="gsp-planDescription">{plan.description}</p>

                <div className="gsp-price">
                  <span>{plan.price}</span>
                  <small>{plan.cadence}</small>
                </div>
                <div className="gsp-taxNote">Excluding applicable VAT</div>

                <Link
                  className={`gsp-btn ${
                    plan.featured ? "gsp-btnPrimary" : "gsp-btnGhost"
                  } gsp-btnFull`}
                  href={plan.href}
                >
                  {plan.cta}
                </Link>

                <ul className="gsp-featureList">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span aria-hidden="true">{iconCheck()}</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gsp-section gsp-sectionSoft" aria-labelledby="included-title">
        <div className="gsp-container">
          <div className="gsp-surface">
            <header className="gsp-sectionHead gsp-sectionHeadCompact">
              <span className="gsp-kicker">Included in every paid plan</span>
              <h2 id="included-title" className="gsp-h2">
                The core CBAM reporting chain stays intact.
              </h2>
            </header>

            <div className="gsp-coreGrid">
              <article>
                <div className="gsp-iconBox">{iconUpload()}</div>
                <h3>Shipment and CN code intake</h3>
                <p>
                  Bring shipment records into a controlled workflow and connect
                  reporting lines to products, suppliers, and reporting periods.
                </p>
              </article>
              <article>
                <div className="gsp-iconBox">{iconLink()}</div>
                <h3>Supplier data collection</h3>
                <p>
                  Send secure supplier requests, capture emissions inputs, and
                  retain supporting evidence without relying on uncontrolled
                  email threads.
                </p>
              </article>
              <article>
                <div className="gsp-iconBox">{iconCalc()}</div>
                <h3>Calculation controls</h3>
                <p>
                  Apply repeatable calculation logic, record defaults where
                  permitted, and preserve the data source behind each result.
                </p>
              </article>
              <article>
                <div className="gsp-iconBox">{iconXml()}</div>
                <h3>Annex 5.1 export</h3>
                <p>
                  Produce a structured XML ZIP workflow designed to reduce
                  manual portal entry and prevent avoidable filing rework.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="gsp-section" aria-labelledby="compare-title">
        <div className="gsp-container">
          <header className="gsp-sectionHead">
            <span className="gsp-kicker">Detailed comparison</span>
            <h2 id="compare-title" className="gsp-h2">
              Match the plan to your operational exposure.
            </h2>
            <p className="gsp-sub">
              Limits are designed around entity count, supplier volume, workflow
              complexity, controls, and the level of implementation support.
            </p>
          </header>

          <div
            className="gsp-tableWrap"
            role="region"
            aria-label="GrandScope plan comparison"
            tabIndex={0}
          >
            <table className="gsp-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Starter</th>
                  <th scope="col">Professional</th>
                  <th scope="col">Business</th>
                  <th scope="col">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row">{row[0]}</th>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                    <td>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="gsp-section gsp-sectionSoft" aria-labelledby="selection-title">
        <div className="gsp-container">
          <div className="gsp-surface">
            <header className="gsp-sectionHead gsp-sectionHeadCompact">
              <span className="gsp-kicker">Plan selection</span>
              <h2 id="selection-title" className="gsp-h2">
                Buy for the workflow you run, not the headcount you have.
              </h2>
            </header>

            <div className="gsp-choiceGrid">
              <article>
                <span>01</span>
                <h3>Choose Starter</h3>
                <p>
                  One entity, modest supplier volume, self-serve setup, and a
                  controlled path to Annex 5.1 output.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>Choose Professional</h3>
                <p>
                  Multiple entities, bulk outreach, forecasting, stronger
                  validation, and broader team involvement.
                </p>
              </article>
              <article>
                <span>03</span>
                <h3>Choose Business or Enterprise</h3>
                <p>
                  Large supplier networks, representative workflows, advanced
                  audit controls, or custom operating requirements.
                </p>
              </article>
            </div>

            <div className="gsp-callout">
              <div>
                <strong>Uncertain which tier fits?</strong>
                <p>
                  We can map your entity count, supplier volume, reporting model,
                  and control requirements to the correct plan.
                </p>
              </div>
              <Link className="gsp-btn gsp-btnPrimary" href="/en/contact">
                Request plan assessment
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="gsp-section" aria-labelledby="faq-title">
        <div className="gsp-container">
          <header className="gsp-sectionHead">
            <span className="gsp-kicker">Pricing FAQ</span>
            <h2 id="faq-title" className="gsp-h2">
              Questions before you commit.
            </h2>
          </header>

          <div className="gsp-faq">
            {faqItems.map((item) => (
              <details key={item.question} className="gsp-faqItem">
                <summary>{item.question}</summary>
                <div>{item.answer}</div>
              </details>
            ))}
          </div>

          <div className="gsp-finalCta">
            <div>
              <span className="gsp-kicker">Start with evidence</span>
              <h2>Run one report before changing your entire process.</h2>
              <p>
                Test GrandScope on a real CBAM workflow, then select the tier
                that matches your operational exposure.
              </p>
            </div>
            <div className="gsp-finalActions">
              <Link className="gsp-btn gsp-btnPrimary" href="/check">
                Start free CBAM report
              </Link>
              <Link className="gsp-btn gsp-btnGhost" href="/en/contact">
                Request demo
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}

export default PricingPage;

function buildSchema() {
  const organization = {
    "@type": "Organization",
    "@id": "https://www.grandscope.ai/#org",
    name: "GrandScope",
    url: "https://www.grandscope.ai",
  };

  const offers = plans.map((plan) => {
    const offer: Record<string, string> = {
      "@type": "Offer",
      name: `GrandScope ${plan.name}`,
      url: "https://www.grandscope.ai/en/pricing",
      priceCurrency: "EUR",
      description: plan.description,
      availability: "https://schema.org/OnlineOnly",
    };

    if (plan.price.startsWith("€")) {
      offer.price = plan.price.replace("€", "");
    }

    return offer;
  });

  const software = {
    "@type": "SoftwareApplication",
    "@id": "https://www.grandscope.ai/en/pricing#app",
    name: "GrandScope EU CBAM Reporter",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.grandscope.ai/en/pricing",
    publisher: { "@id": "https://www.grandscope.ai/#org" },
    offers,
  };

  const faq = {
    "@type": "FAQPage",
    "@id": "https://www.grandscope.ai/en/pricing#faq",
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
    "@graph": [organization, software, faq],
  };
}

function iconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconCalc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8M8 12h2m4 0h2m-8 4h2m4 0h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconXml() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l3 3v15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 3v4h4M9 13l-2 2 2 2m6-4 2 2-2 2m-4 1 2-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = `
.gsp-root{
  --brand:#306263;
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
  --shadow:0 16px 44px rgba(2,6,23,.10);
  --shadowLift:0 28px 86px rgba(2,6,23,.14);

  color:var(--text);
  background:
    radial-gradient(900px 520px at 10% 0%,rgba(48,98,99,.15),transparent 60%),
    radial-gradient(900px 520px at 88% 4%,rgba(64,115,175,.12),transparent 62%),
    radial-gradient(900px 520px at 50% 0%,rgba(255,214,23,.08),transparent 65%),
    var(--bg);
  font-family:inherit;
  -webkit-font-smoothing:antialiased;
  font-synthesis:none;
}

.gsp-root button,.gsp-root input,.gsp-root select,.gsp-root textarea{font:inherit}
.gsp-container{max-width:1180px;margin:0 auto;padding:0 16px}
.gsp-muted{color:var(--muted)}

.gsp-hero{padding:28px 0 42px;position:relative}
.gsp-heroPanel{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.82)) padding-box,
    linear-gradient(135deg,rgba(48,98,99,.62),rgba(255,214,23,.42),rgba(64,115,175,.28)) border-box;
  box-shadow:0 48px 140px rgba(2,6,23,.18),0 40px 120px rgba(48,98,99,.09);
  padding:28px;
}
.gsp-heroPanel::after{
  content:"";
  position:absolute;
  width:420px;
  height:420px;
  border-radius:50%;
  right:-190px;
  top:-230px;
  background:radial-gradient(circle,rgba(255,214,23,.20),rgba(64,115,175,.10) 42%,transparent 70%);
  pointer-events:none;
}
.gsp-eyebrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.gsp-pill,.gsp-kicker{
  font-size:12px;
  font-weight:700;
  letter-spacing:.09em;
  text-transform:uppercase;
}
.gsp-pill{
  padding:7px 11px;
  border-radius:999px;
  border:1px solid rgba(48,98,99,.28);
  background:rgba(255,255,255,.75);
}
.gsp-kicker{color:var(--brand);display:inline-block;margin-bottom:9px}
.gsp-heroGrid{display:grid;grid-template-columns:1.2fr .8fr;gap:24px;align-items:center;position:relative;z-index:1}
.gsp-h1{font-size:clamp(48px,4.4vw,68px);line-height:1.02;letter-spacing:-.035em;margin:0 0 22px;font-weight:700;max-width:850px;text-wrap:balance}
.gsp-lead{font-size:20px;line-height:1.7;color:var(--muted);max-width:760px;margin:0;font-weight:400}
.gsp-heroActions,.gsp-finalActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
.gsp-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:58px;
  padding:14px 22px;
  border-radius:12px;
  border:1px solid var(--border);
  text-decoration:none;
  font-weight:700;
  transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;
}
.gsp-btn:hover{transform:translateY(-1px);box-shadow:var(--shadowLift);border-color:var(--borderStrong)}
.gsp-btnPrimary{background:linear-gradient(180deg,var(--brand),#285556);color:#fff;border-color:rgba(48,98,99,.34)}
.gsp-btnGhost{background:rgba(255,255,255,.94);color:var(--text)}
.gsp-btnFull{width:100%;margin-top:18px}
.gsp-trustRow{display:flex;gap:18px;flex-wrap:wrap;margin-top:18px;color:var(--muted);font-size:13px;font-weight:600}
.gsp-trustRow span{display:flex;align-items:center;gap:6px}
.gsp-trustRow svg{color:var(--success)}
.gsp-heroAside{
  border-radius:22px;
  border:1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(340px 160px at 12% 10%,rgba(255,214,23,.15),transparent 62%),
    rgba(255,255,255,.90);
  padding:28px;
  box-shadow:var(--shadow);
}
.gsp-asideKicker{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--support)}
.gsp-asideTitle{font-size:32px;font-weight:700;margin-top:10px}
.gsp-asidePrice{font-size:58px;font-weight:700;letter-spacing:-.03em;margin-top:4px}
.gsp-asidePrice span{font-size:15px;color:var(--muted);font-weight:500;margin-left:6px}
.gsp-heroAside p{color:var(--muted);line-height:1.65}
.gsp-miniLink{font-weight:700;color:var(--support);text-decoration:none}
.gsp-miniLink:hover{text-decoration:underline}

.gsp-section{padding:34px 0}
.gsp-sectionSoft{background:linear-gradient(180deg,rgba(235,235,235,.45),rgba(245,245,245,.2))}
.gsp-sectionHead{max-width:850px;margin-bottom:20px}
.gsp-sectionHeadCompact{margin-bottom:18px}
.gsp-h2{font-size:clamp(28px,3vw,40px);line-height:1.15;letter-spacing:-.025em;margin:0 0 9px;font-weight:700;text-wrap:balance}
.gsp-sub{margin:0;color:var(--muted);line-height:1.7}
.gsp-planGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}
.gsp-planCard{
  position:relative;
  border-radius:22px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,255,255,.92)) padding-box,
    linear-gradient(135deg,rgba(48,98,99,.22),rgba(255,214,23,.18),rgba(64,115,175,.18)) border-box;
  padding:18px;
  box-shadow:0 1px 0 rgba(2,6,23,.03);
}
.gsp-planFeatured{
  transform:translateY(-8px);
  box-shadow:0 28px 76px rgba(48,98,99,.16);
  background:
    linear-gradient(180deg,rgba(255,255,255,1),rgba(255,255,255,.94)) padding-box,
    linear-gradient(135deg,rgba(48,98,99,.78),rgba(255,214,23,.56),rgba(64,115,175,.42)) border-box;
}
.gsp-cardTop{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}
.gsp-cardBadge,.gsp-recommended{
  border-radius:999px;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.07em;
  padding:6px 9px;
}
.gsp-cardBadge{background:rgba(235,235,235,.72);border:1px solid var(--border)}
.gsp-recommended{background:var(--brand);color:#fff}
.gsp-planCard h3{font-size:24px;margin:16px 0 8px;font-weight:700}
.gsp-planDescription{color:var(--muted);line-height:1.6;min-height:104px;margin:0}
.gsp-price{display:flex;align-items:flex-end;gap:6px;margin-top:18px}
.gsp-price span{font-size:38px;font-weight:700;letter-spacing:-.035em}
.gsp-price small{font-size:13px;color:var(--muted);font-weight:500;padding-bottom:7px}
.gsp-taxNote{font-size:12px;color:var(--muted);margin-top:2px}
.gsp-featureList{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:10px}
.gsp-featureList li{display:flex;gap:8px;align-items:flex-start;color:var(--muted);line-height:1.45;font-size:14px}
.gsp-featureList svg{flex:0 0 16px;color:var(--success);margin-top:2px}

.gsp-surface{
  border-radius:24px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.94);
  box-shadow:var(--shadow);
  padding:24px;
  position:relative;
}
.gsp-surface::before{
  content:"";
  position:absolute;
  left:20px;right:20px;top:10px;height:2px;border-radius:999px;
  background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support));
}
.gsp-coreGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gsp-coreGrid article{
  border-radius:18px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.94);
  padding:16px;
}
.gsp-iconBox{
  width:42px;height:42px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(48,98,99,.22);
  background:rgba(255,255,255,.98);
  color:var(--brand);
}
.gsp-coreGrid h3{margin:13px 0 7px;font-size:17px;font-weight:700}
.gsp-coreGrid p{margin:0;color:var(--muted);line-height:1.65;font-size:14px}

.gsp-tableWrap{overflow-x:auto;border:1px solid var(--border);border-radius:20px;background:#fff}
.gsp-tableWrap:focus-visible{box-shadow:0 0 0 3px rgba(48,98,99,.14)}
.gsp-table{width:100%;border-collapse:collapse;min-width:860px}
.gsp-table th,.gsp-table td{padding:13px 12px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(207,207,207,.72)}
.gsp-table th+th,.gsp-table td+td{border-left:1px solid rgba(207,207,207,.5)}
.gsp-table thead th{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.075em;
  background:rgba(235,235,235,.58);
}
.gsp-table tbody th{font-weight:700}
.gsp-table tbody td{color:var(--muted)}
.gsp-table thead th:nth-child(3),.gsp-table tbody td:nth-child(3){
  background:radial-gradient(230px 80px at 20% 40%,rgba(48,98,99,.08),transparent 65%),rgba(255,255,255,.98);
}
.gsp-table tbody tr:last-child th,.gsp-table tbody tr:last-child td{border-bottom:none}

.gsp-choiceGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.gsp-choiceGrid article{
  border:1px solid var(--border);
  border-radius:18px;
  background:#fff;
  padding:16px;
}
.gsp-choiceGrid article>span{
  width:38px;height:38px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;
  background:radial-gradient(140px 50px at 20% 30%,rgba(255,214,23,.22),transparent 62%),rgba(235,235,235,.5);
  border:1px solid var(--border);
  font-weight:700;
}
.gsp-choiceGrid h3{margin:13px 0 7px;font-weight:700}
.gsp-choiceGrid p{margin:0;color:var(--muted);line-height:1.65}
.gsp-callout{
  margin-top:14px;
  border-radius:18px;
  border:1px solid var(--border);
  background:
    radial-gradient(520px 180px at 12% 30%,rgba(48,98,99,.10),transparent 60%),
    radial-gradient(520px 180px at 70% 10%,rgba(255,214,23,.12),transparent 62%),
    rgba(235,235,235,.44);
  padding:16px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;
}
.gsp-callout strong{font-size:18px;font-weight:700}
.gsp-callout p{margin:5px 0 0;color:var(--muted)}

.gsp-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gsp-faqItem{border:1px solid var(--border);border-radius:17px;background:rgba(255,255,255,.94);padding:13px 14px}
.gsp-faqItem summary{cursor:pointer;font-weight:700;list-style:none;display:flex;align-items:center;gap:10px}
.gsp-faqItem summary::-webkit-details-marker{display:none}
.gsp-faqItem summary::before{
  content:"?";
  width:28px;height:28px;flex:0 0 28px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(48,98,99,.22);
  background:radial-gradient(140px 44px at 20% 30%,rgba(255,214,23,.2),transparent 62%),#fff;
}
.gsp-faqItem summary::after{content:"▾";margin-left:auto;color:var(--muted);transition:transform .12s ease}
.gsp-faqItem[open] summary::after{transform:rotate(180deg)}
.gsp-faqItem>div{color:var(--muted);line-height:1.7;margin-top:10px;padding-left:38px}
.gsp-finalCta{
  margin-top:20px;
  border-radius:24px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.94),rgba(255,255,255,.88)) padding-box,
    linear-gradient(135deg,rgba(48,98,99,.58),rgba(255,214,23,.42),rgba(64,115,175,.28)) border-box;
  padding:28px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  box-shadow:var(--shadow);
}
.gsp-finalCta h2{font-size:30px;margin:0 0 8px;font-weight:700;line-height:1.15}
.gsp-finalCta p{margin:0;color:var(--muted);line-height:1.6}
.gsp-finalActions{margin-top:0;flex:0 0 auto}

@media(max-width:1080px){
  .gsp-planGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gsp-planFeatured{transform:none}
  .gsp-coreGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:820px){
  .gsp-heroGrid{grid-template-columns:1fr}
  .gsp-choiceGrid,.gsp-faq{grid-template-columns:1fr}
  .gsp-callout,.gsp-finalCta{align-items:flex-start;flex-direction:column}
}
@media(max-width:620px){
  .gsp-hero{padding-top:18px}
  .gsp-heroPanel,.gsp-surface{padding:17px}
  .gsp-h1{font-size:38px}
  .gsp-planGrid,.gsp-coreGrid{grid-template-columns:1fr}
  .gsp-planDescription{min-height:0}
  .gsp-btn{width:100%}
  .gsp-trustRow{display:grid;gap:8px}
  .gsp-finalActions{width:100%}
}
`;
