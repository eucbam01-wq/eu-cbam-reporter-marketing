// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\PenaltyCalculator.tsx
import { useMemo, useState } from "react";
import Link from "next/link";

export default function PenaltyCalculator(props: { penaltyCalculatorHref: string }) {
  const [tco2e, setTco2e] = useState<number>(1);
  const [rate, setRate] = useState<number>(25);

  const estimatedPenalty = useMemo(() => {
    const t = Number.isFinite(tco2e) ? Math.max(0, tco2e) : 0;
    const r = Number.isFinite(rate) ? Math.max(10, Math.min(50, rate)) : 25;
    return t * r;
  }, [tco2e, rate]);

  return (
    <div className="gsx-container">
      <div className="gsx-stripCard">
        <div className="gsx-stripLeft">
          <div className="gsx-stripKicker">CBAM exposure</div>
          <div className="gsx-stripTitle">Penalty estimator</div>
          <div className="gsx-stripSub">
            Indicative range used for missing or incorrect reports: EUR 10 to EUR 50 per tonne of unreported embedded emissions.
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
              value={String(tco2e)}
              onChange={(e) => setTco2e(Number(e.target.value))}
            />
          </label>

          <label className="gsx-stripField">
            <span className="gsx-stripLabel">Rate (EUR/tonne)</span>
            <input
              className="gsx-range"
              type="range"
              min={10}
              max={50}
              step={1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <div className="gsx-rangeMeta">
              <span className="gsx-muted">10</span>
              <span className="gsx-rateValue">{rate}</span>
              <span className="gsx-muted">50</span>
            </div>
          </label>

          <div className="gsx-stripResult" aria-label="Estimated penalty result">
            <div className="gsx-stripResultLabel">Estimated penalty</div>
            <div className="gsx-stripResultValue">EUR {estimatedPenalty.toFixed(2)}</div>
          </div>

          <div className="gsx-stripActions">
            <Link className="gsx-miniLink" href={props.penaltyCalculatorHref}>
              Open full calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\PenaltyCalculator.tsx
