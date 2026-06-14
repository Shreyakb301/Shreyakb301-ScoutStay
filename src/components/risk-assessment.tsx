import { Panel, StatusTag, scoreStatus } from "@/components/briefing";
import { buildDecisionBrief } from "@/lib/decision-brief";
import { quietRiskLabel } from "@/lib/nearby-places";
import type { ComparisonResult, ScoredStay, ScoreWeights } from "@/lib/scoring";

const NOISE_STATUS = {
  Low: "go",
  Moderate: "caution",
  High: "nogo",
} as const;

function noiseCell(entry: ScoredStay) {
  if (!entry.nearby) return <StatusTag status="neutral">No data</StatusTag>;
  const risk = quietRiskLabel(entry.nearby.scores.quietRiskScore);
  return <StatusTag status={NOISE_STATUS[risk]}>{risk}</StatusTag>;
}

function transferCell(entry: ScoredStay) {
  const airport = entry.airport;
  if (!airport) return <StatusTag status="neutral">No data</StatusTag>;
  const status =
    airport.driveMinutes <= 20
      ? "go"
      : airport.driveMinutes <= 40
        ? "caution"
        : "nogo";
  return <StatusTag status={status}>~{airport.driveMinutes} min</StatusTag>;
}

function dataCell(entry: ScoredStay) {
  return entry.nearby ? (
    <StatusTag status="go">Live</StatusTag>
  ) : (
    <StatusTag status="caution">Estimate</StatusTag>
  );
}

export function RiskAssessment({
  result,
  weights,
}: {
  result: ComparisonResult;
  weights: ScoreWeights;
}) {
  const brief = buildDecisionBrief(result, weights);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="Risk matrix" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="eyebrow h-9 px-3 text-left">Stay</th>
                <th className="eyebrow h-9 px-3 text-left">Overall</th>
                <th className="eyebrow h-9 px-3 text-left">Noise</th>
                <th className="eyebrow h-9 px-3 text-left">Transfer</th>
                <th className="eyebrow h-9 px-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {result.scoredStays.map((entry) => (
                <tr key={entry.stay.id} className="border-b border-border last:border-0">
                  <td className="max-w-40 truncate px-3 py-2.5 font-medium" title={entry.stay.name}>
                    {entry.stay.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusTag status={scoreStatus(entry.overallScore)}>
                      {entry.overallScore}
                    </StatusTag>
                  </td>
                  <td className="px-3 py-2.5">{noiseCell(entry)}</td>
                  <td className="px-3 py-2.5">{transferCell(entry)}</td>
                  <td className="px-3 py-2.5">{dataCell(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Watch items"
        aside={
          <span className="data text-xs text-muted-foreground">
            {String(brief.warnings.length).padStart(2, "0")}
          </span>
        }
        bodyClassName="p-0"
      >
        {brief.warnings.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No material risk flags raised for this shortlist.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {brief.warnings.map((warning) => (
              <li
                key={warning}
                className="flex gap-2.5 px-4 py-3 text-sm leading-relaxed"
              >
                <span className="mt-1.5 size-1.5 shrink-0 bg-caution" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
