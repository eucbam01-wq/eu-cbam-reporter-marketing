import Head from "next/head";
import Link from "next/link";
import { useRef, useState } from "react";

const workflowSteps = [
  {
    number: "01",
    label: "Entity control",
    title: "Set up the importer structure",
    summary:
      "Create the organisation, legal entities, EORI records, addresses, user roles, and country authority metadata that define who owns each reporting obligation.",
    inputs: ["Organisation and entity details", "EORI and establishment data", "Users, roles, and access boundaries"],
    output: "A controlled reporting workspace for each legal entity.",
    icon: "entity",
  },
  {
    number: "02",
    label: "Import spine",
    title: "Upload and map shipment data",
    summary:
      "Bring in customs or shipment records, validate the file, map internal products to CN or HS codes, and connect every import line to the correct supplier.",
    inputs: ["Quantity and net mass", "Customs value and origin", "Product, CN code, and supplier mapping"],
    output: "Validated import lines ready for supplier and emissions work.",
    icon: "upload",
  },
  {
    number: "03",
    label: "Supplier collection",
    title: "Request data through secure supplier links",
    summary:
      "Generate token-based requests, collect supplier and facility details, capture emissions inputs, receive evidence files, and track each request from draft to verified or rejected.",
    inputs: ["Supplier contacts and facilities", "Secure request links", "Submission evidence and status"],
    output: "Supplier responses linked directly to the relevant records.",
    icon: "supplier",
  },
  {
    number: "04",
    label: "Calculation control",
    title: "Normalise, calculate, and review",
    summary:
      "Apply unit and rounding rules, handle missing values, distinguish actual data from defaults, and expose the source and flags behind every calculated result.",
    inputs: ["Actual or default data mode", "Electricity and precursor inputs", "Unit normalisation and fallback logic"],
    output: "Per-line embedded emissions with deterministic calculation context.",
    icon: "calculate",
  },
  {
    number: "05",
    label: "Reporting gate",
    title: "Validate the reporting period before export",
    summary:
      "Aggregate the reporting period, identify missing data, default usage, and outliers, then move the filing pack through a controlled export and submission checklist.",
    inputs: ["Reporting period aggregation", "Completeness and outlier checks", "Filing status controls"],
    output: "A structured reporting pack prepared for the export workflow.",
    icon: "validate",
  },
  {
    number: "06",
    label: "Exposure planning",
    title: "Model emissions and cost exposure",
    summary:
      "Compare actual and default scenarios, review exposure by product, supplier, and country, and apply certificate or ETS price assumptions for planning.",
    inputs: ["Product and supplier comparisons", "Actual versus default scenarios", "Certificate and price assumptions"],
    output: "A management view of operational and financial exposure.",
    icon: "forecast",
  },
  {
    number: "07",
    label: "Audit control",
    title: "Retain evidence, alerts, and lineage",
    summary:
      "Keep supporting evidence connected to the record, surface deadline or missing-data alerts, and preserve the chain from import line to supplier submission, calculation, and report.",
    inputs: ["Evidence metadata and retention", "Risk and deadline alerts", "Calculation and reporting lineage"],
    output: "A reviewable evidence trail for internal and external scrutiny.",
    icon: "audit",
  },
] as const;

const faqItems = [
  {
    question: "What data do I upload first?",
    answer:
      "The workflow starts with legal entity information and import records. Import lines can include quantity, net mass, customs value, country of origin, internal product references, CN or HS codes, and supplier mapping.",
  },
  {
    question: "How do suppliers provide emissions information?",
    answer:
      "Importers generate token-based supplier links. The supplier opens the request, reviews the context, provides supplier and facility information, enters emissions inputs, uploads evidence, and submits the response without needing an importer account.",
  },
  {
    question: "Can the workflow distinguish actual data from default values?",
    answer:
      "Yes. The calculation design separates actual-data mode from default-value mode and records the fallback logic used when information is missing or incomplete.",
  },
  {
    question: "What is retained behind a calculation?",
    answer:
      "The calculation ledger is designed to retain the input reference, input hash, formula version, output, timestamp, actor, data source, and any warning or review flag connected to the result.",
  },
  {
    question: "What checks happen before an export?",
    answer:
      "The reporting gate reviews missing data, default usage, outliers, reporting-period coverage, and unresolved items before the filing pack moves into the structured output workflow.",
  },
  {
    question: "Can several entities and team members use the same workspace?",
    answer:
      "The operating model supports an importer organisation with legal entities underneath it, entity-level EORI records, role-based access, and strict tenant boundaries.",
  },
  {
    question: "How is supplier progress tracked?",
    answer:
      "Requests move through defined states such as draft, sent, viewed, submitted, verified, and rejected. Campaign controls can also support bulk sending, reminders, and escalation rules.",
  },
  {
    question: "Are all modules included in every plan?",
    answer:
      "Core workflow and advanced controls can vary by plan and implementation. The pricing page sets out entity limits, supplier limits, forecasting, governance, integration, and support levels.",
  },
] as const;

const chainItems = [
  { label: "Import line", value: "CN code, mass, value, origin", state: "Validated" },
  { label: "Supplier response", value: "Facility data, emissions, evidence", state: "Linked" },
  { label: "Calculation", value: "Source mode, formula version, result", state: "Logged" },
  { label: "Reporting pack", value: "Checks, aggregation, structured output", state: "Controlled" },
] as const;

