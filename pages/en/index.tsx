// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\en\index.tsx
import Head from "next/head";
import Link from "next/link";
import PenaltyCalculator from "../../src/components/PenaltyCalculator";

export default function HomePage() {
  const ROUTES = {
    startReport: "/check",
    requestDemo: "/en/contact",
    pricing: "/en/pricing",
    howItWorks: "/en/how-it-works",
    complianceData: "/en/compliance-data",
    penaltyCalculator: "/tools/penalty-calculator",
  } as const;

  const schema = buildSchema();

  return (
    <>
      <Head>
        <title>GrandScope | EU CBAM Reporting Software, Annex 5.1 XML</title>
        <meta
          name="description"
          content="Automated EU CBAM reporting: supplier data collection, embedded emissions calculation, and portal-ready Annex 5.1 XML ZIP exports structured to XSD."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.grandscope.ai/en" />
        <meta property="og:title" content="GrandScope | EU CBAM Reporting Software, Annex 5.1 XML" />
        <meta
          property="og:description"
          content="Automated EU CBAM reporting: supplier data collection, embedded emissions calculation, and portal-ready Annex 5.1 XML ZIP exports structured to XSD."
        />
        <meta property="og:url" content="https://www.grandscope.ai/en" />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:image" content="https://www.grandscope.ai/og/cbam.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GrandScope | EU CBAM Reporting Software, Annex 5.1 XML" />
        <meta
          name="twitter:description"
          content="Automated EU CBAM reporting: supplier data collection, embedded emissions calculation, and portal-ready Annex 5.1 XML ZIP exports structured to XSD."
        />
        <meta name="twitter:image" content="https://www.grandscope.ai/og/cbam.png" />
      </Head>

      <main className="gsx-root" aria-label="GrandScope EU CBAM Homepage">
      <style>{styles}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* TOP STRIP: calculator directly under header */}
      <section className="gsx-topStrip" aria-label="CBAM penalty exposure estimator">
      <PenaltyCalculator penaltyCalculatorHref={ROUTES.penaltyCalculator} />
      </section>

      {/* HERO: full-bleed canvas */}
      <section className="gsx-hero" aria-label="EU CBAM reporting software hero">
        <div className="gsx-container">
          <div className="gsx-heroPanel">
            <div className="gsx-heroGrid">
              <div className="gsx-heroCopy">
                <div className="gsx-eyebrow">
                  <span className="gsx-pill">EU CBAM</span>
                  <span className="gsx-muted">Carbon Border Adjustment Mechanism</span>
                  <span className="gsx-sep" aria-hidden="true">
                    |
                  </span>
                  <span className="gsx-muted">Annex 5.1 XML export</span>
                </div>

                <h1 className="gsx-h1">EU CBAM reporting software for Annex 5.1 submissions.</h1>

                <p className="gsx-lead">
                  Collect supplier emissions inputs, calculate embedded emissions, and export a portal-ready ZIP structured to Annex 5.1.
                  Built for importers, freight forwarders, and indirect representatives shipping into the EU.
                </p>

                <div className="gsx-ctaRow" role="group" aria-label="Primary calls to action">
                  <Link className="gsx-btn gsx-btnPrimary" href={ROUTES.startReport}>
                    Start free CBAM report
                  </Link>
                  <Link className="gsx-btn gsx-btnGhost" href={ROUTES.requestDemo}>
                    Request demo
                  </Link>
                  <Link className="gsx-btn gsx-btnText" href={ROUTES.howItWorks}>
                    How it works
                  </Link>
                </div>

                <div className="gsx-facts" aria-label="CBAM reporting facts">
                  <div className="gsx-fact">
                    <div className="gsx-factIcon" aria-hidden="true">
                      {iconClock()}
                    </div>
                    <div>
                      <div className="gsx-factTitle">Timeline</div>
                      <div className="gsx-factText">Transitional phase: 2023 to 2025. Definitive regime starts 1 January 2026.</div>
                    </div>
                  </div>

                  <div className="gsx-fact">
                    <div className="gsx-factIcon" aria-hidden="true">
                      {iconShield()}
                    </div>
                    <div>
                      <div className="gsx-factTitle">Submission format</div>
                      <div className="gsx-factText">Portal upload supports an XML file plus attachments packaged as a ZIP, structured to Annex 5.1 XSD.</div>
                    </div>
                  </div>

                  <div className="gsx-fact">
                    <div className="gsx-factIcon" aria-hidden="true">
                      {iconTarget()}
                    </div>
                    <div>
                      <div className="gsx-factTitle">Built for operations</div>
                      <div className="gsx-factText">Quarterly workflows for supplier intake, audit trail, and export-ready submission packs.</div>
                    </div>
                  </div>
                </div>

                <div className="gsx-links" aria-label="Key internal links">
                  <Link className="gsx-link" href={ROUTES.pricing}>
                    Pricing
                  </Link>
                  <Link className="gsx-link" href={ROUTES.complianceData}>
                    Compliance data
                  </Link>
                  <Link className="gsx-link" href={ROUTES.penaltyCalculator}>
                    Penalty calculator
                  </Link>
                </div>
              </div>

              {/* VIDEO PLACEHOLDER */}
              <aside className="gsx-videoCard" aria-label="Product demo video placeholder">
                <div className="gsx-videoFrame" role="img" aria-label="Video placeholder: product demo">
                  <div className="gsx-videoOverlay">
                    <div className="gsx-play">{iconPlay()}</div>
                    <div className="gsx-videoText">
                      <div className="gsx-videoTitle">Product demo video</div>
                      <div className="gsx-muted">Replace this placeholder with a real video embed.</div>
                    </div>
                  </div>
                </div>

                <div className="gsx-videoMeta">
                  <div className="gsx-videoMetaLeft">
                    <span className="gsx-dot" aria-hidden="true" />
                    <span className="gsx-videoMetaLabel">Demo</span>
                    <span className="gsx-sep" aria-hidden="true">
                      |
                    </span>
                    <span className="gsx-muted">Shipment CSV to Annex 5.1 export</span>
                  </div>
                  <Link className="gsx-miniLink" href={ROUTES.requestDemo}>
                    Request a live walkthrough
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="gsx-section gsx-sectionA" aria-label="Outcomes">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">Make CBAM reporting repeatable.</h2>
              <p className="gsx-sub">
                CBAM execution depends on supplier cooperation, consistent calculations, and correct submission files.
                GrandScope is built for that reality.
              </p>
            </header>

            <div className="gsx-cards3">
              <article className="gsx-card gsx-cardGlow">
                <div className="gsx-cardTop">
                  <div className="gsx-cardIcon" aria-hidden="true">
                    {iconLink()}
                  </div>
                  <div className="gsx-cardTag">Supplier intake</div>
                </div>
                <h3 className="gsx-cardTitle">Supplier emissions data collection</h3>
                <p className="gsx-cardText">Replace email chaos with secure supplier intake and Magic Links. Keep an audit trail for compliance and procurement.</p>
                <div className="gsx-cardMeta">Supplier portal, progress tracking, audit events</div>
              </article>

              <article className="gsx-card gsx-cardGlow">
                <div className="gsx-cardTop">
                  <div className="gsx-cardIcon" aria-hidden="true">
                    {iconCalc()}
                  </div>
                  <div className="gsx-cardTag">Calculation</div>
                </div>
                <h3 className="gsx-cardTitle">Embedded emissions calculation</h3>
                <p className="gsx-cardText">Compute report values consistently and apply controlled default values when suppliers do not reply.</p>
                <div className="gsx-cardMeta">Repeatable methodology, fewer spreadsheet errors</div>
              </article>

              <article className="gsx-card gsx-cardGlow">
                <div className="gsx-cardTop">
                  <div className="gsx-cardIcon" aria-hidden="true">
                    {iconXml()}
                  </div>
                  <div className="gsx-cardTag">Submission</div>
                </div>
                <h3 className="gsx-cardTitle">Annex 5.1 XML ZIP export</h3>
                <p className="gsx-cardText">Generate a portal-ready XML plus attachments packaged as a ZIP and validate structure before submission.</p>
                <div className="gsx-cardMeta">Annex 5.1 structure alignment, reduced rejection risk</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="gsx-section gsx-sectionB" aria-label="How it works">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">How EU CBAM reporting works in GrandScope</h2>
              <p className="gsx-sub">A 3 step pipeline from shipment data to a submission-ready export.</p>
            </header>

            <div className="gsx-steps">
              <div className="gsx-step gsx-stepGlow">
                <div className="gsx-stepNum">01</div>
                <div>
                  <div className="gsx-stepTitle">Import shipments and CN codes</div>
                  <p className="gsx-stepText">Enter CN codes or upload a CSV from your freight system. Group shipments by supplier and reporting period.</p>
                </div>
              </div>

              <div className="gsx-step gsx-stepGlow">
                <div className="gsx-stepNum">02</div>
                <div>
                  <div className="gsx-stepTitle">Collect supplier inputs</div>
                  <p className="gsx-stepText">Send suppliers a secure link to provide emissions and activity data. Track completion and follow up only when needed.</p>
                </div>
              </div>

              <div className="gsx-step gsx-stepGlow">
                <div className="gsx-stepNum">03</div>
                <div>
                  <div className="gsx-stepTitle">Export, validate, and file</div>
                  <p className="gsx-stepText">Generate an Annex 5.1 XML ZIP export and validate structure before submission to reduce last-minute rework.</p>
                </div>
              </div>
            </div>

            <div className="gsx-ctaBand" aria-label="CTA band">
              <div>
                <div className="gsx-ctaBandTitle">Start with one report, scale to your full import book.</div>
                <div className="gsx-muted">Use a free report to test the workflow, then expand to multi-entity operations.</div>
              </div>
              <div className="gsx-ctaBandBtns">
                <Link className="gsx-btn gsx-btnPrimary" href={ROUTES.startReport}>
                  Start free CBAM report
                </Link>
                <Link className="gsx-btn gsx-btnGhost" href={ROUTES.pricing}>
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO ITS FOR */}
      <section className="gsx-section gsx-sectionC" aria-label="Who it is for">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">Who GrandScope is for</h2>
              <p className="gsx-sub">Designed for EU import operations: importers, freight forwarders, and indirect representatives across the EU.</p>
            </header>

            <div className="gsx-split">
              <div className="gsx-card gsx-cardSoft gsx-cardGlow">
                <h3 className="gsx-cardTitle">For importers</h3>
                <p className="gsx-cardText">
                  Run quarterly reporting without chasing dozens of suppliers. Keep documentation aligned with what procurement and auditors demand.
                </p>
                <ul className="gsx-list">
                  <li>Quarterly workflow by shipment and supplier</li>
                  <li>Attachment management and audit trail</li>
                  <li>Consistent data quality controls</li>
                </ul>
              </div>

              <div className="gsx-card gsx-cardSoft gsx-cardGlow">
                <h3 className="gsx-cardTitle">For freight forwarders</h3>
                <p className="gsx-cardText">Standardize CBAM across clients with repeatable intake and reporting. Reduce client escalation and operational drag.</p>
                <ul className="gsx-list">
                  <li>Multi-client workflow</li>
                  <li>Supplier follow-up automation</li>
                  <li>Export packs built for portal upload</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COVERED GOODS */}
      <section className="gsx-section gsx-sectionD" aria-label="Covered goods">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">CBAM covered goods and scope</h2>
              <p className="gsx-sub">
                CBAM initially applies to cement, iron and steel, aluminium, fertilisers, electricity, and hydrogen. Importers must report embedded emissions during the transitional phase.
              </p>
            </header>

            <div className="gsx-badges" role="list" aria-label="Covered goods list">
              {["Cement", "Iron and steel", "Aluminium", "Fertilisers", "Electricity", "Hydrogen"].map((g) => (
                <span key={g} role="listitem" className="gsx-badgeSoft">
                  {g}
                </span>
              ))}
            </div>

            <div className="gsx-split">
              <div className="gsx-card gsx-cardSoft gsx-cardGlow">
                <h3 className="gsx-cardTitle">Common blocker: supplier silence</h3>
                <p className="gsx-cardText">
                  Waiting for suppliers to learn Annex 5.1 kills reporting timelines. Use structured intake and controlled default values to keep filings on schedule.
                </p>
                <Link className="gsx-linkStrong" href={ROUTES.howItWorks}>
                  See how supplier intake works
                </Link>
              </div>

              <div className="gsx-card gsx-cardSoft gsx-cardGlow">
                <h3 className="gsx-cardTitle">Common blocker: invalid portal uploads</h3>
                <p className="gsx-cardText">
                  The portal can reject incorrect structure. Export an Annex 5.1 compliant package and validate before submission to avoid last-minute rework.
                </p>
                <Link className="gsx-linkStrong" href={ROUTES.complianceData}>
                  Learn about submission structure
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPETITOR COMPARISON */}
      <section className="gsx-section gsx-sectionE" aria-label="Competitor comparison">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">GrandScope vs. The Alternatives</h2>
              <p className="gsx-sub">
                A practical comparison for operations teams choosing a repeatable CBAM reporting workflow.
              </p>
            </header>

            <div className="gsx-tableWrap" role="region" aria-label="GrandScope vs. The alternatives comparison table" tabIndex={0}>
              <table className="gsx-compareTable">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">GrandScope</th>
                    <th scope="col">Manual Registry Entry</th>
                    <th scope="col">General ESG Tools</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Output Format</th>
                    <td>Validated XML (XSD Compliant)</td>
                    <td>Manual Typing</td>
                    <td>Generic CSV / PDF</td>
                  </tr>
                  <tr>
                    <th scope="row">Error Checking</th>
                    <td>Pre-submission Validation</td>
                    <td>Post-submission Rejection</td>
                    <td>Limited</td>
                  </tr>
                  <tr>
                    <th scope="row">CN Code Logic</th>
                    <td>Auto-Map &amp; Verify</td>
                    <td>Manual Lookup</td>
                    <td>Manual Lookup</td>
                  </tr>
                  <tr>
                    <th scope="row">Supplier Portal</th>
                    <td>Automated Data Request</td>
                    <td>Email Attachments</td>
                    <td>General Surveys</td>
                  </tr>
                  <tr>
                    <th scope="row">2026 Ready</th>
                    <td>Yes (Certificate Calculation)</td>
                    <td>No</td>
                    <td>Varies</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="gsx-section gsx-sectionE" aria-label="FAQ">
        <div className="gsx-container">
          <div className="gsx-sectionInner">
            <header className="gsx-sectionHead">
              <h2 className="gsx-h2">FAQ: EU CBAM reporting and Annex 5.1</h2>
              <p className="gsx-sub">Direct answers for operations, compliance, and procurement teams.</p>
            </header>

            <div className="gsx-faq">
              <details className="gsx-faqItem">
                <summary>What is EU CBAM and who needs to report?</summary>
                <div className="gsx-faqBody">
                  The Carbon Border Adjustment Mechanism is the EU policy tool that puts a fair price on carbon embedded in certain imported goods. During the transitional phase, importers report embedded emissions for covered goods.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>How do I submit a CBAM report?</summary>
                <div className="gsx-faqBody">
                  Reporting declarants can create reports in the portal or upload an XML file with attachments packaged in a ZIP. The XML is structured according to the Annex 5.1 XSD.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>What penalties apply if reports are missing or incorrect?</summary>
                <div className="gsx-faqBody">
                  Penalties can be between EUR 10 and EUR 50 per tonne of unreported embedded emissions, depending on the competent authority assessment and the case.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>Can I use default values if a supplier does not reply?</summary>
                <div className="gsx-faqBody">
                  GrandScope supports controlled fallback to default values so you can file on time, then replace with supplier specific values as data becomes available.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>What information do I need from suppliers for CBAM reporting?</summary>
                <div className="gsx-faqBody">
                  You typically need supplier activity data and embedded emissions inputs for covered goods, plus supporting documentation where available. When suppliers do not respond in time, controlled default values can keep submissions on schedule.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>What is Annex 5.1 and why does XML validation matter?</summary>
                <div className="gsx-faqBody">
                  Annex 5.1 defines the reporting structure used for portal uploads. If the XML structure does not match the Annex 5.1 XSD, uploads can fail and create last-minute rework. Validation helps catch structural issues before submission.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>How do CN codes affect CBAM scope and reporting?</summary>
                <div className="gsx-faqBody">
                  CN codes determine whether a shipment line is in scope and how it should be categorized for reporting. Incorrect CN mapping can lead to missed covered goods, inconsistent data, and preventable portal errors.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>What documentation should I keep for CBAM audit readiness?</summary>
                <div className="gsx-faqBody">
                  Keep supplier submissions, calculation inputs, default value rationale where used, and any supporting documents associated with your reporting period. A clean audit trail reduces time spent answering internal reviews and competent authority questions.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>What changes when the definitive regime starts on 1 January 2026?</summary>
                <div className="gsx-faqBody">
                  The transitional phase focuses on reporting. From 1 January 2026, requirements expand toward certificate management and financial settlement linked to embedded emissions. Being operationally ready means having repeatable data collection and calculation workflows.
                </div>
              </details>

              <details className="gsx-faqItem">
                <summary>Can freight forwarders or indirect representatives report on behalf of clients?</summary>
                <div className="gsx-faqBody">
                  Many forwarders and indirect representatives support clients with shipment data, supplier follow-up, and preparation of submission packs. The reporting declarant remains responsible for correctness, so standardized intake and validation are key.
                </div>
              </details>
            </div>

            <div className="gsx-finalCta" aria-label="Final call to action">
              <div>
                <div className="gsx-finalTitle">Make CBAM boring.</div>
                <div className="gsx-muted">Predictable reporting beats heroic last-minute compliance every quarter.</div>
              </div>
              <div className="gsx-finalBtns">
                <Link className="gsx-btn gsx-btnPrimary" href={ROUTES.startReport}>
                  Start free CBAM report
                </Link>
                <Link className="gsx-btn gsx-btnGhost" href={ROUTES.requestDemo}>
                  Request demo
                </Link>
              </div>
            </div>

            <div className="gsx-sources" aria-label="Official sources">
              <div className="gsx-sourcesTitle">Official sources</div>
              <ul className="gsx-sourcesList">
                <li>
                  <a className="gsx-sourceLink" href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" target="_blank" rel="noreferrer">
                    European Commission: Carbon Border Adjustment Mechanism overview
                  </a>
                </li>
                <li>
                  <a className="gsx-sourceLink" href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-registry-and-reporting_en" target="_blank" rel="noreferrer">
                    European Commission: CBAM Registry and Reporting documents
                  </a>
                </li>
                <li>
                  <a className="gsx-sourceLink" href="https://eur-lex.europa.eu/" target="_blank" rel="noreferrer">
                    EUR-Lex
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}

