'use client';

import { useMemo, useState } from "react";
import Link from "next/link";

type PenaltyCalculatorProps = {
  penaltyCalculatorHref?: string;
  /**
   * Set to true if you are NOT already wrapping this component in a `.gsx-topStrip` section.
   * The homepage already wraps it, so the default is false to avoid nested sections.
   */
  withWrapper?: boolean;
};

export function PenaltyCalculator({
  penaltyCalculatorHref = "/tools/penalty-calculator",
  withWrapper = false,
}: PenaltyCalculatorProps) {
  // Use a string state so the number input can be cleared without forcing "0"
  // and to avoid "NaN" showing up as the input value in some browsers.
  const [tco2eInput, setTco2eInput] = useState<string>("1");
  const [rate, setRate] = useState<number>(25);

  const { estimatedPenalty, safeRate } = useMemo(() => {
    const parsed = Number.parseFloat(tco2eInput);
    const t = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

    const r = Number.isFinite(rate) ? Math.max(10, Math.min(50, rate)) : 25;

    return { estimatedPenalty: t * r, safeRate: r };
  }, [tco2eInput, rate]);

  const EUR = "\u20AC";

  const inner = (
    <div className="gsx-container">
      <div className="gsx-stripCard">
        <div className="gsx-stripLeft">
          <div className="gsx-stripKicker">CBAM exposure</div>
          <div className="gsx-stripTitle">Penalty estimator</div>
          <div className="gsx-stripSub">
            {`Indicative range used for missing or incorrect reports: ${EUR}10 to ${EUR}50 per tonne of unreported embedded emissions.`}
          </div>
        </div>

        <div className="gsx-stripRight">
          <label className="gsx-stripField">
            <span className="gsx-stripLabel">Unreported emissions (tCO2e)</span>
            <input
              className="gsx-input"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={tco2eInput}
              onChange={(e) => setTco2eInput(e.target.value)}
            />
          </label>

          <label className="gsx-stripField">
            <span className="gsx-stripLabel">{`Rate (${EUR}/tonne)`}</span>
            <input
              className="gsx-range"
              type="range"
              min={10}
              max={50}
              step={1}
              value={safeRate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <div className="gsx-rangeMeta">
              <span className="gsx-muted">10</span>
              <span className="gsx-rateValue">{safeRate}</span>
              <span className="gsx-muted">50</span>
            </div>
          </label>

          <div className="gsx-stripResult" aria-label="Estimated penalty result">
            <div className="gsx-stripResultLabel">Estimated penalty</div>
            <div className="gsx-stripResultValue">{`${EUR}${estimatedPenalty.toFixed(2)}`}</div>
          </div>

          <div className="gsx-stripActions">
            <Link className="gsx-miniLink" href={penaltyCalculatorHref}>
              Open full calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (withWrapper) {
    return (
      <section className="gsx-topStrip" aria-label="CBAM penalty exposure estimator">
        {inner}
      </section>
    );
  }

  return inner;
}

export default PenaltyCalculator;
