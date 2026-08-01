import Head from "next/head";
import Link from "next/link";

const dataLayers = [
  {
    key: "entity",
    label: "Identity layer",
    title: "Organisation and legal entity",
    description:
      "Keep the importer group, legal entities, EORI records, addresses, users, roles, and country authority metadata attached to the reporting obligation they govern.",
    fields: ["Organisation", "Legal entity", "EORI", "Access boundary"],
  },
  {
    key: "product",
    label: "Scope layer",
    title: "Products and CN codes",
    description:
      "Connect internal product references to CN or HS codes and retain the mapping used to place each shipment line inside the reporting workflow.",
    fields: ["Internal SKU", "CN or HS code", "Scope category", "Mapping status"],
  },
  {
    key: "import",
    label: "Transaction layer",
    title: "Imports and shipment lines",
    description:
      "Record reporting period, quantity, net mass, customs value, country of origin, product, and supplier at import-line level.",
    fields: ["Reporting period", "Net mass", "Customs value", "Origin"],
  },
  {
    key: "supplier",
    label: "Source layer",
    title: "Suppliers and facilities",
    description:
      "Link supplier contacts, countries, facilities, secure request links, submission states, and supporting files to the imports they support.",
    fields: ["Supplier", "Facility", "Request state", "Evidence"],
  },
  {
    key: "calculation",
    label: "Method layer",
    title: "Emissions and calculation context",
    description:
      "Make actual or default source mode visible, normalise units, retain calculation inputs, record formula versions, and expose review flags.",
    fields: ["Source mode", "Input reference", "Formula version", "Output"],
  },
  {
    key: "report",
    label: "Control layer",
    title: "Reports, evidence, and status",
    description:
      "Bring reporting-period checks, filing packs, evidence metadata, alerts, and filing status into the same controlled record.",
    fields: ["Readiness checks", "Filing pack", "Evidence metadata", "Status"],
  },
] as const;

const lineageSteps = [
  {
    number: "01",
    label: "Entity",
    value: "Importer, legal entity, EORI",
    state: "Owned",
  },
  {
    number: "02",
    label: "Import line",
    value: "Product, CN code, mass, value, origin",
    state: "Mapped",
  },
  {
    number: "03",
    label: "Supplier response",
    value: "Facility, emissions inputs, evidence",
    state: "Linked",
  },
  {
    number: "04",
    label: "Calculation",
    value: "Source mode, inputs, formula, result",
    state: "Logged",
  },
  {
    number: "05",
    label: "Reporting record",
    value: "Checks, aggregation, filing status",
    state: "Controlled",
  },
  {
    number: "06",
    label: "Evidence pack",
    value: "Files, purpose, record links, history",
    state: "Reviewable",
  },
] as const;

const reviewQuestions = [
  {
    question: "Which entity owns this obligation?",
    answer: "Organisation, legal entity, EORI, and authority metadata.",
  },
  {
    question: "Which trade record created the reporting line?",
    answer: "Import, product, CN code, quantity, value, origin, and supplier.",
  },
  {
    question: "Where did the emissions input come from?",
    answer: "Supplier submission, facility record, or an explicit default-data path.",
  },
  {
    question: "How was the result produced?",
    answer: "Input reference, input hash, formula version, output, timestamp, and actor.",
  },
  {
    question: "What evidence supports the record?",
    answer: "Files linked by purpose to the supplier, facility, calculation, or report.",
  },
  {
    question: "What happened after review?",
    answer: "Readiness flags and filing states from drafted through accepted or rejected.",
  },
] as const;

const qualityChecks = [
  {
    key: "complete",
    number: "01",
    title: "Completeness",
    description:
      "Identify missing entity, import-line, supplier, emissions, or reporting-period information before export work begins.",
  },
  {
    key: "scope",
    number: "02",
    title: "Scope mapping",
    description:
      "Expose product and CN-code mapping gaps so reporting lines do not move forward with an unresolved classification.",
  },
  {
    key: "source",
    number: "03",
    title: "Source visibility",
    description:
      "Separate supplier-specific information from default-data use and retain the path behind the selected source mode.",
  },
  {
    key: "normalise",
    number: "04",
    title: "Normalisation",
    description:
      "Apply consistent unit, rounding, and missing-value rules before calculation results enter the reporting record.",
  },
  {
    key: "anomaly",
    number: "05",
    title: "Anomaly review",
    description:
      "Surface sanity-check failures, outliers, and supplier submissions that require investigation or correction.",
  },
  {
    key: "evidence",
    number: "06",
    title: "Evidence linkage",
    description:
      "Confirm that supporting files are connected to the record and purpose for which they are being relied upon.",
  },
] as const;

const evidenceRows = [
  {
    file: "supplier-method.pdf",
    purpose: "Supplier emissions method",
    linked: "Submission SUP-0184",
    state: "Verified",
  },
  {
    file: "facility-meter-data.xlsx",
    purpose: "Electricity input",
    linked: "Facility FAC-0074",
    state: "Linked",
  },
  {
    file: "calculation-record.json",
    purpose: "Calculation context",
    linked: "Calculation CAL-00481",
    state: "Recorded",
  },
  {
    file: "reporting-pack.zip",
    purpose: "Structured filing pack",
    linked: "Report RPT-2026-01",
    state: "Exported",
  },
] as const;

const controlCards = [
  {
    key: "boundary",
    title: "Organisation and entity boundaries",
    description:
      "Keep each importer organisation and legal entity inside a defined tenant and ownership structure.",
  },
  {
    key: "role",
    title: "Role-based access",
    description:
      "Scope access by organisation, entity, internal role, and supplier token rather than sharing unrestricted files.",
  },
  {
    key: "events",
    title: "Record and event history",
    description:
      "Retain the actor, timestamp, source, status, and calculation context needed to explain material changes.",
  },
  {
    key: "retention",
    title: "Evidence lifecycle",
    description:
      "Organise evidence with purpose tags, naming standards, record links, and retention controls suited to the operating model.",
  },
] as const;

const reuseCards = [
  {
    key: "reporting",
    title: "Reporting packs",
    description:
      "Use governed import, supplier, emissions, and evidence records to prepare the structured output workflow.",
    tag: "Reporting",
  },
  {
    key: "forecast",
    title: "Exposure dashboards",
    description:
      "Review emissions and cost exposure by product, supplier, and country from the same underlying records.",
    tag: "Planning",
  },
  {
    key: "scenario",
    title: "Scenario comparison",
    description:
      "Compare supplier-specific and default-data positions without creating disconnected calculation copies.",
    tag: "Analysis",
  },
  {
    key: "alerts",
    title: "Alerts and review queues",
    description:
      "Bring missing data, deadlines, evidence gaps, and compliance warnings into the operational workflow.",
    tag: "Control",
  },
] as const;

const faqItems = [
  {
    question: "What information does GrandScope connect for CBAM reporting?",
    answer:
      "The product data model connects organisation and legal-entity records, EORI details, products and CN codes, import transactions, suppliers and facilities, emissions inputs, calculation context, evidence files, reporting periods, and filing status.",
  },
  {
    question: "How are supplier submissions linked to imports?",
    answer:
      "Supplier requests are generated from the importer workflow. The returned supplier and facility information, emissions inputs, evidence, and submission status can be linked to the relevant supplier and import lines rather than stored as a separate email attachment.",
  },
  {
    question: "Can reviewers see whether actual or default data was used?",
    answer:
      "Yes. The calculation model separates actual-data mode from default-data mode and is designed to retain the input source and fallback path used for each result.",
  },
  {
    question: "What is retained behind a calculation result?",
    answer:
      "The calculation record can retain the input reference, input hash, formula version, normalised inputs, output, timestamp, actor, source mode, and any warning or review flag connected to the result.",
  },
  {
    question: "How are evidence files organised?",
    answer:
      "Evidence can be stored with purpose metadata and linked to the supplier, facility, calculation, import line, or reporting record it supports. Naming, retention, and evidence-pack controls can vary by plan and implementation.",
  },
  {
    question: "Can one account manage several legal entities?",
    answer:
      "The operating model supports an importer organisation with legal entities underneath it, entity-level EORI records, role-based access, and defined tenant boundaries. Entity limits depend on the selected plan.",
  },
  {
    question: "Does the compliance-data page replace legal or customs advice?",
    answer:
      "No. GrandScope structures the operational data, workflow controls, and evidence trail used in CBAM reporting. The reporting declarant remains responsible for the accuracy and appropriateness of the information submitted.",
  },
  {
    question: "Are forecasting, advanced alerts, and inspector-ready packs included in every plan?",
    answer:
      "No. Core data handling is part of the reporting workflow, while advanced forecasting, alerts, governance, evidence packs, and integration controls can vary by plan and implementation.",
  },
] as const;