/* ---------- Helpers / Icons / Styles ---------- */
function buildSchema() {
  const org = {
    "@type": "Organization",
    name: "GrandScope",
    url: "https://www.grandscope.ai",
  };

  const app = {
    "@type": "SoftwareApplication",
    name: "GrandScope EU CBAM Reporter",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "EU CBAM reporting software that collects supplier inputs, calculates embedded emissions, and exports Annex 5.1 XML ZIP packages structured to XSD.",
    url: "https://www.grandscope.ai/en",
    publisher: org,
  };

  const faq = {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is EU CBAM and who needs to report?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "The Carbon Border Adjustment Mechanism is the EU policy tool that puts a fair price on carbon embedded in certain imported goods. During the transitional phase, importers report embedded emissions for covered goods.",
        },
      },
      {
        "@type": "Question",
        name: "How do I submit a CBAM report?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Reporting declarants can create reports in the portal or upload an XML file with attachments packaged in a ZIP. The XML is structured according to the Annex 5.1 XSD.",
        },
      },
      {
        "@type": "Question",
        name: "What penalties apply for missing or incorrect reports?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Penalties can be between EUR 10 and EUR 50 per tonne of unreported embedded emissions, depending on the competent authority assessment and the case.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use default values if a supplier does not reply?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "GrandScope supports controlled fallback to default values so you can file on time, then replace with supplier specific values as data becomes available.",
        },
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [org, app, faq],
  };
}