export default function HowItWorksPage() {
  const schema = buildSchema();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [mobileVideoStarted, setMobileVideoStarted] = useState(false);

  const playWalkthrough = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      setVideoStarted(true);
    } catch (error) {
      console.error("Unable to start walkthrough video", error);
    }
  };

  const playMobileWalkthrough = async () => {
    const video = mobileVideoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      setMobileVideoStarted(true);
    } catch (error) {
      console.error("Unable to start mobile walkthrough video", error);
    }
  };

  const scrollToWalkthrough = () => {
    document.getElementById("walkthrough-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <Head>
        <title>How GrandScope Works | EU CBAM Reporting Workflow</title>
        <meta
          name="description"
          content="See how GrandScope connects legal entities, shipment data, CN codes, suppliers, emissions calculations, evidence, reporting controls, and CBAM output in one traceable workflow."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.grandscope.ai/en/how-it-works" />
        <meta property="og:title" content="How GrandScope Works | EU CBAM Reporting Workflow" />
        <meta
          property="og:description"
          content="Follow the GrandScope workflow from entity setup and shipment intake through supplier collection, emissions calculations, validation, reporting, forecasting, and audit evidence."
        />
        <meta property="og:url" content="https://www.grandscope.ai/en/how-it-works" />
        <meta property="og:site_name" content="GrandScope" />
        <meta property="og:image" content="https://www.grandscope.ai/og/cbam.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="How GrandScope Works | EU CBAM Reporting Workflow" />
        <meta
          name="twitter:description"
          content="A controlled CBAM reporting chain from imports and suppliers to calculations, evidence, and reporting output."
        />
        <meta name="twitter:image" content="https://www.grandscope.ai/og/cbam.png" />
      </Head>

      <main className="gsh-root" aria-label="How GrandScope works">
        <style>{styles}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <section className="gsh-hero" aria-labelledby="how-title">
          <div className="gsh-container">
            <div className="gsh-heroPanel">
              <div className="gsh-heroGrid">
                <div className="gsh-heroCopy">
                  <div className="gsh-eyebrow">
                    <span className="gsh-pill">How GrandScope works</span>
                    <span>EU CBAM operating workflow</span>
                  </div>

                  <h1 id="how-title" className="gsh-h1">
                    One controlled chain from import records to CBAM-ready output.
                  </h1>

                  <p className="gsh-lead">
                    GrandScope connects legal entities, CN codes, shipment lines,
                    suppliers, emissions inputs, evidence, calculations, and reporting
                    controls in one traceable operating model.
                  </p>

                  <div className="gsh-actions">
                    <Link className="gsh-btn gsh-btnPrimary" href="/check">
                      Start free CBAM report
                    </Link>
                    <button
                      type="button"
                      className="gsh-btn gsh-btnGhost gsh-desktopDemoButton"
                      onClick={scrollToWalkthrough}
                      aria-label="Scroll to the one minute GrandScope product demo"
                    >
                      {iconPlay()}
                      Watch 1 minute demo
                    </button>
                    <Link className="gsh-textLink" href="/en/pricing">
                      View plans {iconArrow()}
                    </Link>
                  </div>

                  <section className="gsh-mobileWalkthrough" aria-labelledby="mobile-walkthrough-title">
                    <span className="gsh-kicker">Product walkthrough</span>
                    <h2 id="mobile-walkthrough-title">
                      Watch the complete importer-to-supplier workflow.
                    </h2>

                    <div className={`gsh-mobileVideoStage ${mobileVideoStarted ? "is-playing" : ""}`}>
                      <video
                        ref={mobileVideoRef}
                        className="gsh-mobileVideo"
                        controls={mobileVideoStarted}
                        playsInline
                        preload="metadata"
                        onPlay={() => setMobileVideoStarted(true)}
                        onEnded={() => setMobileVideoStarted(false)}
                        aria-label="GrandScope importer-to-supplier workflow demonstration"
                      >
                        <source src="/videos/how-it-works.mp4" type="video/mp4" />
                        Your browser does not support embedded video. You can{' '}
                        <a href="/videos/how-it-works.mp4">open the walkthrough directly</a>.
                      </video>

                      {!mobileVideoStarted ? (
                        <button
                          type="button"
                          className="gsh-mobileVideoOverlay"
                          onClick={playMobileWalkthrough}
                          aria-label="Play Video with sound"
                        >
                          <span className="gsh-mobilePlayButton" aria-hidden="true">
                            {iconPlay()}
                          </span>
                          <strong>Play Video</strong>
                          <small>1 min 06 sec · Starts with sound</small>
                        </button>
                      ) : null}
                    </div>

                    <div className="gsh-mobileVideoMeta">
                      <strong>1 min 06 sec</strong>
                      <span>GrandScope product demo</span>
                    </div>
                  </section>

                  <div className="gsh-trust" aria-label="Workflow controls">
                    <span>{iconCheck()} Entity-separated access</span>
                    <span>{iconCheck()} Supplier evidence linked to imports</span>
                    <span>{iconCheck()} Calculation context retained</span>
                  </div>
                </div>

                <aside className="gsh-console" aria-label="Illustrative CBAM workflow">
                  <div className="gsh-consoleTop">
                    <div>
                      <span className="gsh-kicker">Illustrative workflow</span>
                      <strong>Reporting chain</strong>
                    </div>
                    <span className="gsh-live"><i /> Controlled</span>
                  </div>

                  <div className="gsh-consoleBody">
                    <div className="gsh-consoleRow">
                      <span className="gsh-consoleIcon">{iconUpload()}</span>
                      <div>
                        <strong>Import data</strong>
                        <small>CSV mapped to products, CN codes, and suppliers</small>
                      </div>
                      <b>Ready</b>
                    </div>
                    <div className="gsh-connector" />
                    <div className="gsh-consoleRow">
                      <span className="gsh-consoleIcon">{iconSupplier()}</span>
                      <div>
                        <strong>Supplier requests</strong>
                        <small>Token links, status tracking, and evidence</small>
                      </div>
                      <b>Tracked</b>
                    </div>
                    <div className="gsh-connector" />
                    <div className="gsh-consoleRow">
                      <span className="gsh-consoleIcon">{iconCalculate()}</span>
                      <div>
                        <strong>Emissions review</strong>
                        <small>Actual or default source, flags, and lineage</small>
                      </div>
                      <b>Logged</b>
                    </div>
                    <div className="gsh-connector" />
                    <div className="gsh-consoleRow gsh-consoleRowFinal">
                      <span className="gsh-consoleIcon">{iconFile()}</span>
                      <div>
                        <strong>Reporting output</strong>
                        <small>Validation gate, filing pack, and status control</small>
                      </div>
                      <b>Prepared</b>
                    </div>
                  </div>

                  <div className="gsh-consoleFoot">
                    <span>{iconShield()} Record lineage</span>
                    <span>{iconClock()} Review status</span>
                    <span>{iconEvidence()} Evidence files</span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-videoSection" aria-labelledby="walkthrough-title">
          <div className="gsh-container">
            <div className="gsh-videoSurface">
              <header className="gsh-videoHeader">
                <div>
                  <span className="gsh-kicker">Product walkthrough</span>
                  <h2 id="walkthrough-title" className="gsh-h2">
                    Watch the complete importer-to-supplier workflow.
                  </h2>
                  <p id="walkthrough-description">
                    See how an importer starts with basic details, sends a secure
                    supplier link, receives facility and emissions evidence, reviews
                    the response, and moves the record towards CBAM-ready output.
                  </p>
                </div>

                <div className="gsh-videoBadge" aria-label="Video duration: 1 minute 6 seconds">
                  <span className="gsh-videoBadgeIcon">{iconPlay()}</span>
                  <div>
                    <strong>1 min 06 sec</strong>
                    <small>GrandScope product demo</small>
                  </div>
                </div>
              </header>

              <div className="gsh-videoFrame">
                <div className="gsh-videoTopbar" aria-hidden="true">
                  <span className="gsh-videoDots"><i /><i /><i /></span>
                  <strong>GrandScope workflow walkthrough</strong>
                  <span className="gsh-videoQuality">HD</span>
                </div>

                <div className={`gsh-videoStage ${videoStarted ? "is-playing" : ""}`}>
                  <video
                    ref={videoRef}
                    className="gsh-video"
                    controls={videoStarted}
                    playsInline
                    preload="metadata"
                    onPlay={() => setVideoStarted(true)}
                    onEnded={() => setVideoStarted(false)}
                    aria-describedby="walkthrough-description"
                    aria-label="GrandScope importer-to-supplier workflow demonstration"
                  >
                    <source src="/videos/how-it-works.mp4" type="video/mp4" />
                    Your browser does not support embedded video. You can{' '}
                    <a href="/videos/how-it-works.mp4">open the walkthrough directly</a>.
                  </video>

                  {!videoStarted ? (
                    <button
                      type="button"
                      className="gsh-videoOverlay"
                      onClick={playWalkthrough}
                      aria-label="Play Video with sound"
                    >
                      <span className="gsh-videoOverlayGlow" aria-hidden="true" />
                      <span className="gsh-videoPlayButton" aria-hidden="true">
                        {iconPlay()}
                      </span>
                      <strong>Play Video</strong>
                      <small>Starts with sound</small>
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="gsh-videoHighlights" aria-label="Walkthrough topics">
                <span>{iconCheck()} Importer starts with basic details</span>
                <span>{iconCheck()} Secure link collects supplier data</span>
                <span>{iconCheck()} Review leads to CBAM-ready output</span>
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-section" aria-labelledby="chain-title">
          <div className="gsh-container">
            <header className="gsh-sectionHead">
              <span className="gsh-kicker">The operating chain</span>
              <h2 id="chain-title" className="gsh-h2">
                Seven linked stages. One source of reporting truth.
              </h2>
              <p>
                Each stage creates the structured input for the next. Data is not
                copied between disconnected spreadsheets, inboxes, and filing tools.
              </p>
            </header>

            <div className="gsh-steps">
              {workflowSteps.map((step) => (
                <article className="gsh-step" id={`step-${step.number}`} key={step.number}>
                  <div className="gsh-stepRail" aria-hidden="true">
                    <span>{step.number}</span>
                    <i />
                  </div>

                  <div className="gsh-stepCard">
                    <div className="gsh-stepTop">
                      <div className="gsh-stepIcon">{renderWorkflowIcon(step.icon)}</div>
                      <span className="gsh-stepLabel">{step.label}</span>
                    </div>

                    <div className="gsh-stepContent">
                      <div className="gsh-stepMain">
                        <h3>{step.title}</h3>
                        <p>{step.summary}</p>
                      </div>

                      <div className="gsh-stepInputs">
                        <span>Key controls</span>
                        <ul>
                          {step.inputs.map((input) => (
                            <li key={input}>{iconCheck()} {input}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="gsh-stepOutput">
                        <span>Stage output</span>
                        <strong>{step.output}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gsh-section gsh-sectionSoft" aria-labelledby="record-title">
          <div className="gsh-container">
            <div className="gsh-surface">
              <header className="gsh-sectionHead gsh-sectionHeadCompact">
                <span className="gsh-kicker">Record lineage</span>
                <h2 id="record-title" className="gsh-h2">
                  What happens to one import line.
                </h2>
                <p>
                  The product model links the customs record, supplier response,
                  emissions result, and reporting output instead of treating them as
                  separate tasks.
                </p>
              </header>

              <div className="gsh-recordFlow">
                {chainItems.map((item, index) => (
                  <div className="gsh-recordUnit" key={item.label}>
                    <article>
                      <span className="gsh-recordIndex">0{index + 1}</span>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                      <b>{iconCheck()} {item.state}</b>
                    </article>
                    {index < chainItems.length - 1 ? (
                      <div className="gsh-recordArrow" aria-hidden="true">
                        {iconArrow()}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="gsh-lineageNote">
                <div className="gsh-lineageIcon">{iconShield()}</div>
                <div>
                  <strong>Why the connection matters</strong>
                  <p>
                    A reviewer can follow the path from an import record to the
                    supplier data used, the calculation context applied, and the
                    reporting record produced from it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-section" aria-labelledby="supplier-title">
          <div className="gsh-container">
            <div className="gsh-split">
              <div>
                <span className="gsh-kicker">Supplier collection</span>
                <h2 id="supplier-title" className="gsh-h2">
                  Replace one-off email chasing with a controlled request lifecycle.
                </h2>
                <p className="gsh-sectionLead">
                  The importer launches the request. The supplier receives a secure
                  link, submits the required information and evidence, and the status
                  returns to the importer dashboard.
                </p>

                <div className="gsh-twoCards">
                  <article className="gsh-roleCard">
                    <span className="gsh-roleIcon">{iconDashboard()}</span>
                    <h3>Importer workspace</h3>
                    <ul>
                      <li>{iconCheck()} Create supplier links and campaigns</li>
                      <li>{iconCheck()} Track draft, sent, viewed, and submitted states</li>
                      <li>{iconCheck()} Review evidence and verify or reject responses</li>
                      <li>{iconCheck()} Trigger reminders and escalation rules</li>
                    </ul>
                  </article>

                  <article className="gsh-roleCard">
                    <span className="gsh-roleIcon">{iconSupplier()}</span>
                    <h3>Supplier portal</h3>
                    <ul>
                      <li>{iconCheck()} Open a token-based request link</li>
                      <li>{iconCheck()} Review the relevant request context</li>
                      <li>{iconCheck()} Enter facility and emissions information</li>
                      <li>{iconCheck()} Upload evidence and submit the response</li>
                    </ul>
                  </article>
                </div>
              </div>

              <aside className="gsh-statusPanel" aria-label="Supplier request status example">
                <div className="gsh-statusHead">
                  <div>
                    <span className="gsh-kicker">Request tracker</span>
                    <h3>Supplier campaign</h3>
                  </div>
                  <span className="gsh-statusCount">6 stages</span>
                </div>

                <div className="gsh-statusList">
                  {[
                    ["Draft", "Request prepared", "complete"],
                    ["Sent", "Secure link delivered", "complete"],
                    ["Viewed", "Supplier opened request", "complete"],
                    ["Submitted", "Data and evidence received", "active"],
                    ["Verified", "Importer review completed", "waiting"],
                    ["Rejected", "Returned only when correction is required", "neutral"],
                  ].map(([status, detail, state]) => (
                    <div className={`gsh-statusRow gsh-status-${state}`} key={status}>
                      <span className="gsh-statusDot" />
                      <div>
                        <strong>{status}</strong>
                        <small>{detail}</small>
                      </div>
                      <b>{state === "complete" ? iconCheck() : state === "active" ? iconClock() : null}</b>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="gsh-section gsh-sectionSoft" aria-labelledby="ledger-title">
          <div className="gsh-container">
            <div className="gsh-surface gsh-ledgerSurface">
              <div className="gsh-ledgerIntro">
                <span className="gsh-kicker">Calculation ledger</span>
                <h2 id="ledger-title" className="gsh-h2">
                  The result is only useful when its source can be explained.
                </h2>
                <p>
                  GrandScope's calculation model is designed to retain the inputs,
                  source mode, formula version, output, time, actor, and review flags
                  behind each emissions result.
                </p>

                <div className="gsh-modeCards">
                  <article>
                    <span>Actual data</span>
                    <strong>Supplier or facility inputs</strong>
                    <p>Used when the required information is supplied and accepted.</p>
                  </article>
                  <article>
                    <span>Default mode</span>
                    <strong>Explicit fallback logic</strong>
                    <p>Recorded separately when actual information is unavailable.</p>
                  </article>
                </div>
              </div>

              <div className="gsh-ledger" role="region" aria-label="Illustrative calculation ledger" tabIndex={0}>
                <div className="gsh-ledgerBar">
                  <span>{iconCalculate()} Calculation record</span>
                  <b>Reviewable</b>
                </div>
                <dl>
                  <div><dt>Import line</dt><dd>IMP-2026-00481</dd></div>
                  <div><dt>Data source</dt><dd><span className="gsh-dataTag">Actual</span></dd></div>
                  <div><dt>Input reference</dt><dd>Supplier submission 0184</dd></div>
                  <div><dt>Input hash</dt><dd className="gsh-code">7f9c...3a21</dd></div>
                  <div><dt>Formula version</dt><dd>CBAM-CALC-1.4</dd></div>
                  <div><dt>Output</dt><dd>2.418 tCO2e</dd></div>
                  <div><dt>Recorded</dt><dd>Timestamp and actor retained</dd></div>
                  <div><dt>Review flags</dt><dd><span className="gsh-clearTag">No unresolved flag</span></dd></div>
                </dl>
                <div className="gsh-ledgerFoot">
                  {iconShield()} Illustrative record structure. Values shown are examples.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-section" aria-labelledby="gate-title">
          <div className="gsh-container">
            <header className="gsh-sectionHead">
              <span className="gsh-kicker">The reporting gate</span>
              <h2 id="gate-title" className="gsh-h2">
                Resolve the weak points before they reach the filing pack.
              </h2>
              <p>
                Reporting controls combine period aggregation with checks for missing
                information, default usage, outliers, and unresolved supplier records.
              </p>
            </header>

            <div className="gsh-gateGrid">
              <article>
                <div className="gsh-gateIcon">{iconSearch()}</div>
                <span>01</span>
                <h3>Completeness</h3>
                <p>Identify import lines, suppliers, or reporting fields that remain incomplete.</p>
              </article>
              <article>
                <div className="gsh-gateIcon">{iconSwitch()}</div>
                <span>02</span>
                <h3>Method visibility</h3>
                <p>Separate actual information from default-value use and expose the fallback path.</p>
              </article>
              <article>
                <div className="gsh-gateIcon">{iconAlert()}</div>
                <span>03</span>
                <h3>Anomaly review</h3>
                <p>Surface sanity-check failures, outliers, and submissions requiring investigation.</p>
              </article>
              <article>
                <div className="gsh-gateIcon">{iconFile()}</div>
                <span>04</span>
                <h3>Output control</h3>
                <p>Move the report through the filing checklist and defined filing states.</p>
              </article>
            </div>

            <div className="gsh-outputPanel">
              <div className="gsh-outputCopy">
                <span className="gsh-kicker">Structured output workflow</span>
                <h3>From review to controlled filing status.</h3>
                <p>
                  The reporting model supports a structured output stage and a filing
                  status chain covering drafted, exported, submitted, accepted, and
                  rejected records.
                </p>
                <small>Module availability can vary by plan and implementation.</small>
              </div>

              <div className="gsh-outputTrack" aria-label="Filing states">
                {[
                  ["Drafted", true],
                  ["Exported", true],
                  ["Submitted", false],
                  ["Accepted", false],
                  ["Rejected", false],
                ].map(([label, active], index) => (
                  <div className={`gsh-outputState ${active ? "is-active" : ""}`} key={String(label)}>
                    <span>{active ? iconCheck() : index + 1}</span>
                    <strong>{label}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-section gsh-sectionSoft" aria-labelledby="management-title">
          <div className="gsh-container">
            <div className="gsh-management">
              <header className="gsh-sectionHead gsh-sectionHeadCompact">
                <span className="gsh-kicker">Management and audit controls</span>
                <h2 id="management-title" className="gsh-h2">
                  Use the same reporting data for planning, alerts, and evidence.
                </h2>
              </header>

              <div className="gsh-managementGrid">
                <article className="gsh-managementCard">
                  <div className="gsh-managementIcon">{iconForecast()}</div>
                  <h3>Exposure dashboard</h3>
                  <p>Review emissions and cost exposure by product, supplier, and country.</p>
                  <div className="gsh-bars" aria-hidden="true">
                    <span style={{ width: "78%" }} />
                    <span style={{ width: "56%" }} />
                    <span style={{ width: "34%" }} />
                  </div>
                </article>

                <article className="gsh-managementCard">
                  <div className="gsh-managementIcon">{iconSwitch()}</div>
                  <h3>Scenario comparison</h3>
                  <p>Compare default and actual-data positions and supplier-level differences.</p>
                  <div className="gsh-scenario">
                    <span><i /> Actual data</span>
                    <span><i /> Default mode</span>
                  </div>
                </article>

                <article className="gsh-managementCard">
                  <div className="gsh-managementIcon">{iconAlert()}</div>
                  <h3>Deadline and data alerts</h3>
                  <p>Bring missing information, deadlines, and compliance warnings into view.</p>
                  <div className="gsh-alertPreview">
                    <b>Action required</b>
                    <span>Supplier evidence incomplete</span>
                  </div>
                </article>

                <article className="gsh-managementCard">
                  <div className="gsh-managementIcon">{iconEvidence()}</div>
                  <h3>Evidence and audit lineage</h3>
                  <p>Connect import records, submissions, calculations, reports, and evidence.</p>
                  <div className="gsh-auditTrail">
                    <span>Import</span><i />
                    <span>Submission</span><i />
                    <span>Report</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="gsh-section" aria-labelledby="faq-title">
          <div className="gsh-container">
            <header className="gsh-sectionHead">
              <span className="gsh-kicker">Workflow FAQ</span>
              <h2 id="faq-title" className="gsh-h2">
                Practical questions about the reporting process.
              </h2>
            </header>

            <div className="gsh-faq">
              {faqItems.map((item) => (
                <details className="gsh-faqItem" key={item.question}>
                  <summary>{item.question}</summary>
                  <div>{item.answer}</div>
                </details>
              ))}
            </div>

            <div className="gsh-finalCta">
              <div>
                <span className="gsh-kicker">See the workflow on your data</span>
                <h2>Start with one import file and one reporting chain.</h2>
                <p>
                  Test the operating model on a real CBAM record, or ask for a
                  walkthrough covering entities, suppliers, calculations, and output.
                </p>
              </div>
              <div className="gsh-finalActions">
                <Link className="gsh-btn gsh-btnPrimary" href="/check">
                  Start free CBAM report
                </Link>
                <Link className="gsh-btn gsh-btnGhost" href="/en/contact">
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
  const howTo = {
    "@type": "HowTo",
    "@id": "https://www.grandscope.ai/en/how-it-works#howto",
    name: "How the GrandScope EU CBAM reporting workflow works",
    description:
      "A seven-stage workflow covering entity setup, import mapping, supplier collection, emissions calculations, reporting controls, forecasting, and audit evidence.",
    step: workflowSteps.map((step) => ({
      "@type": "HowToStep",
      position: Number(step.number),
      name: step.title,
      text: `${step.summary} Output: ${step.output}`,
      url: `https://www.grandscope.ai/en/how-it-works#step-${step.number}`,
    })),
  };

  const faq = {
    "@type": "FAQPage",
    "@id": "https://www.grandscope.ai/en/how-it-works#faq",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const webpage = {
    "@type": "WebPage",
    "@id": "https://www.grandscope.ai/en/how-it-works#page",
    url: "https://www.grandscope.ai/en/how-it-works",
    name: "How GrandScope Works | EU CBAM Reporting Workflow",
    description:
      "How GrandScope connects import data, suppliers, emissions calculations, evidence, and reporting controls.",
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://www.grandscope.ai/#website",
      name: "GrandScope",
      url: "https://www.grandscope.ai",
    },
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": "https://www.grandscope.ai/en/how-it-works#breadcrumb",
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
        name: "How it works",
        item: "https://www.grandscope.ai/en/how-it-works",
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webpage, breadcrumb, howTo, faq],
  };
}

function renderWorkflowIcon(icon: string) {
  switch (icon) {
    case "entity":
      return iconEntity();
    case "upload":
      return iconUpload();
    case "supplier":
      return iconSupplier();
    case "calculate":
      return iconCalculate();
    case "validate":
      return iconValidate();
    case "forecast":
      return iconForecast();
    case "audit":
      return iconShield();
    default:
      return iconCheck();
  }
}

function iconPlay() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m10 8 6 4-6 4V8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
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

function iconEntity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21V7l8-4 8 4v14M8 21v-4h8v4M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function iconValidate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3h10l4 4v14H5V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 3v5h5M8 14l2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function iconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.6 2.8 8.4 7 10 4.2-1.6 7-5.4 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconEvidence() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function iconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function iconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function iconAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const styles = `
.gsh-root{
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
.gsh-root,.gsh-root *,.gsh-root *::before,.gsh-root *::after{box-sizing:border-box}
.gsh-container{width:min(1420px,calc(100% - 32px));margin:0 auto}
.gsh-hero{padding:20px 0 44px}
.gsh-heroPanel{
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
.gsh-heroPanel::after{
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
.gsh-heroGrid{display:grid;grid-template-columns:1.08fr .92fr;gap:34px;align-items:center;position:relative;z-index:1}
.gsh-eyebrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:18px;margin-bottom:18px}
.gsh-pill,.gsh-kicker{
  display:inline-flex;
  align-items:center;
  font-size:12px;
  line-height:1;
  font-weight:900;
  letter-spacing:.095em;
  text-transform:uppercase;
}
.gsh-pill{padding:10px 13px;border-radius:999px;border:1px solid rgba(57,107,108,.30);background:rgba(255,255,255,.74);color:var(--text)}
.gsh-kicker{color:var(--brand);margin-bottom:10px}
.gsh-h1{font-size:clamp(48px,4.6vw,72px);line-height:1.02;letter-spacing:-.04em;margin:0 0 24px;font-weight:950;max-width:820px}
.gsh-lead{font-size:20px;line-height:1.78;color:var(--muted);max-width:800px;margin:0}
.gsh-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:26px}
.gsh-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:54px;
  padding:13px 18px;
  border-radius:14px;
  border:1px solid var(--border);
  text-decoration:none;
  font-weight:900;
  line-height:1.2;
  text-align:center;
  transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;
}
.gsh-btn:hover{transform:translateY(-1px);box-shadow:var(--shadowLift);border-color:var(--borderStrong)}
.gsh-btnPrimary{background:linear-gradient(180deg,var(--brand),var(--brandDark));color:#fff;border-color:rgba(57,107,108,.38)}
.gsh-btnGhost{background:rgba(255,255,255,.96);color:var(--text)}
.gsh-desktopDemoButton{gap:8px;cursor:pointer;font:inherit}
.gsh-desktopDemoButton svg{flex:0 0 auto}
.gsh-textLink{display:inline-flex;align-items:center;gap:5px;color:var(--support);font-weight:900;text-decoration:none;padding:10px 6px}
.gsh-textLink:hover{text-decoration:underline}
.gsh-trust{display:flex;gap:20px;flex-wrap:wrap;margin-top:20px;color:#656565;font-size:13px;font-weight:700}
.gsh-trust span{display:flex;align-items:center;gap:7px}
.gsh-trust svg{color:var(--success)}


.gsh-mobileWalkthrough{display:none}

.gsh-console{border-radius:24px;border:1px solid rgba(199,204,203,.95);background:rgba(255,255,255,.93);box-shadow:var(--shadow);overflow:hidden;min-width:0}
.gsh-consoleTop{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:22px 22px 18px;border-bottom:1px solid var(--border)}
.gsh-consoleTop>div{display:flex;flex-direction:column}
.gsh-consoleTop strong{font-size:25px;line-height:1.15;font-weight:950}
.gsh-live{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 10px;background:rgba(47,125,54,.08);border:1px solid rgba(47,125,54,.20);color:var(--success);font-size:12px;font-weight:900;white-space:nowrap}
.gsh-live i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px rgba(47,125,54,.11)}
.gsh-consoleBody{padding:20px 22px;background:radial-gradient(420px 180px at 12% 5%,rgba(255,216,23,.12),transparent 65%)}
.gsh-consoleRow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:13px;padding:14px;border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,.94)}
.gsh-consoleRowFinal{border-color:rgba(57,107,108,.38);box-shadow:0 12px 34px rgba(57,107,108,.09)}
.gsh-consoleIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(57,107,108,.23);color:var(--brand)}
.gsh-consoleRow>div{display:flex;flex-direction:column;min-width:0}
.gsh-consoleRow strong{font-size:15px;font-weight:900}
.gsh-consoleRow small{color:var(--muted);font-size:12px;line-height:1.45;margin-top:3px}
.gsh-consoleRow>b{font-size:11px;text-transform:uppercase;letter-spacing:.065em;color:var(--support);background:rgba(63,117,181,.08);border-radius:999px;padding:7px 8px;white-space:nowrap}
.gsh-connector{width:2px;height:15px;margin:0 0 0 35px;background:linear-gradient(var(--brand),var(--highlight));opacity:.7}
.gsh-consoleFoot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:14px 18px;background:rgba(233,236,235,.58);border-top:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:800}
.gsh-consoleFoot span{display:flex;align-items:center;gap:5px}

.gsh-videoSection{padding:0 0 54px}
.gsh-videoSection .gsh-container{width:min(1320px,calc(100% - 32px))}
.gsh-videoSurface{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  border:1px solid transparent;
  background:
    linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.89)) padding-box,
    linear-gradient(135deg,rgba(57,107,108,.58),rgba(255,216,23,.42),rgba(63,117,181,.32)) border-box;
  box-shadow:0 28px 88px rgba(26,42,44,.14);
  padding:28px;
}
.gsh-videoSurface::before{
  content:"";
  position:absolute;
  width:540px;
  height:540px;
  right:-300px;
  top:-330px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,216,23,.18),rgba(63,117,181,.08) 46%,transparent 70%);
  pointer-events:none;
}
.gsh-videoHeader{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:end;
  gap:28px;
  margin-bottom:20px;
}
.gsh-videoHeader>div:first-child{max-width:920px}
.gsh-videoHeader .gsh-h2{margin-bottom:10px}
.gsh-videoHeader p{font-size:17px;line-height:1.72;color:var(--muted);margin:0;max-width:880px}
.gsh-videoBadge{
  display:flex;
  align-items:center;
  gap:11px;
  min-width:220px;
  border:1px solid rgba(57,107,108,.25);
  border-radius:17px;
  background:rgba(255,255,255,.84);
  padding:12px 14px;
  box-shadow:0 12px 34px rgba(22,35,37,.07);
}
.gsh-videoBadgeIcon{
  width:42px;
  height:42px;
  flex:0 0 42px;
  border-radius:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  background:linear-gradient(180deg,var(--brand),var(--brandDark));
  box-shadow:0 8px 20px rgba(57,107,108,.22);
}
.gsh-videoBadge>div{display:flex;flex-direction:column}
.gsh-videoBadge strong{font-size:14px;font-weight:950;line-height:1.25}
.gsh-videoBadge small{font-size:11px;color:var(--muted);margin-top:3px}
.gsh-videoFrame{
  position:relative;
  width:min(100%,1120px);
  margin:0 auto;
  z-index:1;
  overflow:hidden;
  border-radius:22px;
  border:1px solid var(--borderStrong);
  background:#142729;
  box-shadow:0 26px 70px rgba(22,35,37,.18);
}
.gsh-videoTopbar{
  min-height:43px;
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:12px;
  padding:9px 14px;
  color:#5f6c6d;
  background:linear-gradient(180deg,#fdfefe,#edf0ef);
  border-bottom:1px solid rgba(159,174,172,.75);
}
.gsh-videoTopbar strong{font-size:11px;letter-spacing:.025em;text-align:center;white-space:nowrap}
.gsh-videoDots{display:flex;align-items:center;gap:6px;justify-self:start}
.gsh-videoDots i{width:9px;height:9px;border-radius:50%;display:block;background:#aab5b4}
.gsh-videoDots i:first-child{background:var(--brand)}
.gsh-videoDots i:nth-child(2){background:var(--highlight);border:1px solid #c9aa00}
.gsh-videoDots i:last-child{background:var(--support)}
.gsh-videoQuality{
  justify-self:end;
  border-radius:999px;
  border:1px solid rgba(63,117,181,.20);
  background:rgba(63,117,181,.08);
  color:var(--support);
  padding:5px 8px;
  font-size:9px;
  font-weight:950;
  letter-spacing:.08em;
}
.gsh-videoStage{
  position:relative;
  background:#142729;
  overflow:hidden;
}
.gsh-video{
  display:block;
  width:100%;
  height:auto;
  max-height:none;
  object-fit:contain;
  background:#142729;
}
.gsh-videoStage:not(.is-playing) .gsh-video{
  filter:blur(3px) brightness(.62) saturate(.82);
  transform:none;
}
.gsh-video:focus-visible{outline:3px solid rgba(255,216,23,.70);outline-offset:-3px}
.gsh-videoOverlay{
  position:absolute;
  inset:0;
  z-index:3;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  border:0;
  padding:24px;
  color:#fff;
  cursor:pointer;
  background:linear-gradient(180deg,rgba(15,31,33,.12),rgba(15,31,33,.42));
  backdrop-filter:blur(3px);
  -webkit-backdrop-filter:blur(3px);
  font:inherit;
  text-align:center;
}
.gsh-videoOverlay::after{
  content:"";
  position:absolute;
  inset:0;
  background:radial-gradient(circle at 50% 50%,rgba(255,216,23,.12),transparent 36%);
  pointer-events:none;
}
.gsh-videoOverlayGlow{
  position:absolute;
  width:170px;
  height:170px;
  border-radius:50%;
  background:rgba(255,216,23,.16);
  filter:blur(35px);
  pointer-events:none;
}
.gsh-videoPlayButton{
  position:relative;
  z-index:1;
  width:84px;
  height:84px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#243a3c;
  background:linear-gradient(180deg,#ffe76c,var(--highlight));
  border:5px solid rgba(255,255,255,.88);
  box-shadow:0 18px 55px rgba(0,0,0,.34),0 0 0 12px rgba(255,255,255,.10);
  transition:transform .18s ease,box-shadow .18s ease;
}
.gsh-videoPlayButton svg{width:31px;height:31px;margin-left:4px}
.gsh-videoOverlay strong{position:relative;z-index:1;font-size:22px;font-weight:950;text-shadow:0 2px 16px rgba(0,0,0,.5)}
.gsh-videoOverlay small{position:relative;z-index:1;font-size:13px;font-weight:800;color:rgba(255,255,255,.88)}
.gsh-videoOverlay:hover .gsh-videoPlayButton{transform:scale(1.07);box-shadow:0 22px 65px rgba(0,0,0,.40),0 0 0 15px rgba(255,255,255,.12)}
.gsh-videoOverlay:focus-visible{outline:4px solid var(--highlight);outline-offset:-4px}

.gsh-videoHighlights{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
  margin-top:14px;
}
.gsh-videoHighlights span{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  min-height:46px;
  border-radius:14px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.85);
  color:#5f6767;
  padding:10px 12px;
  font-size:12px;
  font-weight:850;
  text-align:center;
}
.gsh-videoHighlights svg{flex:0 0 16px;color:var(--success)}

.gsh-section{padding:50px 0}
.gsh-sectionSoft{background:linear-gradient(180deg,rgba(225,229,228,.52),rgba(243,244,243,.24))}
.gsh-sectionHead{max-width:900px;margin-bottom:26px}
.gsh-sectionHeadCompact{margin-bottom:22px}
.gsh-h2{font-size:clamp(32px,3.3vw,48px);line-height:1.08;letter-spacing:-.035em;margin:0 0 12px;font-weight:950}
.gsh-sectionHead p,.gsh-sectionLead{font-size:17px;line-height:1.75;color:var(--muted);margin:0;max-width:840px}

.gsh-steps{display:grid;gap:14px}
.gsh-step{display:grid;grid-template-columns:66px minmax(0,1fr);gap:14px;align-items:stretch}
.gsh-stepRail{display:flex;flex-direction:column;align-items:center}
.gsh-stepRail span{width:50px;height:50px;border-radius:17px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--borderStrong);font-weight:950;box-shadow:0 9px 26px rgba(20,38,40,.08)}
.gsh-stepRail i{width:2px;flex:1;min-height:30px;background:linear-gradient(var(--brand),rgba(63,117,181,.18));margin-top:8px;border-radius:999px}
.gsh-step:last-child .gsh-stepRail i{opacity:0}
.gsh-stepCard{border:1px solid var(--border);border-radius:22px;background:rgba(255,255,255,.94);padding:20px;box-shadow:0 1px 0 rgba(20,38,40,.03);min-width:0}
.gsh-stepCard:hover{border-color:rgba(57,107,108,.42);box-shadow:var(--shadow)}
.gsh-stepTop{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.gsh-stepIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--brand);border:1px solid rgba(57,107,108,.22);background:radial-gradient(120px 50px at 25% 20%,rgba(255,216,23,.16),transparent 70%),#fff}
.gsh-stepLabel{font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--support)}
.gsh-stepContent{display:grid;grid-template-columns:1.25fr .9fr .7fr;gap:22px;align-items:start}
.gsh-stepMain h3{font-size:26px;line-height:1.14;letter-spacing:-.025em;margin:0 0 8px;font-weight:950}
.gsh-stepMain p{margin:0;color:var(--muted);line-height:1.7}
.gsh-stepInputs,.gsh-stepOutput{border-left:1px solid var(--border);padding-left:20px}
.gsh-stepInputs>span,.gsh-stepOutput>span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.085em;font-weight:900;color:var(--muted);margin-bottom:9px}
.gsh-stepInputs ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.gsh-stepInputs li{display:flex;align-items:flex-start;gap:7px;color:#5f5f5f;font-size:13px;line-height:1.42}
.gsh-stepInputs svg{flex:0 0 16px;color:var(--success);margin-top:1px}
.gsh-stepOutput strong{display:block;font-size:15px;line-height:1.5;color:var(--text)}

.gsh-surface{position:relative;border:1px solid var(--border);border-radius:26px;background:rgba(255,255,255,.95);box-shadow:var(--shadow);padding:28px;overflow:hidden}
.gsh-surface::before{content:"";position:absolute;left:24px;right:24px;top:10px;height:2px;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--highlight),var(--support))}
.gsh-recordFlow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;align-items:stretch;margin-top:8px}
.gsh-recordUnit{display:grid;grid-template-columns:minmax(0,1fr) 34px;align-items:center;min-width:0}
.gsh-recordUnit:last-child{grid-template-columns:minmax(0,1fr)}
.gsh-recordUnit article{height:100%;min-height:190px;border:1px solid var(--border);border-radius:18px;background:#fff;padding:18px;display:flex;flex-direction:column;min-width:0}
.gsh-recordIndex{font-size:11px;font-weight:950;color:var(--support);margin-bottom:18px}
.gsh-recordUnit small{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--muted)}
.gsh-recordUnit strong{font-size:18px;line-height:1.4;margin-top:8px;overflow-wrap:anywhere}
.gsh-recordUnit b{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:16px;font-size:12px;color:var(--success)}
.gsh-recordArrow{display:flex;align-items:center;justify-content:center;color:var(--support)}
.gsh-lineageNote{display:flex;align-items:flex-start;gap:14px;margin-top:18px;border-radius:18px;padding:17px;background:radial-gradient(520px 160px at 10% 20%,rgba(57,107,108,.10),transparent 62%),rgba(233,236,235,.55);border:1px solid var(--border)}
.gsh-lineageIcon{width:42px;height:42px;flex:0 0 42px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(57,107,108,.22);color:var(--brand)}
.gsh-lineageNote strong{font-size:17px}
.gsh-lineageNote p{margin:5px 0 0;color:var(--muted);line-height:1.65}

.gsh-split{display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:start}
.gsh-twoCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:22px}
.gsh-roleCard{border:1px solid var(--border);border-radius:20px;background:rgba(255,255,255,.94);padding:18px}
.gsh-roleIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--brand);background:#fff;border:1px solid rgba(57,107,108,.22)}
.gsh-roleCard h3{font-size:20px;margin:14px 0 12px;font-weight:950}
.gsh-roleCard ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.gsh-roleCard li{display:flex;align-items:flex-start;gap:7px;color:var(--muted);font-size:13px;line-height:1.5}
.gsh-roleCard li svg{flex:0 0 16px;color:var(--success);margin-top:2px}
.gsh-statusPanel{border:1px solid var(--border);border-radius:24px;background:rgba(255,255,255,.96);box-shadow:var(--shadow);padding:22px;min-width:0}
.gsh-statusHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid var(--border)}
.gsh-statusHead h3{font-size:25px;margin:0;font-weight:950}
.gsh-statusCount{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;padding:8px 10px;border-radius:999px;background:rgba(63,117,181,.08);color:var(--support);white-space:nowrap}
.gsh-statusList{display:grid;margin-top:8px}
.gsh-statusRow{display:grid;grid-template-columns:16px minmax(0,1fr) 22px;gap:10px;align-items:center;padding:13px 4px;border-bottom:1px solid rgba(205,210,209,.7)}
.gsh-statusRow:last-child{border-bottom:none}
.gsh-statusDot{width:10px;height:10px;border-radius:50%;border:2px solid var(--borderStrong);background:#fff}
.gsh-statusRow>div{display:flex;flex-direction:column}
.gsh-statusRow strong{font-size:14px}
.gsh-statusRow small{font-size:12px;color:var(--muted);line-height:1.4;margin-top:3px}
.gsh-statusRow>b{display:flex;color:var(--muted)}
.gsh-status-complete .gsh-statusDot{background:var(--success);border-color:var(--success)}
.gsh-status-complete>b{color:var(--success)}
.gsh-status-active{background:linear-gradient(90deg,rgba(255,216,23,.11),transparent);border-radius:12px;padding-left:10px;padding-right:10px}
.gsh-status-active .gsh-statusDot{background:var(--highlight);border-color:#C9A800;box-shadow:0 0 0 4px rgba(255,216,23,.16)}
.gsh-status-active>b{color:var(--warning)}

.gsh-ledgerSurface{display:grid;grid-template-columns:.9fr 1.1fr;gap:26px;align-items:center}
.gsh-ledgerIntro>p{font-size:17px;line-height:1.75;color:var(--muted);margin:0}
.gsh-modeCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px}
.gsh-modeCards article{border:1px solid var(--border);border-radius:17px;background:#fff;padding:15px}
.gsh-modeCards span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--support);margin-bottom:7px}
.gsh-modeCards strong{display:block;font-size:15px}
.gsh-modeCards p{font-size:12px;line-height:1.55;color:var(--muted);margin:7px 0 0}
.gsh-ledger{border:1px solid var(--borderStrong);border-radius:22px;background:#fff;overflow:hidden;min-width:0}
.gsh-ledger:focus-visible{outline:3px solid rgba(57,107,108,.18);outline-offset:3px}
.gsh-ledgerBar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;background:linear-gradient(90deg,rgba(57,107,108,.12),rgba(255,216,23,.08),rgba(63,117,181,.08));border-bottom:1px solid var(--border)}
.gsh-ledgerBar span{display:flex;align-items:center;gap:8px;font-weight:950}
.gsh-ledgerBar svg{color:var(--brand)}
.gsh-ledgerBar b{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--success);background:rgba(47,125,54,.08);border-radius:999px;padding:7px 8px}
.gsh-ledger dl{margin:0;padding:7px 17px}
.gsh-ledger dl>div{display:grid;grid-template-columns:145px minmax(0,1fr);gap:14px;padding:11px 0;border-bottom:1px solid rgba(205,210,209,.67)}
.gsh-ledger dl>div:last-child{border-bottom:none}
.gsh-ledger dt{font-size:12px;font-weight:900;color:var(--muted)}
.gsh-ledger dd{margin:0;font-size:13px;font-weight:800;overflow-wrap:anywhere}
.gsh-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.gsh-dataTag,.gsh-clearTag{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:900}
.gsh-dataTag{background:rgba(63,117,181,.09);color:var(--support)}
.gsh-clearTag{background:rgba(47,125,54,.08);color:var(--success)}
.gsh-ledgerFoot{display:flex;align-items:center;gap:7px;padding:12px 17px;background:rgba(233,236,235,.48);border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.4}

.gsh-gateGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gsh-gateGrid article{position:relative;border:1px solid var(--border);border-radius:20px;background:rgba(255,255,255,.94);padding:18px;min-width:0}
.gsh-gateIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--brand);background:#fff;border:1px solid rgba(57,107,108,.22)}
.gsh-gateGrid article>span{position:absolute;top:18px;right:18px;font-size:11px;font-weight:950;color:var(--support)}
.gsh-gateGrid h3{font-size:20px;margin:15px 0 8px;font-weight:950}
.gsh-gateGrid p{color:var(--muted);line-height:1.65;margin:0;font-size:14px}
.gsh-outputPanel{display:grid;grid-template-columns:.9fr 1.1fr;gap:24px;align-items:center;margin-top:15px;border-radius:22px;border:1px solid transparent;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.89)) padding-box,linear-gradient(135deg,rgba(57,107,108,.55),rgba(255,216,23,.45),rgba(63,117,181,.27)) border-box;padding:23px;box-shadow:var(--shadow)}
.gsh-outputCopy h3{font-size:27px;line-height:1.15;letter-spacing:-.025em;margin:0 0 8px;font-weight:950}
.gsh-outputCopy p{color:var(--muted);line-height:1.7;margin:0}
.gsh-outputCopy small{display:block;color:var(--muted);font-size:11px;margin-top:10px}
.gsh-outputTrack{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.gsh-outputState{position:relative;border:1px solid var(--border);border-radius:15px;background:#fff;padding:13px 9px;text-align:center;min-width:0}
.gsh-outputState span{width:28px;height:28px;margin:0 auto 8px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(233,236,235,.75);font-size:11px;font-weight:950;color:var(--muted)}
.gsh-outputState strong{display:block;font-size:11px;overflow-wrap:anywhere}
.gsh-outputState.is-active{border-color:rgba(57,107,108,.42);background:radial-gradient(120px 50px at 20% 0%,rgba(255,216,23,.13),transparent 70%),#fff}
.gsh-outputState.is-active span{background:var(--brand);color:#fff}

.gsh-management{border-radius:26px;border:1px solid var(--border);background:rgba(255,255,255,.94);box-shadow:var(--shadow);padding:28px}
.gsh-managementGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gsh-managementCard{border:1px solid var(--border);border-radius:20px;background:#fff;padding:18px;min-width:0}
.gsh-managementIcon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--brand);border:1px solid rgba(57,107,108,.22);background:radial-gradient(120px 50px at 20% 10%,rgba(255,216,23,.15),transparent 70%),#fff}
.gsh-managementCard h3{font-size:20px;margin:15px 0 8px;font-weight:950}
.gsh-managementCard p{color:var(--muted);font-size:14px;line-height:1.65;margin:0;min-height:69px}
.gsh-bars{display:grid;gap:7px;margin-top:18px}
.gsh-bars span{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--support))}
.gsh-scenario{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:18px}
.gsh-scenario span{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:900;color:var(--muted)}
.gsh-scenario i{width:9px;height:9px;border-radius:3px;background:var(--brand)}
.gsh-scenario span:last-child i{background:var(--highlight);border:1px solid #C6A900}
.gsh-alertPreview{margin-top:18px;border-radius:12px;padding:10px;background:rgba(255,216,23,.11);border:1px solid rgba(198,169,0,.22);display:flex;flex-direction:column}
.gsh-alertPreview b{font-size:11px;color:var(--warning)}
.gsh-alertPreview span{font-size:10px;color:var(--muted);margin-top:3px}
.gsh-auditTrail{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:18px}
.gsh-auditTrail span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:900;padding:6px 7px;border-radius:8px;background:rgba(233,236,235,.8);border:1px solid var(--border)}
.gsh-auditTrail i{width:11px;height:1px;background:var(--support)}

.gsh-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gsh-faqItem{border:1px solid var(--border);border-radius:18px;background:rgba(255,255,255,.95);padding:14px 15px;min-width:0}
.gsh-faqItem summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-weight:950;line-height:1.45}
.gsh-faqItem summary::-webkit-details-marker{display:none}
.gsh-faqItem summary::before{content:"?";width:30px;height:30px;flex:0 0 30px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--brand);border:1px solid rgba(57,107,108,.22);background:radial-gradient(100px 40px at 20% 20%,rgba(255,216,23,.18),transparent 70%),#fff}
.gsh-faqItem summary::after{content:"▾";margin-left:auto;color:var(--muted);transition:transform .14s ease}
.gsh-faqItem[open] summary::after{transform:rotate(180deg)}
.gsh-faqItem>div{color:var(--muted);line-height:1.72;margin-top:10px;padding-left:40px}
.gsh-finalCta{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:24px;border-radius:26px;border:1px solid transparent;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.88)) padding-box,linear-gradient(135deg,rgba(57,107,108,.60),rgba(255,216,23,.45),rgba(63,117,181,.28)) border-box;padding:28px;box-shadow:var(--shadow)}
.gsh-finalCta>div:first-child{max-width:780px}
.gsh-finalCta h2{font-size:clamp(28px,3vw,42px);line-height:1.08;letter-spacing:-.03em;margin:0 0 9px;font-weight:950}
.gsh-finalCta p{color:var(--muted);line-height:1.7;margin:0}
.gsh-finalActions{display:flex;gap:10px;flex-wrap:wrap;flex:0 0 auto}

@media(max-width:1180px){
  .gsh-stepContent{grid-template-columns:1.2fr .9fr}
  .gsh-stepOutput{grid-column:1/-1;border-left:none;border-top:1px solid var(--border);padding:14px 0 0}
  .gsh-gateGrid,.gsh-managementGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gsh-recordFlow{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .gsh-recordUnit{grid-template-columns:minmax(0,1fr)}
  .gsh-recordArrow{display:none}
}
@media(max-width:920px){
  .gsh-heroGrid,.gsh-split,.gsh-ledgerSurface,.gsh-outputPanel{grid-template-columns:1fr}
  .gsh-videoHeader{grid-template-columns:1fr;align-items:start}
  .gsh-videoBadge{min-width:0;width:max-content;max-width:100%}
  .gsh-console{max-width:720px}
  .gsh-outputTrack{grid-template-columns:repeat(5,minmax(100px,1fr));overflow-x:auto;padding-bottom:5px}
  .gsh-finalCta{align-items:flex-start;flex-direction:column}
  .gsh-finalActions{width:100%}
}
@media(max-width:720px){

  .gsh-desktopDemoButton{display:none}

  .gsh-mobileWalkthrough{
    display:block;
    margin-top:26px;
    padding:18px;
    border-radius:20px;
    border:1px solid rgba(57,107,108,.28);
    background:rgba(255,255,255,.92);
    box-shadow:0 18px 48px rgba(22,35,37,.10);
  }
  .gsh-mobileWalkthrough .gsh-kicker{margin-bottom:9px}
  .gsh-mobileWalkthrough h2{
    margin:0 0 15px;
    font-size:27px;
    line-height:1.1;
    letter-spacing:-.03em;
    font-weight:950;
  }
  .gsh-mobileVideoStage{
    position:relative;
    overflow:hidden;
    width:100%;
    border-radius:16px;
    border:1px solid var(--borderStrong);
    background:#142729;
    box-shadow:0 18px 42px rgba(22,35,37,.16);
  }
  .gsh-mobileVideo{
    display:block;
    width:100%;
    height:auto;
    object-fit:contain;
    background:#142729;
  }
  .gsh-mobileVideoStage:not(.is-playing) .gsh-mobileVideo{
    filter:blur(2.5px) brightness(.62) saturate(.85);
  }
  .gsh-mobileVideoOverlay{
    position:absolute;
    inset:0;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:7px;
    width:100%;
    border:0;
    padding:18px;
    color:#fff;
    cursor:pointer;
    background:linear-gradient(180deg,rgba(15,31,33,.12),rgba(15,31,33,.45));
    backdrop-filter:blur(2px);
    -webkit-backdrop-filter:blur(2px);
    font:inherit;
    text-align:center;
  }
  .gsh-mobilePlayButton{
    width:68px;
    height:68px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#243a3c;
    background:linear-gradient(180deg,#ffe76c,var(--highlight));
    border:4px solid rgba(255,255,255,.9);
    box-shadow:0 15px 40px rgba(0,0,0,.34),0 0 0 9px rgba(255,255,255,.1);
  }
  .gsh-mobilePlayButton svg{width:27px;height:27px;margin-left:3px}
  .gsh-mobileVideoOverlay strong{font-size:18px;font-weight:950;text-shadow:0 2px 12px rgba(0,0,0,.5)}
  .gsh-mobileVideoOverlay small{font-size:12px;font-weight:800;color:rgba(255,255,255,.88)}
  .gsh-mobileVideoMeta{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    flex-wrap:wrap;
    margin-top:11px;
    color:var(--muted);
    font-size:12px;
  }
  .gsh-mobileVideoMeta strong{color:var(--text);font-weight:950}
  .gsh-mobileVideoMeta span::before{content:"•";margin-right:8px;color:var(--brand)}
  .gsh-videoSection{display:none}
  .gsh-container{width:min(100% - 22px,1420px)}
  .gsh-videoSection .gsh-container{width:min(100% - 18px,1320px)}
  .gsh-videoSurface{padding:14px}
  .gsh-videoFrame{width:100%}
  .gsh-hero{padding-top:12px}
  .gsh-heroPanel,.gsh-surface,.gsh-management{padding:19px}
  .gsh-videoSurface{padding:16px;border-radius:22px}
  .gsh-videoSection{padding-bottom:40px}
  .gsh-videoHeader{gap:17px;margin-bottom:15px}
  .gsh-videoHeader p{font-size:16px}
  .gsh-videoFrame{border-radius:17px}
  .gsh-videoHighlights{grid-template-columns:1fr}
  .gsh-videoHighlights span{justify-content:flex-start;text-align:left}
  .gsh-h1{font-size:43px;line-height:1.04}
  .gsh-lead{font-size:18px}
  .gsh-section{padding:38px 0}
  .gsh-step{grid-template-columns:1fr}
  .gsh-stepRail{display:none}
  .gsh-stepContent{grid-template-columns:1fr}
  .gsh-stepInputs,.gsh-stepOutput{border-left:none;border-top:1px solid var(--border);padding:14px 0 0}
  .gsh-twoCards,.gsh-recordFlow,.gsh-gateGrid,.gsh-managementGrid,.gsh-faq{grid-template-columns:1fr}
  .gsh-recordUnit article{min-height:0}
  .gsh-modeCards{grid-template-columns:1fr}
  .gsh-ledger dl>div{grid-template-columns:1fr;gap:4px}
  .gsh-managementCard p{min-height:0}
  .gsh-btn{width:100%}
  .gsh-textLink{width:100%;justify-content:center}
  .gsh-actions{width:100%}
  .gsh-finalActions{display:grid;grid-template-columns:1fr}
  .gsh-trust{display:grid;gap:9px}
}
@media(max-width:470px){
  .gsh-h1{font-size:38px}
  .gsh-h2{font-size:31px}
  .gsh-heroPanel{border-radius:22px}
  .gsh-eyebrow{font-size:15px}
  .gsh-consoleRow{grid-template-columns:42px minmax(0,1fr)}
  .gsh-consoleRow>b{grid-column:2;justify-self:start}
  .gsh-consoleFoot{display:grid;gap:8px}
  .gsh-videoTopbar{grid-template-columns:1fr auto}
  .gsh-videoTopbar strong{display:none}
  .gsh-videoBadge{width:100%}
  .gsh-stepMain h3{font-size:23px}
}
`;