export default function ComplianceDataPage() {
  const schema = buildSchema();

  return (
    <>
      <Head>
        <title>CBAM Compliance Data and Audit Trail | GrandScope</title>
        <meta
          name="description"
          content="See how GrandScope connects legal entities, CN codes, imports, suppliers, emissions inputs, calculation records, evidence, validation, and filing status in one traceable CBAM data model."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.grandscope.ai/en/compliance-data" />
        <meta
          property="og:title"
          content="CBAM Compliance Data and Audit Trail | GrandScope"
        />
        <meta
          property="og:description"
          content="A connected CBAM compliance record from entity and import data through supplier evidence, calculation context, validation, and filing status."
        />
        <meta property="og:url" content="https://www.grandscope.ai/en/compliance-data" />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:image" content="https://www.grandscope.ai/og/cbam.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="CBAM Compliance Data and Audit Trail | GrandScope"
        />
        <meta
          name="twitter:description"
          content="Connect CBAM source data, calculation context, evidence, controls, and reporting status in one traceable operating record."
        />
        <meta name="twitter:image" content="https://www.grandscope.ai/og/cbam.png" />
      </Head>

      <main className="gscd-root" aria-label="GrandScope compliance and data">
        <style>{styles}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <section className="gscd-hero" aria-labelledby="compliance-data-title">
          <div className="gscd-container">
            <div className="gscd-heroPanel">
              <div className="gscd-heroGrid">
                <div className="gscd-heroCopy">
                  <div className="gscd-eyebrow">
                    <span className="gscd-pill">Compliance &amp; Data</span>
                    <span>EU CBAM operating record</span>
                  </div>

                  <h1 id="compliance-data-title" className="gscd-h1">
                    Turn every CBAM number into a traceable compliance record.
                  </h1>

                  <p className="gscd-lead">
                    GrandScope links entity, shipment, CN code, supplier, facility,
                    emissions method, evidence, calculation, and filing status so a
                    reviewer can follow the record without rebuilding it from
                    spreadsheets and inboxes.
                  </p>

                  <div className="gscd-actions">
                    <Link className="gscd-btn gscd-btnPrimary" href="/check">
                      Start free CBAM report
                    </Link>
                    <Link className="gscd-btn gscd-btnGhost" href="/en/contact">
                      Request data walkthrough
                    </Link>
                    <Link className="gscd-textLink" href="/en/how-it-works">
                      See the workflow {iconArrow()}
                    </Link>
                  </div>

                  <div className="gscd-trust" aria-label="Compliance data controls">
                    <span>{iconCheck()} Entity-separated ownership</span>
                    <span>{iconCheck()} Source mode visible</span>
                    <span>{iconCheck()} Evidence linked to records</span>
                  </div>
                </div>

                <aside className="gscd-record" aria-label="Illustrative compliance record">
                  <div className="gscd-recordTop">
                    <div>
                      <span className="gscd-kicker">Illustrative record</span>
                      <strong>Import-line compliance view</strong>
                    </div>
                    <span className="gscd-status"><i /> Reviewable</span>
                  </div>

                  <div className="gscd-recordPath" aria-label="Record lineage">
                    <span>Entity</span>
                    {iconMiniArrow()}
                    <span>Import</span>
                    {iconMiniArrow()}
                    <span>Supplier</span>
                    {iconMiniArrow()}
                    <span>Calculation</span>
                  </div>

                  <dl className="gscd-recordList">
                    <div>
                      <dt>Import line</dt>
                      <dd className="gscd-code">IMP-2026-00481</dd>
                    </div>
                    <div>
                      <dt>Entity</dt>
                      <dd>EU Importer Entity 01</dd>
                    </div>
                    <div>
                      <dt>CN code</dt>
                      <dd className="gscd-code">7208 51 20</dd>
                    </div>
                    <div>
                      <dt>Supplier source</dt>
                      <dd>Submission SUP-0184</dd>
                    </div>
                    <div>
                      <dt>Data mode</dt>
                      <dd><span className="gscd-dataTag">Actual</span></dd>
                    </div>
                    <div>
                      <dt>Formula version</dt>
                      <dd className="gscd-code">CBAM-CALC-1.4</dd>
                    </div>
                    <div>
                      <dt>Output</dt>
                      <dd>2.418 tCO2e</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>3 linked files</dd>
                    </div>
                  </dl>

                  <div className="gscd-recordFoot">
                    {iconInfo()}
                    Example values are illustrative. The panel shows the record
                    structure, not a live customer record.
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section" aria-labelledby="data-model-title">
          <div className="gscd-container">
            <header className="gscd-sectionHead">
              <span className="gscd-kicker">The data model</span>
              <h2 id="data-model-title" className="gscd-h2">
                Six connected records. One reporting source of truth.
              </h2>
              <p className="gscd-sub">
                Each layer carries the context required by the next. The product
                record is built around traceable relationships, not isolated files.
              </p>
            </header>

            <div className="gscd-layerGrid">
              {dataLayers.map((layer, index) => (
                <article className="gscd-layerCard" key={layer.key}>
                  <div className="gscd-layerTop">
                    <span className="gscd-layerIcon">
                      {renderLayerIcon(layer.key)}
                    </span>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </div>
                  <span className="gscd-layerLabel">{layer.label}</span>
                  <h3>{layer.title}</h3>
                  <p>{layer.description}</p>
                  <div className="gscd-fieldList" aria-label={`${layer.title} fields`}>
                    {layer.fields.map((field) => (
                      <span key={field}>{field}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gscd-section gscd-sectionSoft" aria-labelledby="lineage-title">
          <div className="gscd-container">
            <div className="gscd-surface">
              <header className="gscd-sectionHead gscd-sectionHeadCompact">
                <span className="gscd-kicker">Record lineage</span>
                <h2 id="lineage-title" className="gscd-h2">
                  Follow the record from customs data to filing pack.
                </h2>
                <p className="gscd-sub">
                  A reviewer should be able to move backwards from the report result
                  to the import line, supplier response, calculation context, and
                  supporting evidence.
                </p>
              </header>

              <div className="gscd-lineageTrack" aria-label="Compliance data lineage">
                {lineageSteps.map((step, index) => (
                  <div className="gscd-lineageUnit" key={step.number}>
                    <article>
                      <div className="gscd-lineageNumber">{step.number}</div>
                      <span>{step.label}</span>
                      <strong>{step.value}</strong>
                      <b>{step.state}</b>
                    </article>
                    {index < lineageSteps.length - 1 ? (
                      <div className="gscd-lineageArrow" aria-hidden="true">
                        {iconArrow()}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="gscd-reviewGrid">
                <div className="gscd-reviewIntro">
                  <span className="gscd-kicker">Reviewer questions</span>
                  <h3>The answer should live inside the record.</h3>
                  <p>
                    The value of compliance data is not the number of fields stored.
                    It is the speed with which a preparer, reviewer, auditor, or
                    authority can understand where a result came from.
                  </p>
                </div>

                <div className="gscd-questionList">
                  {reviewQuestions.map((item, index) => (
                    <article key={item.question}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{item.question}</strong>
                        <p>{item.answer}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section" aria-labelledby="quality-title">
          <div className="gscd-container">
            <header className="gscd-sectionHead">
              <span className="gscd-kicker">Data-quality gates</span>
              <h2 id="quality-title" className="gscd-h2">
                Stop weak data before it reaches the export.
              </h2>
              <p className="gscd-sub">
                Quality controls bring missing information, unresolved mappings,
                source-mode gaps, and anomalies into view before they become filing
                rework.
              </p>
            </header>

            <div className="gscd-qualityLayout">
              <div className="gscd-checkGrid">
                {qualityChecks.map((check) => (
                  <article key={check.key}>
                    <span className="gscd-checkIcon">
                      {renderQualityIcon(check.key)}
                    </span>
                    <b>{check.number}</b>
                    <h3>{check.title}</h3>
                    <p>{check.description}</p>
                  </article>
                ))}
              </div>

              <aside className="gscd-readiness" aria-label="Illustrative reporting readiness panel">
                <div className="gscd-readinessHead">
                  <div>
                    <span className="gscd-kicker">Illustrative readiness</span>
                    <strong>Reporting period review</strong>
                  </div>
                  <span className="gscd-readinessScore">96%</span>
                </div>

                <div className="gscd-progress" aria-hidden="true">
                  <span />
                </div>

                <div className="gscd-readinessStats">
                  <div>
                    <span>Import lines</span>
                    <strong>128</strong>
                  </div>
                  <div>
                    <span>Ready</span>
                    <strong>123</strong>
                  </div>
                  <div>
                    <span>Action required</span>
                    <strong>5</strong>
                  </div>
                </div>

                <div className="gscd-issueList">
                  <div>
                    <span className="gscd-issueIcon is-warning">!</span>
                    <div>
                      <strong>3 supplier records incomplete</strong>
                      <small>Missing facility or emissions input</small>
                    </div>
                    <b>Review</b>
                  </div>
                  <div>
                    <span className="gscd-issueIcon is-blue">?</span>
                    <div>
                      <strong>2 anomaly flags open</strong>
                      <small>Value outside expected review range</small>
                    </div>
                    <b>Inspect</b>
                  </div>
                  <div>
                    <span className="gscd-issueIcon is-clear">✓</span>
                    <div>
                      <strong>No structural blocker shown</strong>
                      <small>Output gate can proceed after review</small>
                    </div>
                    <b>Clear</b>
                  </div>
                </div>

                <div className="gscd-readinessFoot">
                  Illustrative values. Actual checks depend on the configured
                  reporting workflow and available data.
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="gscd-section gscd-sectionSoft" aria-labelledby="source-mode-title">
          <div className="gscd-container">
            <div className="gscd-sourceSurface">
              <div className="gscd-sourceIntro">
                <span className="gscd-kicker">Source-mode control</span>
                <h2 id="source-mode-title" className="gscd-h2">
                  Make the data source explicit.
                </h2>
                <p>
                  A calculation is easier to review when the workflow clearly
                  distinguishes supplier-specific information from a default-data
                  path and retains the reason behind the selected mode.
                </p>

                <div className="gscd-sourceRule">
                  {iconSwitch()}
                  <div>
                    <strong>Source mode stays attached to the result</strong>
                    <span>
                      Reviewers can see the input reference and whether the record
                      was calculated from accepted supplier data or an explicit
                      fallback path.
                    </span>
                  </div>
                </div>
              </div>

              <div className="gscd-modeGrid">
                <article className="gscd-modeCard is-actual">
                  <div className="gscd-modeTop">
                    <span>{iconSupplier()}</span>
                    <b>Actual data</b>
                  </div>
                  <h3>Supplier or facility inputs</h3>
                  <p>
                    Use accepted information supplied for the relevant facility,
                    product, or reporting line and retain the submission that
                    supports it.
                  </p>
                  <ul>
                    <li>{iconCheck()} Supplier submission reference</li>
                    <li>{iconCheck()} Facility and evidence links</li>
                    <li>{iconCheck()} Review and acceptance status</li>
                  </ul>
                </article>

                <article className="gscd-modeCard is-default">
                  <div className="gscd-modeTop">
                    <span>{iconFallback()}</span>
                    <b>Default data</b>
                  </div>
                  <h3>Explicit fallback record</h3>
                  <p>
                    Record the fallback source separately when supplier-specific
                    information is unavailable, then keep the mode visible during
                    review and reporting.
                  </p>
                  <ul>
                    <li>{iconCheck()} Fallback reason retained</li>
                    <li>{iconCheck()} Default source identified</li>
                    <li>{iconCheck()} Replacement path remains visible</li>
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section" aria-labelledby="calculation-title">
          <div className="gscd-container">
            <div className="gscd-ledgerLayout">
              <div className="gscd-ledgerCopy">
                <span className="gscd-kicker">Calculation ledger</span>
                <h2 id="calculation-title" className="gscd-h2">
                  A result that can be reconstructed.
                </h2>
                <p>
                  The calculation record is designed to retain the references and
                  control information needed to explain how an emissions output was
                  produced.
                </p>

                <div className="gscd-ledgerBenefits">
                  <article>
                    <span>{iconHash()}</span>
                    <div>
                      <strong>Input identity</strong>
                      <p>Reference and hash for the data used.</p>
                    </div>
                  </article>
                  <article>
                    <span>{iconVersion()}</span>
                    <div>
                      <strong>Method identity</strong>
                      <p>Formula version and source mode retained.</p>
                    </div>
                  </article>
                  <article>
                    <span>{iconClock()}</span>
                    <div>
                      <strong>Event identity</strong>
                      <p>Timestamp, actor, output, and flags recorded.</p>
                    </div>
                  </article>
                </div>
              </div>

              <div className="gscd-ledger" role="region" aria-label="Illustrative calculation record" tabIndex={0}>
                <div className="gscd-ledgerBar">
                  <span>{iconCalculate()} Calculation CAL-00481</span>
                  <b>Reviewable</b>
                </div>
                <dl>
                  <div>
                    <dt>Import line</dt>
                    <dd className="gscd-code">IMP-2026-00481</dd>
                  </div>
                  <div>
                    <dt>Data source</dt>
                    <dd><span className="gscd-dataTag">Actual</span></dd>
                  </div>
                  <div>
                    <dt>Input reference</dt>
                    <dd>Supplier submission SUP-0184</dd>
                  </div>
                  <div>
                    <dt>Input hash</dt>
                    <dd className="gscd-code">7f9c...3a21</dd>
                  </div>
                  <div>
                    <dt>Formula version</dt>
                    <dd className="gscd-code">CBAM-CALC-1.4</dd>
                  </div>
                  <div>
                    <dt>Normalised input</dt>
                    <dd className="gscd-code">2,600 kg product mass</dd>
                  </div>
                  <div>
                    <dt>Output</dt>
                    <dd className="gscd-outputValue">2.418 tCO2e</dd>
                  </div>
                  <div>
                    <dt>Recorded</dt>
                    <dd>Timestamp and actor retained</dd>
                  </div>
                  <div>
                    <dt>Review flags</dt>
                    <dd><span className="gscd-clearTag">No unresolved flag</span></dd>
                  </div>
                </dl>
                <div className="gscd-ledgerFoot">
                  {iconInfo()} Illustrative record structure and values.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section gscd-sectionSoft" aria-labelledby="evidence-title">
          <div className="gscd-container">
            <div className="gscd-surface">
              <header className="gscd-sectionHead gscd-sectionHeadCompact">
                <span className="gscd-kicker">Evidence and audit context</span>
                <h2 id="evidence-title" className="gscd-h2">
                  Keep evidence attached to the record that used it.
                </h2>
                <p className="gscd-sub">
                  Files become more useful when their purpose, linked record, review
                  state, and place in the reporting chain are visible.
                </p>
              </header>

              <div className="gscd-evidenceLayout">
                <div className="gscd-tableWrap" role="region" aria-label="Illustrative evidence manifest" tabIndex={0}>
                  <table className="gscd-table">
                    <thead>
                      <tr>
                        <th scope="col">File</th>
                        <th scope="col">Purpose</th>
                        <th scope="col">Linked record</th>
                        <th scope="col">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceRows.map((row) => (
                        <tr key={row.file}>
                          <th scope="row">
                            <span className="gscd-fileCell">
                              {iconFile()} {row.file}
                            </span>
                          </th>
                          <td>{row.purpose}</td>
                          <td className="gscd-code">{row.linked}</td>
                          <td><span className="gscd-stateTag">{row.state}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="gscd-tableNote">
                    Illustrative evidence manifest. File formats, metadata, and
                    retention rules depend on the configured operating model.
                  </div>
                </div>

                <aside className="gscd-evidenceAside">
                  <div className="gscd-evidenceIcon">{iconShield()}</div>
                  <h3>Evidence pack lineage</h3>
                  <p>
                    The data model can connect the import, supplier submission,
                    calculation, report, and supporting files into a reviewable
                    evidence pack.
                  </p>
                  <div className="gscd-miniTrail">
                    <span>Import</span>
                    <i />
                    <span>Submission</span>
                    <i />
                    <span>Calculation</span>
                    <i />
                    <span>Report</span>
                  </div>
                  <ul>
                    <li>{iconCheck()} Purpose and naming metadata</li>
                    <li>{iconCheck()} Record and event relationships</li>
                    <li>{iconCheck()} Review state and filing context</li>
                  </ul>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section" aria-labelledby="governance-title">
          <div className="gscd-container">
            <header className="gscd-sectionHead">
              <span className="gscd-kicker">Governance and access</span>
              <h2 id="governance-title" className="gscd-h2">
                Data controls scale with the operating model.
              </h2>
              <p className="gscd-sub">
                The compliance record sits inside organisation, entity, access, and
                evidence controls rather than a shared folder with no ownership.
              </p>
            </header>

            <div className="gscd-controlGrid">
              {controlCards.map((card) => (
                <article key={card.key}>
                  <span className="gscd-controlIcon">
                    {renderControlIcon(card.key)}
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>

            <div className="gscd-accessMap">
              <div className="gscd-accessCopy">
                <span className="gscd-kicker">Access path</span>
                <h3>Internal users and suppliers do not need the same doorway.</h3>
                <p>
                  Internal access can be scoped through the authenticated importer
                  workspace. Supplier contacts can use secure token-based requests
                  limited to the context required for their submission.
                </p>
              </div>

              <div className="gscd-accessFlow" aria-label="Illustrative access paths">
                <div className="gscd-accessNode is-org">
                  <span>{iconEntity()}</span>
                  <strong>Importer organisation</strong>
                  <small>Legal entities and users</small>
                </div>
                <div className="gscd-accessLines" aria-hidden="true">
                  <i />
                  <i />
                </div>
                <div className="gscd-accessBranches">
                  <div className="gscd-accessNode">
                    <span>{iconUser()}</span>
                    <strong>Authenticated user</strong>
                    <small>Role and entity scope</small>
                  </div>
                  <div className="gscd-accessNode">
                    <span>{iconLink()}</span>
                    <strong>Supplier token</strong>
                    <small>Request-specific context</small>
                  </div>
                </div>
              </div>
            </div>

            <p className="gscd-availabilityNote">
              Advanced governance, retention, audit-pack, alerting, and integration
              controls can vary by plan and implementation.
            </p>
          </div>
        </section>

        <section className="gscd-section gscd-sectionSoft" aria-labelledby="reuse-title">
          <div className="gscd-container">
            <div className="gscd-reuseSurface">
              <header className="gscd-sectionHead gscd-sectionHeadCompact">
                <span className="gscd-kicker">One governed dataset</span>
                <h2 id="reuse-title" className="gscd-h2">
                  Use the same reporting data for planning, alerts, and evidence.
                </h2>
                <p className="gscd-sub">
                  The connected record can support the operational views needed by
                  compliance, procurement, finance, and management without creating
                  a second source of truth.
                </p>
              </header>

              <div className="gscd-reuseGrid">
                {reuseCards.map((card) => (
                  <article key={card.key}>
                    <div className="gscd-reuseTop">
                      <span>{renderReuseIcon(card.key)}</span>
                      <b>{card.tag}</b>
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    <div className={`gscd-reuseVisual is-${card.key}`} aria-hidden="true">
                      {renderReuseVisual(card.key)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="gscd-section" aria-labelledby="faq-title">
          <div className="gscd-container">
            <header className="gscd-sectionHead">
              <span className="gscd-kicker">Compliance data FAQ</span>
              <h2 id="faq-title" className="gscd-h2">
                Practical questions about the record behind the report.
              </h2>
            </header>

            <div className="gscd-faq">
              {faqItems.map((item) => (
                <details className="gscd-faqItem" key={item.question}>
                  <summary>{item.question}</summary>
                  <div>{item.answer}</div>
                </details>
              ))}
            </div>

            <div className="gscd-finalCta">
              <div>
                <span className="gscd-kicker">Start with one reporting record</span>
                <h2>See whether the data chain works on a real CBAM workflow.</h2>
                <p>
                  Test the journey from import data and supplier inputs through
                  calculation context, evidence, and reporting output.
                </p>
              </div>
              <div className="gscd-finalActions">
                <Link className="gscd-btn gscd-btnPrimary" href="/check">
                  Start free CBAM report
                </Link>
                <Link className="gscd-btn gscd-btnGhost" href="/en/contact">
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

function buildSchema() {
  const webpage = {
    "@type": "WebPage",
    "@id": "https://www.grandscope.ai/en/compliance-data#webpage",
    url: "https://www.grandscope.ai/en/compliance-data",
    name: "CBAM Compliance Data and Audit Trail",
    description:
      "How GrandScope connects legal entities, CN codes, imports, supplier submissions, emissions inputs, calculation context, evidence, validation, and filing status.",
    isPartOf: {
      "@id": "https://www.grandscope.ai/#website",
    },
    about: {
      "@id": "https://www.grandscope.ai/en/compliance-data#software",
    },
  };

  const software = {
    "@type": "SoftwareApplication",
    "@id": "https://www.grandscope.ai/en/compliance-data#software",
    name: "GrandScope EU CBAM Reporter",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.grandscope.ai/en/compliance-data",
    publisher: {
      "@type": "Organization",
      "@id": "https://www.grandscope.ai/#org",
      name: "GrandScope",
      url: "https://www.grandscope.ai",
    },
    featureList: [
      "Organisation and legal entity records",
      "EORI, product, and CN code mapping",
      "Import transaction and import-line data",
      "Supplier and facility submissions",
      "Actual and default data source visibility",
      "Calculation context and formula versioning",
      "Evidence metadata and record linkage",
      "Reporting readiness and filing status",
    ],
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": "https://www.grandscope.ai/en/compliance-data#breadcrumb",
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
        name: "Compliance & Data",
        item: "https://www.grandscope.ai/en/compliance-data",
      },
    ],
  };

  const faq = {
    "@type": "FAQPage",
    "@id": "https://www.grandscope.ai/en/compliance-data#faq",
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
    "@graph": [webpage, software, breadcrumb, faq],
  };
}

function renderLayerIcon(key: string) {
  switch (key) {
    case "entity":
      return iconEntity();
    case "product":
      return iconTag();
    case "import":
      return iconUpload();
    case "supplier":
      return iconSupplier();
    case "calculation":
      return iconCalculate();
    case "report":
      return iconFile();
    default:
      return iconCheck();
  }
}

function renderQualityIcon(key: string) {
  switch (key) {
    case "complete":
      return iconChecklist();
    case "scope":
      return iconTag();
    case "source":
      return iconSwitch();
    case "normalise":
      return iconAdjust();
    case "anomaly":
      return iconAlert();
    case "evidence":
      return iconEvidence();
    default:
      return iconCheck();
  }
}

function renderControlIcon(key: string) {
  switch (key) {
    case "boundary":
      return iconBoundary();
    case "role":
      return iconUser();
    case "events":
      return iconClock();
    case "retention":
      return iconArchive();
    default:
      return iconShield();
  }
}

function renderReuseIcon(key: string) {
  switch (key) {
    case "reporting":
      return iconFile();
    case "forecast":
      return iconForecast();
    case "scenario":
      return iconSwitch();
    case "alerts":
      return iconAlert();
    default:
      return iconDashboard();
  }
}

function renderReuseVisual(key: string) {
  switch (key) {
    case "reporting":
      return (
        <>
          <span className="gscd-docLine is-long" />
          <span className="gscd-docLine" />
          <span className="gscd-docLine is-mid" />
          <i className="gscd-docCheck">✓</i>
        </>
      );
    case "forecast":
      return (
        <>
          <span style={{ height: "34%" }} />
          <span style={{ height: "56%" }} />
          <span style={{ height: "72%" }} />
          <span style={{ height: "88%" }} />
        </>
      );
    case "scenario":
      return (
        <>
          <div><i /><span>Actual</span></div>
          <div><i /><span>Default</span></div>
        </>
      );
    case "alerts":
      return (
        <>
          <strong>Action required</strong>
          <span>Supplier evidence incomplete</span>
        </>
      );
    default:
      return null;
  }
}

function iconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconMiniArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconInfo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconEntity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21V7l8-4 8 4v14M8 21v-4h8v4M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconTag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function iconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconSupplier() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 7h5m-2.5-2.5V9.5M17 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconCalculate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8M8 12h2m4 0h2m-8 4h2m4 0h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconFile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconChecklist() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5h11M9 12h11M9 19h11M3.5 5.5l1.5 1.5 2.5-3M3.5 12.5 5 14l2.5-3M3.5 19.5 5 21l2.5-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconSwitch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h13m0 0-3-3m3 3-3 3M20 17H7m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconAdjust() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h7M15 7h5M4 17h5m4 0h7M11 4v6M9 14v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="11" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function iconAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconEvidence() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconFallback() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h9a5 5 0 0 1 0 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8 13-4 4 4 4M19 3v6M16 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconHash() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconVersion() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconClock() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.6 2.8 8.4 7 10 4.2-1.6 7-5.4 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconBoundary() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function iconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconArchive() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16v14H4V7ZM3 3h18v4H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconLink() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2A5 5 0 0 0 12 4l-1.15 1.15M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function iconForecast() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7h3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const styles = `
.gscd-root{
  --brand:#396B6C;
  --brandDark:#315D5E;
  --support:#3F75B5;
  --highlight:#FFD817;
  --bg:#F3F4F3;
  --soft:#E9ECEB;
  --surface:#FFFFFF;
  --text:#404040;
  --muted:#737373;
  --border:#CDD2D1;
  --borderStrong:#9FAEAC;
  --success:#2F7D36;
  --warning:#9A6B00;
  --danger:#A3483E;
  --shadow:0 18px 48px rgba(22,35,37,.10);
  --shadowLift:0 30px 90px rgba(22,35,37,.16);

  color:var(--text);
  background:
    radial-gradient(900px 520px at 6% 0%,rgba(57,107,108,.14),transparent 62%),
    radial-gradient(900px 520px at 94% 2%,rgba(63,117,181,.11),transparent 62%),
    radial-gradient(760px 400px at 50% 0%,rgba(255,216,23,.08),transparent 68%),
    var(--bg);
  font-family:inherit;
  -webkit-font-smoothing:antialiased;
}
.gscd-root,.gscd-root *,.gscd-root *::before,.gscd-root *::after{box-sizing:border-box}
.gscd-container{width:min(1420px,calc(100% - 32px));margin:0 auto}
.gscd-hero{padding:20px 0 44px}
.gscd-heroPanel{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.93),rgba(255,255,255,.83)) padding-box,
    linear-gradient(135deg,rgba(57,107,108,.68),rgba(255,216,23,.46),rgba(63,117,181,.30)) border-box;
  box-shadow:0 46px 130px rgba(26,42,44,.17),0 24px 80px rgba(57,107,108,.08);
  padding:34px;
}
.gscd-heroPanel::after{
  content:"";
  position:absolute;
  width:520px;
  height:520px;
  border-radius:50%;
  right:-260px;
  top:-310px;
  background:radial-gradient(circle,rgba(255,216,23,.21),rgba(63,117,181,.09) 45%,transparent 70%);
  pointer-events:none;
}
.gscd-heroGrid{display:grid;grid-template-columns:1.08fr .92fr;gap:34px;align-items:center;position:relative;z-index:1}
.gscd-eyebrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:18px;margin-bottom:18px}
.gscd-pill,.gscd-kicker{display:inline-flex;align-items:center;font-size:12px;line-height:1;font-weight:900;letter-spacing:.095em;text-transform:uppercase}
.gscd-pill{padding:10px 13px;border-radius:999px;border:1px solid rgba(57,107,108,.30);background:rgba(255,255,255,.74);color:var(--text)}
.gscd-kicker{color:var(--brand);margin-bottom:10px}
.gscd-h1{font-size:clamp(48px,4.6vw,72px);line-height:1.02;letter-spacing:-.04em;margin:0 0 24px;font-weight:950;max-width:850px}
.gscd-lead{font-size:20px;line-height:1.78;color:var(--muted);max-width:820px;margin:0}
.gscd-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:26px}
.gscd-btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:13px 18px;border-radius:14px;border:1px solid var(--border);text-decoration:none;font-weight:900;line-height:1.2;text-align:center;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
.gscd-btn:hover{transform:translateY(-1px);box-shadow:var(--shadowLift);border-color:var(--borderStrong)}
.gscd-btnPrimary{background:linear-gradient(180deg,var(--brand),var(--brandDark));color:#fff;border-color:rgba(57,107,108,.38)}
.gscd-btnGhost{background:rgba(255,255,255,.96);color:var(--text)}
.gscd-textLink{display:inline-flex;align-items:center;gap:5px;color:var(--support);font-weight:900;text-decoration:none;padding:10px 6px}
.gscd-textLink:hover{text-decoration:underline}
.gscd-trust{display:flex;gap:20px;flex-wrap:wrap;margin-top:20px;color:#656565;font-size:13px;font-weight:700}
.gscd-trust span{display:flex;align-items:center;gap:7px}
.gscd-trust svg{color:var(--success)}

.gscd-record{border-radius:24px;border:1px solid rgba(199,204,203,.95);background:rgba(255,255,255,.94);box-shadow:var(--shadow);overflow:hidden;min-width:0}
.gscd-recordTop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:19px 20px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,rgba(57,107,108,.08),rgba(255,216,23,.07),rgba(63,117,181,.05))}
.gscd-recordTop strong{display:block;font-size:20px;margin-top:2px;font-weight:950}
.gscd-status{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(47,125,54,.08);color:var(--success);padding:8px 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.gscd-status i{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px rgba(47,125,54,.09)}
.gscd-recordPath{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:13px 20px;background:rgba(233,236,235,.42);border-bottom:1px solid var(--border);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.gscd-recordPath span{padding:6px 7px;border-radius:8px;background:#fff;border:1px solid var(--border)}
.gscd-recordPath svg{color:var(--support);flex:0 0 auto}
.gscd-recordList{margin:0;padding:8px 20px}
.gscd-recordList>div{display:grid;grid-template-columns:145px minmax(0,1fr);gap:14px;padding:10px 0;border-bottom:1px solid rgba(205,210,209,.65)}
.gscd-recordList>div:last-child{border-bottom:none}
.gscd-recordList dt{font-size:12px;font-weight:900;color:var(--muted)}
.gscd-recordList dd{margin:0;font-size:13px;font-weight:800;overflow-wrap:anywhere}
.gscd-recordFoot{display:flex;align-items:flex-start;gap:8px;padding:12px 20px;background:rgba(233,236,235,.45);border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.5}
.gscd-recordFoot svg{flex:0 0 auto;margin-top:1px;color:var(--support)}
.gscd-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.gscd-dataTag,.gscd-clearTag,.gscd-stateTag{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:900}
.gscd-dataTag{background:rgba(63,117,181,.09);color:var(--support)}
.gscd-clearTag,.gscd-stateTag{background:rgba(47,125,54,.08);color:var(--success)}

.gscd-section{padding:46px 0}
.gscd-sectionSoft{background:linear-gradient(180deg,rgba(233,236,235,.48),rgba(243,244,243,.20))}
.gscd-sectionHead{max-width:930px;margin-bottom:24px}
.gscd-sectionHeadCompact{margin-bottom:20px}
.gscd-h2{font-size:clamp(31px,3.2vw,48px);line-height:1.08;letter-spacing:-.035em;margin:0 0 11px;font-weight:950}
.gscd-sub{font-size:17px;line-height:1.75;color:var(--muted);margin:0;max-width:870px}
.gscd-surface,.gscd-sourceSurface,.gscd-reuseSurface{position:relative;border-radius:26px;border:1px solid var(--border);background:rgba(255,255,255,.94);box-shadow:var(--shadow);padding:28px}
.gscd-surface::before,.gscd-sourceSurface::before,.gscd-reuseSurface::before{content:"";position:absolute;left:22px;right:22px;top:10px;height:2px;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support))}

.gscd-layerGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.gscd-layerCard{position:relative;border:1px solid var(--border);border-radius:21px;background:rgba(255,255,255,.95);padding:19px;min-width:0;overflow:hidden}
.gscd-layerCard::after{content:"";position:absolute;width:150px;height:150px;right:-80px;top:-90px;border-radius:50%;background:radial-gradient(circle,rgba(255,216,23,.14),transparent 70%);pointer-events:none}
.gscd-layerTop{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}
.gscd-layerTop>b{font-size:12px;color:var(--support);letter-spacing:.08em}
.gscd-layerIcon,.gscd-checkIcon,.gscd-controlIcon{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;color:var(--brand);border:1px solid rgba(57,107,108,.22);background:radial-gradient(120px 50px at 20% 10%,rgba(255,216,23,.15),transparent 70%),#fff}
.gscd-layerLabel{display:block;font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--brand);margin-top:16px}
.gscd-layerCard h3{font-size:23px;line-height:1.15;letter-spacing:-.02em;margin:7px 0 8px;font-weight:950}
.gscd-layerCard p{font-size:14px;line-height:1.68;color:var(--muted);margin:0;min-height:95px}
.gscd-fieldList{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}
.gscd-fieldList span{max-width:100%;padding:7px 8px;border-radius:9px;border:1px solid var(--border);background:rgba(233,236,235,.50);font-size:10px;font-weight:850;color:#5E6261;line-height:1.2;overflow-wrap:anywhere}

.gscd-lineageTrack{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;margin-top:10px}
.gscd-lineageUnit{display:grid;grid-template-columns:minmax(0,1fr) 24px;align-items:center;min-width:0}
.gscd-lineageUnit:last-child{grid-template-columns:minmax(0,1fr)}
.gscd-lineageUnit article{height:100%;border:1px solid var(--border);border-radius:18px;background:#fff;padding:15px;min-width:0}
.gscd-lineageNumber{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--brand);color:#fff;font-size:11px;font-weight:950;margin-bottom:13px}
.gscd-lineageUnit article>span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--support)}
.gscd-lineageUnit article>strong{display:block;font-size:13px;line-height:1.45;margin-top:6px;min-height:58px;overflow-wrap:anywhere}
.gscd-lineageUnit article>b{display:inline-flex;margin-top:10px;border-radius:999px;padding:5px 7px;background:rgba(47,125,54,.08);color:var(--success);font-size:9px;text-transform:uppercase;letter-spacing:.07em}
.gscd-lineageArrow{display:flex;align-items:center;justify-content:center;color:var(--support)}
.gscd-reviewGrid{display:grid;grid-template-columns:.72fr 1.28fr;gap:26px;align-items:start;margin-top:26px;padding-top:26px;border-top:1px solid var(--border)}
.gscd-reviewIntro h3{font-size:29px;line-height:1.12;letter-spacing:-.025em;margin:0 0 9px;font-weight:950}
.gscd-reviewIntro p{font-size:15px;line-height:1.72;color:var(--muted);margin:0}
.gscd-questionList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gscd-questionList article{display:grid;grid-template-columns:36px minmax(0,1fr);gap:11px;border:1px solid var(--border);border-radius:16px;background:#fff;padding:13px;min-width:0}
.gscd-questionList article>span{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(233,236,235,.70);color:var(--brand);font-size:10px;font-weight:950}
.gscd-questionList strong{font-size:13px;line-height:1.45}
.gscd-questionList p{font-size:12px;line-height:1.55;color:var(--muted);margin:4px 0 0}

.gscd-qualityLayout{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;align-items:stretch}
.gscd-checkGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.gscd-checkGrid article{position:relative;border:1px solid var(--border);border-radius:20px;background:rgba(255,255,255,.95);padding:18px;min-width:0}
.gscd-checkGrid article>b{position:absolute;right:18px;top:18px;font-size:11px;color:var(--support);letter-spacing:.08em}
.gscd-checkGrid h3{font-size:21px;margin:15px 0 8px;font-weight:950;letter-spacing:-.015em}
.gscd-checkGrid p{font-size:14px;line-height:1.66;color:var(--muted);margin:0}
.gscd-readiness{border:1px solid var(--borderStrong);border-radius:23px;background:#fff;box-shadow:var(--shadow);padding:21px;min-width:0}
.gscd-readinessHead{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}
.gscd-readinessHead strong{display:block;font-size:23px;font-weight:950;margin-top:1px}
.gscd-readinessScore{font-size:34px;font-weight:950;letter-spacing:-.04em;color:var(--brand)}
.gscd-progress{height:9px;border-radius:999px;background:rgba(233,236,235,.90);overflow:hidden;margin-top:19px}
.gscd-progress span{display:block;width:96%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--brand),var(--support))}
.gscd-readinessStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:15px}
.gscd-readinessStats>div{border:1px solid var(--border);border-radius:14px;background:rgba(243,244,243,.58);padding:11px;min-width:0}
.gscd-readinessStats span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:900}
.gscd-readinessStats strong{display:block;font-size:24px;margin-top:5px;font-weight:950}
.gscd-issueList{display:grid;gap:8px;margin-top:15px}
.gscd-issueList>div{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--border);border-radius:14px;padding:11px;background:#fff;min-width:0}
.gscd-issueIcon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:950}
.gscd-issueIcon.is-warning{background:rgba(255,216,23,.17);color:var(--warning)}
.gscd-issueIcon.is-blue{background:rgba(63,117,181,.10);color:var(--support)}
.gscd-issueIcon.is-clear{background:rgba(47,125,54,.09);color:var(--success)}
.gscd-issueList strong{display:block;font-size:12px}
.gscd-issueList small{display:block;color:var(--muted);font-size:10px;line-height:1.4;margin-top:2px}
.gscd-issueList>div>b{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--support)}
.gscd-readinessFoot{margin-top:15px;color:var(--muted);font-size:10px;line-height:1.5}

.gscd-sourceSurface{display:grid;grid-template-columns:.78fr 1.22fr;gap:26px;align-items:center}
.gscd-sourceIntro>p{font-size:17px;line-height:1.76;color:var(--muted);margin:0}
.gscd-sourceRule{display:flex;align-items:flex-start;gap:12px;margin-top:20px;border:1px solid var(--border);border-radius:17px;padding:15px;background:rgba(243,244,243,.68)}
.gscd-sourceRule>svg{color:var(--brand);flex:0 0 auto;margin-top:1px}
.gscd-sourceRule strong{display:block;font-size:14px}
.gscd-sourceRule span{display:block;font-size:12px;line-height:1.55;color:var(--muted);margin-top:4px}
.gscd-modeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.gscd-modeCard{border:1px solid var(--border);border-radius:21px;background:#fff;padding:19px;min-width:0}
.gscd-modeCard.is-actual{background:radial-gradient(260px 120px at 10% 0%,rgba(57,107,108,.10),transparent 68%),#fff}
.gscd-modeCard.is-default{background:radial-gradient(260px 120px at 10% 0%,rgba(255,216,23,.14),transparent 68%),#fff}
.gscd-modeTop{display:flex;align-items:center;justify-content:space-between;gap:12px}
.gscd-modeTop>span{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(57,107,108,.22);background:#fff;color:var(--brand)}
.gscd-modeTop>b{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--support);border-radius:999px;padding:6px 8px;background:rgba(63,117,181,.08)}
.gscd-modeCard.is-default .gscd-modeTop>b{color:var(--warning);background:rgba(255,216,23,.16)}
.gscd-modeCard h3{font-size:22px;line-height:1.15;margin:15px 0 8px;font-weight:950}
.gscd-modeCard p{font-size:14px;line-height:1.65;color:var(--muted);margin:0}
.gscd-modeCard ul{list-style:none;padding:0;margin:17px 0 0;display:grid;gap:9px}
.gscd-modeCard li{display:flex;align-items:flex-start;gap:8px;color:#606463;font-size:12px;line-height:1.45}
.gscd-modeCard li svg{color:var(--success);flex:0 0 auto;margin-top:1px}

.gscd-ledgerLayout{display:grid;grid-template-columns:.78fr 1.22fr;gap:27px;align-items:center}
.gscd-ledgerCopy>p{font-size:17px;line-height:1.76;color:var(--muted);margin:0}
.gscd-ledgerBenefits{display:grid;gap:9px;margin-top:20px}
.gscd-ledgerBenefits article{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;align-items:start;border:1px solid var(--border);border-radius:16px;background:#fff;padding:12px}
.gscd-ledgerBenefits article>span{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:var(--brand);background:rgba(233,236,235,.62);border:1px solid var(--border)}
.gscd-ledgerBenefits strong{display:block;font-size:13px}
.gscd-ledgerBenefits p{font-size:11px;line-height:1.5;color:var(--muted);margin:3px 0 0}
.gscd-ledger{border:1px solid var(--borderStrong);border-radius:22px;background:#fff;overflow:hidden;min-width:0}
.gscd-ledger:focus-visible{outline:3px solid rgba(57,107,108,.18);outline-offset:3px}
.gscd-ledgerBar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;background:linear-gradient(90deg,rgba(57,107,108,.12),rgba(255,216,23,.08),rgba(63,117,181,.08));border-bottom:1px solid var(--border)}
.gscd-ledgerBar span{display:flex;align-items:center;gap:8px;font-weight:950}
.gscd-ledgerBar svg{color:var(--brand)}
.gscd-ledgerBar b{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--success);background:rgba(47,125,54,.08);border-radius:999px;padding:7px 8px}
.gscd-ledger dl{margin:0;padding:7px 17px}
.gscd-ledger dl>div{display:grid;grid-template-columns:145px minmax(0,1fr);gap:14px;padding:11px 0;border-bottom:1px solid rgba(205,210,209,.67)}
.gscd-ledger dl>div:last-child{border-bottom:none}
.gscd-ledger dt{font-size:12px;font-weight:900;color:var(--muted)}
.gscd-ledger dd{margin:0;font-size:13px;font-weight:800;overflow-wrap:anywhere}
.gscd-outputValue{font-size:18px;font-weight:950;color:var(--brand)}
.gscd-ledgerFoot{display:flex;align-items:center;gap:7px;padding:12px 17px;background:rgba(233,236,235,.48);border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.4}

.gscd-evidenceLayout{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;align-items:stretch}
.gscd-tableWrap{overflow-x:auto;border:1px solid var(--border);border-radius:20px;background:#fff;min-width:0}
.gscd-tableWrap:focus-visible{outline:3px solid rgba(57,107,108,.18);outline-offset:3px}
.gscd-table{width:100%;border-collapse:collapse;min-width:730px}
.gscd-table th,.gscd-table td{padding:13px 12px;text-align:left;vertical-align:middle;border-bottom:1px solid rgba(205,210,209,.72);font-size:12px}
.gscd-table th+th,.gscd-table td+td{border-left:1px solid rgba(205,210,209,.5)}
.gscd-table thead th{font-size:10px;text-transform:uppercase;letter-spacing:.075em;background:rgba(233,236,235,.58)}
.gscd-table tbody th{font-weight:900}
.gscd-table tbody td{color:var(--muted)}
.gscd-table tbody tr:last-child th,.gscd-table tbody tr:last-child td{border-bottom:none}
.gscd-fileCell{display:flex;align-items:center;gap:8px;white-space:nowrap}
.gscd-fileCell svg{color:var(--brand);flex:0 0 auto}
.gscd-tableNote{padding:11px 13px;border-top:1px solid var(--border);background:rgba(243,244,243,.58);color:var(--muted);font-size:10px;line-height:1.45}
.gscd-evidenceAside{border:1px solid var(--border);border-radius:20px;background:radial-gradient(300px 130px at 5% 0%,rgba(255,216,23,.14),transparent 70%),#fff;padding:20px;min-width:0}
.gscd-evidenceIcon{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:rgba(57,107,108,.08);border:1px solid rgba(57,107,108,.20);color:var(--brand)}
.gscd-evidenceAside h3{font-size:23px;margin:15px 0 8px;font-weight:950}
.gscd-evidenceAside p{font-size:14px;line-height:1.68;color:var(--muted);margin:0}
.gscd-miniTrail{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:18px}
.gscd-miniTrail span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:900;padding:6px 7px;border-radius:8px;background:rgba(233,236,235,.8);border:1px solid var(--border)}
.gscd-miniTrail i{width:11px;height:1px;background:var(--support)}
.gscd-evidenceAside ul{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:9px}
.gscd-evidenceAside li{display:flex;align-items:flex-start;gap:8px;color:#606463;font-size:12px;line-height:1.45}
.gscd-evidenceAside li svg{color:var(--success);flex:0 0 auto;margin-top:1px}

.gscd-controlGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gscd-controlGrid article{border:1px solid var(--border);border-radius:20px;background:rgba(255,255,255,.95);padding:18px;min-width:0}
.gscd-controlGrid h3{font-size:20px;line-height:1.16;margin:15px 0 8px;font-weight:950}
.gscd-controlGrid p{font-size:14px;line-height:1.65;color:var(--muted);margin:0}
.gscd-accessMap{display:grid;grid-template-columns:.82fr 1.18fr;gap:24px;align-items:center;margin-top:16px;border:1px solid transparent;border-radius:23px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.90)) padding-box,linear-gradient(135deg,rgba(57,107,108,.52),rgba(255,216,23,.40),rgba(63,117,181,.25)) border-box;padding:22px;box-shadow:var(--shadow)}
.gscd-accessCopy h3{font-size:27px;line-height:1.14;letter-spacing:-.025em;margin:0 0 9px;font-weight:950}
.gscd-accessCopy p{font-size:14px;line-height:1.7;color:var(--muted);margin:0}
.gscd-accessFlow{display:grid;grid-template-columns:.8fr 45px 1.2fr;align-items:center;gap:0;min-width:0}
.gscd-accessNode{border:1px solid var(--border);border-radius:17px;background:#fff;padding:15px;text-align:center;min-width:0}
.gscd-accessNode>span{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;background:rgba(233,236,235,.62);border:1px solid var(--border);color:var(--brand)}
.gscd-accessNode strong{display:block;font-size:12px}
.gscd-accessNode small{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.4}
.gscd-accessNode.is-org{background:radial-gradient(190px 80px at 10% 0%,rgba(255,216,23,.13),transparent 70%),#fff}
.gscd-accessLines{height:112px;position:relative}
.gscd-accessLines::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:var(--support)}
.gscd-accessLines::after{content:"";position:absolute;right:0;top:22%;bottom:22%;width:1px;background:var(--support)}
.gscd-accessLines i{position:absolute;right:-1px;width:10px;height:10px;border-radius:50%;background:var(--support);transform:translate(50%,-50%)}
.gscd-accessLines i:first-child{top:22%}
.gscd-accessLines i:last-child{top:78%}
.gscd-accessBranches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gscd-availabilityNote{text-align:center;color:var(--muted);font-size:11px;line-height:1.5;margin:15px 0 0}

.gscd-reuseGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gscd-reuseGrid article{border:1px solid var(--border);border-radius:20px;background:#fff;padding:18px;min-width:0;overflow:hidden}
.gscd-reuseTop{display:flex;align-items:center;justify-content:space-between;gap:12px}
.gscd-reuseTop>span{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(57,107,108,.22);background:#fff;color:var(--brand)}
.gscd-reuseTop>b{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--support);background:rgba(63,117,181,.08);padding:6px 7px;border-radius:999px}
.gscd-reuseGrid h3{font-size:20px;margin:15px 0 8px;font-weight:950}
.gscd-reuseGrid p{font-size:14px;line-height:1.65;color:var(--muted);margin:0;min-height:92px}
.gscd-reuseVisual{height:76px;margin-top:18px;border:1px solid var(--border);border-radius:14px;background:rgba(243,244,243,.65);overflow:hidden}
.gscd-reuseVisual.is-reporting{position:relative;padding:15px;display:grid;gap:7px}
.gscd-docLine{display:block;height:7px;width:54%;border-radius:999px;background:rgba(63,117,181,.26)}
.gscd-docLine.is-long{width:78%;background:rgba(57,107,108,.35)}
.gscd-docLine.is-mid{width:65%}
.gscd-docCheck{position:absolute;right:13px;bottom:13px;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--brand);color:#fff;font-style:normal;font-size:12px;font-weight:950}
.gscd-reuseVisual.is-forecast{display:flex;align-items:flex-end;gap:7px;padding:12px 15px}
.gscd-reuseVisual.is-forecast span{flex:1;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,var(--support),var(--brand))}
.gscd-reuseVisual.is-scenario{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}
.gscd-reuseVisual.is-scenario>div{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:var(--muted)}
.gscd-reuseVisual.is-scenario i{width:12px;height:44px;border-radius:5px;background:var(--brand)}
.gscd-reuseVisual.is-scenario>div:last-child i{height:31px;background:var(--highlight);border:1px solid #C6A900}
.gscd-reuseVisual.is-alerts{display:flex;flex-direction:column;justify-content:center;padding:13px;background:rgba(255,216,23,.12)}
.gscd-reuseVisual.is-alerts strong{font-size:11px;color:var(--warning)}
.gscd-reuseVisual.is-alerts span{font-size:10px;color:var(--muted);margin-top:4px}

.gscd-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gscd-faqItem{border:1px solid var(--border);border-radius:18px;background:rgba(255,255,255,.95);padding:14px 15px;min-width:0}
.gscd-faqItem summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-weight:950;line-height:1.45}
.gscd-faqItem summary::-webkit-details-marker{display:none}
.gscd-faqItem summary::before{content:"?";width:30px;height:30px;flex:0 0 30px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--brand);border:1px solid rgba(57,107,108,.22);background:radial-gradient(100px 40px at 20% 20%,rgba(255,216,23,.18),transparent 70%),#fff}
.gscd-faqItem summary::after{content:"▾";margin-left:auto;color:var(--muted);transition:transform .14s ease}
.gscd-faqItem[open] summary::after{transform:rotate(180deg)}
.gscd-faqItem>div{color:var(--muted);line-height:1.72;margin-top:10px;padding-left:40px}
.gscd-finalCta{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:24px;border-radius:26px;border:1px solid transparent;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.88)) padding-box,linear-gradient(135deg,rgba(57,107,108,.60),rgba(255,216,23,.45),rgba(63,117,181,.28)) border-box;padding:28px;box-shadow:var(--shadow)}
.gscd-finalCta>div:first-child{max-width:820px}
.gscd-finalCta h2{font-size:clamp(28px,3vw,42px);line-height:1.08;letter-spacing:-.03em;margin:0 0 9px;font-weight:950}
.gscd-finalCta p{color:var(--muted);line-height:1.7;margin:0}
.gscd-finalActions{display:flex;gap:10px;flex-wrap:wrap;flex:0 0 auto}

@media(max-width:1220px){
  .gscd-lineageTrack{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .gscd-lineageUnit{grid-template-columns:minmax(0,1fr)}
  .gscd-lineageArrow{display:none}
  .gscd-controlGrid,.gscd-reuseGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gscd-layerCard p,.gscd-reuseGrid p{min-height:0}
}
@media(max-width:960px){
  .gscd-heroGrid,.gscd-qualityLayout,.gscd-sourceSurface,.gscd-ledgerLayout,.gscd-evidenceLayout,.gscd-accessMap{grid-template-columns:1fr}
  .gscd-record{max-width:760px}
  .gscd-layerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gscd-reviewGrid{grid-template-columns:1fr}
  .gscd-accessFlow{max-width:760px;width:100%;margin:0 auto}
  .gscd-finalCta{align-items:flex-start;flex-direction:column}
  .gscd-finalActions{width:100%}
}
@media(max-width:720px){
  .gscd-container{width:min(100% - 22px,1420px)}
  .gscd-hero{padding-top:12px}
  .gscd-heroPanel,.gscd-surface,.gscd-sourceSurface,.gscd-reuseSurface{padding:19px}
  .gscd-h1{font-size:43px;line-height:1.04}
  .gscd-lead{font-size:18px}
  .gscd-section{padding:38px 0}
  .gscd-layerGrid,.gscd-checkGrid,.gscd-modeGrid,.gscd-lineageTrack,.gscd-questionList,.gscd-controlGrid,.gscd-reuseGrid,.gscd-faq{grid-template-columns:1fr}
  .gscd-layerCard p,.gscd-reuseGrid p{min-height:0}
  .gscd-recordList>div,.gscd-ledger dl>div{grid-template-columns:1fr;gap:4px}
  .gscd-readinessStats{grid-template-columns:1fr}
  .gscd-accessFlow{grid-template-columns:1fr;gap:10px}
  .gscd-accessLines{height:32px}
  .gscd-accessLines::before{left:50%;right:auto;top:0;bottom:0;width:1px;height:auto}
  .gscd-accessLines::after,.gscd-accessLines i{display:none}
  .gscd-accessBranches{grid-template-columns:1fr}
  .gscd-btn{width:100%}
  .gscd-textLink{width:100%;justify-content:center}
  .gscd-actions{width:100%}
  .gscd-finalActions{display:grid;grid-template-columns:1fr}
  .gscd-trust{display:grid;gap:9px}
  .gscd-issueList>div{grid-template-columns:34px minmax(0,1fr)}
  .gscd-issueList>div>b{grid-column:2}
}
@media(max-width:470px){
  .gscd-h1{font-size:38px}
  .gscd-h2{font-size:31px}
  .gscd-heroPanel{border-radius:22px}
  .gscd-eyebrow{font-size:15px}
  .gscd-recordTop{flex-direction:column}
  .gscd-status{white-space:normal}
  .gscd-lineageUnit article>strong{min-height:0}
  .gscd-table{min-width:680px}
}
`;