/* ---------- Icons ---------- */

function iconPlay() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V6l10 6-10 6Z" fill="currentColor" />
    </svg>
  );
}

function iconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.59 13.41a1 1 0 0 0 1.41 1.41l3.54-3.54a3 3 0 1 0-4.24-4.24l-1.77 1.77"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13.41 10.59a1 1 0 0 0-1.41-1.41L8.46 12.72a3 3 0 1 0 4.24 4.24l1.77-1.77"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconCalc() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconXml() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14l-2 2 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 14l2 2-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 19l2-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 20 6v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 18a6 6 0 1 0-6-6" stroke="currentColor" strokeWidth="2" />
      <path d="M12 14a2 2 0 1 0-2-2" stroke="currentColor" strokeWidth="2" />
      <path d="M22 2 14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Styles ---------- */

const styles = `
.gsx-root{
  /* Palette */
  --brand:#306263;
  --support:#4073AF;
  --highlight:#FFD617;

  --bg:#F5F5F5;
  --bg2:#EBEBEB;

  --surface:#FFFFFF;
  --surface2:#E3E3E3;

  --text:#404040;
  --textMuted:#707070;

  --success:#2E7D32;
  --warning:#F29527;
  --error:#DA2131;

  --border:#CFCFCF;
  --borderStrong:#9F9F9F;

  --shadowSoft: 0 16px 44px rgba(2,6,23,.10);
  --shadowLift: 0 28px 86px rgba(2,6,23,.14);

  color: var(--text);
  background:
    radial-gradient(900px 520px at 12% 0%, rgba(48,98,99,.16), transparent 60%),
    radial-gradient(900px 520px at 78% 6%, rgba(64,115,175,.12), transparent 62%),
    radial-gradient(900px 520px at 50% 0%, rgba(255,214,23,.10), transparent 65%),
    var(--bg);

  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.gsx-container{ max-width: 1140px; margin: 0 auto; padding: 0 16px; }

.gsx-muted{ color: var(--textMuted); }
.gsx-sep{ opacity: .55; }

/* TOP STRIP */
.gsx-topStrip{ padding: 14px 0 22px; position: relative; z-index: 5; }

.gsx-stripCard{
  position: relative;
  border-radius: 20px;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.90)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.55), rgba(255,214,23,.40), rgba(64,115,175,.26)) border-box;
  box-shadow: var(--shadowSoft);
  display:grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 14px;
  padding: 16px;
}

@media (max-width: 980px){ .gsx-stripCard{ grid-template-columns: 1fr; } }

.gsx-stripKicker{
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: rgba(48,98,99,.95);
}

.gsx-stripTitle{ font-size: 18px; font-weight: 900; margin-top: 4px; color: rgba(64,64,64,.98); }

.gsx-stripSub{
  margin-top: 6px;
  color: rgba(112,112,112,.95);
  line-height: 1.55;
  font-size: 13px;
  max-width: 62ch;
}

.gsx-stripRight{
  display:grid;
  grid-template-columns: 1fr 1fr 0.9fr auto;
  gap: 10px;
  align-items:end;
}

@media (max-width: 980px){ .gsx-stripRight{ grid-template-columns: 1fr; align-items: stretch; } }

.gsx-stripField{ display:flex; flex-direction:column; gap: 6px; }

.gsx-stripLabel{ font-size: 12px; font-weight: 700; color: rgba(64,64,64,.92); }

.gsx-input{
  border-radius: 12px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.98);
  padding: 10px 10px;
  color: rgba(64,64,64,.98);
  outline: none;
}

.gsx-input:focus{
  border-color: rgba(48,98,99,.60);
  box-shadow: 0 0 0 3px rgba(48,98,99,.14);
}

.gsx-range{ width: 100%; accent-color: var(--brand); }

.gsx-rangeMeta{ display:flex; align-items:center; justify-content:space-between; font-size: 12px; margin-top: 6px; }
.gsx-rateValue{ font-weight: 900; color: rgba(64,64,64,.98); }

.gsx-stripResult{
  border-radius: 14px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(240px 80px at 12% 30%, rgba(255,214,23,.18), transparent 60%),
    rgba(255,255,255,.94);
  padding: 10px 10px;
  min-width: 180px;
}

@media (max-width: 980px){ .gsx-stripResult{ min-width: 0; } }

.gsx-stripResultLabel{ font-size: 12px; color: rgba(112,112,112,.98); font-weight: 700; }
.gsx-stripResultValue{ margin-top: 4px; font-size: 16px; font-weight: 950; color: rgba(64,64,64,.98); letter-spacing: -0.01em; }

.gsx-stripActions{ display:flex; justify-content:flex-end; align-items:center; padding-right: 4px; }
@media (max-width: 980px){ .gsx-stripActions{ justify-content:flex-start; } }

.gsx-miniLink{
  text-decoration:none;
  font-weight: 800;
  color: rgba(64,115,175,.98);
}

.gsx-miniLink:hover{ text-decoration: underline; color: rgba(64,115,175,1); }

/* HERO */
.gsx-hero{
  position: relative;
  padding: 8px 0 44px;
  margin-top: 0;
  z-index: 0;
}

.gsx-hero::before{
  content:"";
  position:absolute;
  inset: 0 0 0 0;
  z-index: 0;
  background:
    radial-gradient(1200px 620px at 18% 0%, rgba(48,98,99,.26), transparent 60%),
    radial-gradient(980px 600px at 78% 10%, rgba(64,115,175,.18), transparent 58%),
    radial-gradient(920px 600px at 50% 0%, rgba(255,214,23,.20), transparent 62%),
    linear-gradient(180deg, rgba(235,235,235,.65), rgba(245,245,245,0));
  pointer-events:none;
}

.gsx-hero::after{
  content:"";
  position:absolute;
  z-index: 0;
  left:0;
  right:0;
  bottom:-1px;
  height: 150px;
  background: linear-gradient(180deg, rgba(245,245,245,0), var(--bg));
  pointer-events:none;
}

.gsx-heroPanel{
  position: relative;
  z-index: 1;
  border-radius: 26px;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,255,255,.80)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.62), rgba(255,214,23,.42), rgba(64,115,175,.26)) border-box;
  box-shadow:
    0 48px 140px rgba(2,6,23,.20),
    0 40px 120px rgba(48,98,99,.10);
  padding: 22px;
  backdrop-filter: blur(10px);
}

@supports not (backdrop-filter: blur(10px)){ .gsx-heroPanel{ backdrop-filter: none; } }

.gsx-heroGrid{ display:grid; grid-template-columns: 1.05fr .95fr; gap: 20px; align-items:start; }
@media (max-width: 980px){ .gsx-heroGrid{ grid-template-columns: 1fr; } .gsx-heroPanel{ padding: 16px; } }

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

.gsx-h1{ margin: 0 0 12px; font-size: clamp(34px, 4vw, 54px); line-height: 1.04; letter-spacing: -0.02em; font-weight: 950; color: rgba(64,64,64,.98); }

.gsx-lead{ margin: 0 0 18px; font-size: 16px; line-height: 1.75; color: rgba(112,112,112,.98); max-width: 78ch; }

.gsx-ctaRow{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; margin: 12px 0 14px; }

.gsx-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 900;
  text-decoration:none;
  border: 1px solid rgba(207,207,207,.95);
  color: rgba(64,64,64,.98);
  background: rgba(255,255,255,.96);
  box-shadow: 0 1px 0 rgba(2,6,23,.03);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease, filter .12s ease;
}

.gsx-btn:hover{ transform: translateY(-1px); box-shadow: var(--shadowLift); border-color: rgba(159,159,159,.90); }

.gsx-btnPrimary{
  border: 1px solid rgba(48,98,99,.26);
  background:
    linear-gradient(180deg, rgba(48,98,99,1), rgba(48,98,99,.92));
  color: #FFFFFF;
  box-shadow:
    0 22px 64px rgba(48,98,99,.20),
    0 10px 30px rgba(2,6,23,.10);
}

.gsx-btnPrimary:hover{
  filter: brightness(0.98);
  border-color: rgba(48,98,99,.40);
  box-shadow:
    0 28px 86px rgba(48,98,99,.22),
    0 14px 40px rgba(2,6,23,.12);
}

.gsx-btnGhost{
  background:
    radial-gradient(220px 80px at 20% 30%, rgba(255,214,23,.12), transparent 60%),
    rgba(255,255,255,.92);
  border-color: rgba(207,207,207,.95);
}

.gsx-btnText{
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: rgba(64,115,175,.98);
  padding-left: 6px;
  padding-right: 6px;
}

.gsx-btnText:hover{ transform:none; box-shadow:none; color: rgba(64,115,175,1); text-decoration: underline; }

.gsx-facts{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
@media (max-width: 980px){ .gsx-facts{ grid-template-columns: 1fr; } }

.gsx-fact{
  border-radius: 16px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.78);
  padding: 12px;
  display:flex;
  gap: 10px;
  align-items:flex-start;
}

.gsx-factIcon{
  width: 36px;
  height: 36px;
  border-radius: 14px;
  border: 1px solid rgba(48,98,99,.22);
  background: rgba(255,255,255,.96);
  display:flex;
  align-items:center;
  justify-content:center;
  color: rgba(64,64,64,.90);
  box-shadow: 0 12px 30px rgba(48,98,99,.08);
}

.gsx-factTitle{ font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; color: rgba(64,64,64,.92); }
.gsx-factText{ font-size: 13px; line-height: 1.55; color: rgba(112,112,112,.98); }

.gsx-links{ display:flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }

.gsx-link{ text-decoration:none; font-weight: 900; color: rgba(64,115,175,.98); }
.gsx-link:hover{ text-decoration: underline; color: rgba(64,115,175,1); }

/* Video placeholder */
.gsx-videoCard{
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.88);
  box-shadow:
    0 24px 80px rgba(2,6,23,.12),
    0 18px 60px rgba(48,98,99,.08);
  overflow: hidden;
}

.gsx-videoFrame{
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(900px 260px at 20% 20%, rgba(48,98,99,.22), transparent 60%),
    radial-gradient(700px 260px at 80% 30%, rgba(64,115,175,.16), transparent 58%),
    radial-gradient(700px 260px at 50% 10%, rgba(255,214,23,.16), transparent 62%),
    linear-gradient(180deg, rgba(235,235,235,.70), rgba(245,245,245,.02));
}

@supports not (aspect-ratio: 16 / 9){ .gsx-videoFrame{ padding-top: 56.25%; } }

.gsx-videoOverlay{ position:absolute; inset:0; display:flex; align-items:flex-end; gap: 12px; padding: 16px; }

.gsx-play{
  width: 54px;
  height: 54px;
  border-radius: 999px;
  display:flex;
  align-items:center;
  justify-content:center;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(64,64,64,.92);
  color: #fff;
  box-shadow: 0 18px 50px rgba(48,98,99,.14);
}

.gsx-videoText{ flex: 1; min-width: 0; }
.gsx-videoTitle{ font-weight: 950; color: rgba(64,64,64,.98); margin-bottom: 4px; }

.gsx-videoMeta{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(207,207,207,.95);
  flex-wrap: wrap;
}

.gsx-videoMetaLeft{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }

.gsx-dot{
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand), var(--highlight), var(--support));
  box-shadow: 0 0 0 4px rgba(255,214,23,.16);
}

.gsx-videoMetaLabel{ font-weight: 900; color: rgba(64,64,64,.92); }

/* SECTIONS */
.gsx-section{ padding: 24px 0 30px; }

.gsx-sectionInner{
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.94);
  box-shadow: var(--shadowSoft);
  padding: 26px;
}

.gsx-sectionInner::before{
  content:"";
  position:absolute;
  left: 18px;
  right: 18px;
  top: 10px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sectionAccentFrom), var(--sectionAccentMid), var(--sectionAccentTo));
  opacity: .95;
}

@media (max-width: 980px){
  .gsx-sectionInner{ padding: 18px; }
  .gsx-sectionInner::before{ left: 14px; right: 14px; }
}

/* Distinct rails per section, all within palette */
.gsx-sectionA{ --sectionAccentFrom: rgba(48,98,99,.74); --sectionAccentMid: rgba(255,214,23,.50); --sectionAccentTo: rgba(64,115,175,.32); }
.gsx-sectionB{ --sectionAccentFrom: rgba(64,115,175,.58); --sectionAccentMid: rgba(255,214,23,.44); --sectionAccentTo: rgba(48,98,99,.44); }
.gsx-sectionC{ --sectionAccentFrom: rgba(255,214,23,.62); --sectionAccentMid: rgba(48,98,99,.52); --sectionAccentTo: rgba(64,115,175,.34); }
.gsx-sectionD{ --sectionAccentFrom: rgba(48,98,99,.66); --sectionAccentMid: rgba(64,115,175,.46); --sectionAccentTo: rgba(255,214,23,.44); }
.gsx-sectionE{ --sectionAccentFrom: rgba(255,214,23,.58); --sectionAccentMid: rgba(64,115,175,.40); --sectionAccentTo: rgba(48,98,99,.46); }

.gsx-sectionHead{ margin-bottom: 18px; padding-top: 10px; }

.gsx-h2{ margin: 0 0 8px; font-size: 28px; letter-spacing: -0.015em; font-weight: 950; color: rgba(64,64,64,.98); }
.gsx-sub{ margin: 0; color: rgba(112,112,112,.98); line-height: 1.7; max-width: 92ch; }

/* CARDS */
.gsx-cards3{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 980px){ .gsx-cards3{ grid-template-columns: 1fr; } }

.gsx-card{
  border-radius: 18px;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,255,255,.92)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.22), rgba(255,214,23,.20), rgba(64,115,175,.18)) border-box;
  padding: 16px;
  box-shadow: 0 1px 0 rgba(2,6,23,.03);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
}

.gsx-cardSoft{
  background:
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.90)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.18), rgba(255,214,23,.16), rgba(64,115,175,.14)) border-box;
}

.gsx-cardGlow:hover{
  transform: none;
  box-shadow: 0 1px 0 rgba(2,6,23,.03);
  background:
    linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,.94)) padding-box,
    linear-gradient(135deg, rgba(48,98,99,.34), rgba(255,214,23,.28), rgba(64,115,175,.24)) border-box;
}

.gsx-cardTop{ display:flex; align-items:center; justify-content:space-between; gap: 10px; margin-bottom: 10px; }

.gsx-cardIcon{
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(48,98,99,.22);
  background: rgba(255,255,255,.96);
  display:flex;
  align-items:center;
  justify-content:center;
  color: rgba(64,64,64,.90);
  box-shadow: 0 12px 30px rgba(48,98,99,.08);
}

.gsx-cardTag{
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .10em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(160px 44px at 20% 40%, rgba(255,214,23,.20), transparent 60%),
    rgba(235,235,235,.45);
  color: rgba(64,64,64,.92);
}

.gsx-cardTitle{ margin: 0 0 8px; font-size: 16px; font-weight: 950; color: rgba(64,64,64,.98); }
.gsx-cardText{ margin: 0 0 12px; color: rgba(112,112,112,.98); line-height: 1.65; }
.gsx-cardMeta{ font-size: 13px; color: rgba(112,112,112,.98); font-weight: 750; }

/* Steps */
.gsx-steps{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 980px){ .gsx-steps{ grid-template-columns: 1fr; } }

.gsx-step{
  border-radius: 18px;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,255,255,.92)) padding-box,
    linear-gradient(135deg, rgba(64,115,175,.22), rgba(255,214,23,.20), rgba(48,98,99,.20)) border-box;
  padding: 14px;
  display:flex;
  gap: 12px;
  align-items:flex-start;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}

.gsx-stepGlow:hover{
  transform: none;
  box-shadow: 0 1px 0 rgba(2,6,23,.03);
  background:
    linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,.94)) padding-box,
    linear-gradient(135deg, rgba(64,115,175,.30), rgba(255,214,23,.26), rgba(48,98,99,.24)) border-box;
}

.gsx-stepNum{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(180px 60px at 20% 30%, rgba(255,214,23,.20), transparent 62%),
    rgba(255,255,255,.96);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 950;
  color: rgba(64,64,64,.92);
}

.gsx-stepTitle{ font-weight: 950; margin-bottom: 6px; color: rgba(64,64,64,.98); }
.gsx-stepText{ color: rgba(112,112,112,.98); line-height: 1.7; margin: 0; }

/* Split */
.gsx-split{ display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 980px){ .gsx-split{ grid-template-columns: 1fr; } }

.gsx-list{ margin: 0; padding-left: 18px; color: rgba(112,112,112,.98); line-height: 1.7; }

/* CTA band */
.gsx-ctaBand{
  margin-top: 16px;
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(520px 200px at 15% 30%, rgba(48,98,99,.10), transparent 60%),
    radial-gradient(520px 200px at 55% 10%, rgba(255,214,23,.14), transparent 62%),
    rgba(235,235,235,.45);
  padding: 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.gsx-ctaBandTitle{ font-weight: 950; color: rgba(64,64,64,.98); }
.gsx-ctaBandBtns{ display:flex; gap: 10px; flex-wrap: wrap; }

/* Covered goods badges */
.gsx-badges{ display:flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 16px; }

.gsx-badgeSoft{
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(240px 80px at 20% 40%, rgba(255,214,23,.18), transparent 62%),
    rgba(235,235,235,.45);
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 900;
  color: rgba(64,64,64,.92);
  font-size: 13px;
}

.gsx-linkStrong{
  display:inline-block;
  margin-top: 6px;
  text-decoration:none;
  font-weight: 900;
  color: rgba(48,98,99,.98);
}

.gsx-linkStrong:hover{ text-decoration: underline; color: rgba(48,98,99,1); }

/* Comparison table */
.gsx-tableWrap{
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.92);
  overflow-x: auto;
}

.gsx-tableWrap:focus-visible{
  box-shadow: 0 0 0 3px rgba(48,98,99,.14);
}

.gsx-compareTable{
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.gsx-compareTable th,
.gsx-compareTable td{
  padding: 12px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(207,207,207,.75);
}

.gsx-compareTable th + th,
.gsx-compareTable td + td{
  border-left: 1px solid rgba(207,207,207,.55);
}

.gsx-compareTable thead th{
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  font-weight: 950;
  color: rgba(64,64,64,.92);
  background:
    radial-gradient(240px 80px at 20% 40%, rgba(255,214,23,.14), transparent 62%),
    rgba(235,235,235,.45);
}

.gsx-compareTable tbody th{
  font-weight: 900;
  color: rgba(64,64,64,.96);
  background: rgba(255,255,255,.92);
}

.gsx-compareTable tbody td{ color: rgba(112,112,112,.98); }

.gsx-compareTable tbody tr:last-child td,
.gsx-compareTable tbody tr:last-child th{ border-bottom: none; }

.gsx-compareTable thead th:nth-child(2),
.gsx-compareTable tbody td:nth-child(2){
  background:
    radial-gradient(240px 80px at 20% 40%, rgba(48,98,99,.10), transparent 62%),
    rgba(255,255,255,.96);
}

/* FAQ */
.gsx-faq{ display:grid; gap: 10px; }

.gsx-faqItem{
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background: rgba(255,255,255,.92);
  padding: 12px 14px;
}

.gsx-faqItem summary{
  cursor:pointer;
  font-weight: 950;
  list-style: none;
  color: rgba(64,64,64,.98);
  display:flex;
  align-items:center;
  gap: 10px;
}

.gsx-faqItem summary::before{
  content:"?";
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(48,98,99,.22);
  background:
    radial-gradient(160px 44px at 30% 40%, rgba(255,214,23,.20), transparent 60%),
    rgba(255,255,255,.96);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 950;
  color: rgba(64,64,64,.92);
  box-shadow: 0 12px 30px rgba(48,98,99,.08);
  flex: 0 0 28px;
}

.gsx-faqItem summary::after{
  content:"v";
  margin-left:auto;
  font-size: 14px;
  line-height: 1;
  opacity: .65;
  transform: translateY(-1px);
  transition: transform .12s ease, opacity .12s ease;
}

.gsx-faqItem[open] summary::after{
  transform: rotate(180deg);
  opacity: .9;
}

.gsx-faqItem summary:focus-visible{
  box-shadow: 0 0 0 3px rgba(48,98,99,.14);
  border-radius: 12px;
}
.gsx-faqItem summary::-webkit-details-marker{ display:none; }
.gsx-faqBody{ margin-top: 8px; color: rgba(112,112,112,.98); line-height: 1.7; }

.gsx-finalCta{
  margin-top: 16px;
  border-radius: 18px;
  border: 1px solid rgba(207,207,207,.95);
  background:
    radial-gradient(520px 200px at 15% 30%, rgba(255,214,23,.16), transparent 60%),
    radial-gradient(520px 200px at 85% 30%, rgba(64,115,175,.10), transparent 60%),
    rgba(235,235,235,.45);
  padding: 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.gsx-finalTitle{ font-weight: 950; color: rgba(64,64,64,.98); }
.gsx-finalBtns{ display:flex; gap: 10px; flex-wrap: wrap; }

/* Sources */
.gsx-sources{ margin-top: 18px; border-top: 1px solid rgba(207,207,207,.95); padding-top: 14px; }
.gsx-sourcesTitle{ font-weight: 950; margin-bottom: 8px; color: rgba(64,64,64,.98); }

.gsx-sourcesList{ margin: 0; padding-left: 18px; line-height: 1.7; color: rgba(112,112,112,.98); }

.gsx-sourceLink{ color: rgba(64,115,175,.98); text-decoration:none; font-weight: 900; }
.gsx-sourceLink:hover{ text-decoration: underline; color: rgba(64,115,175,1); }
`;

// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\en\index.tsx
