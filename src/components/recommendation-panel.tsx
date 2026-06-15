import { Panel, StatusTag } from "@/components/briefing";
import { VerdictBadge } from "@/components/verdict-badge";
import { bestAirportStay } from "@/components/airport-intelligence";
import type { AirportIntelligence } from "@/lib/airport-intelligence";
import { TRAVELER_TYPES } from "@/lib/mock-data";
import type { ComparisonResult, ScoredStay } from "@/lib/scoring";

const CONFIDENCE_RANK = { High: 0, Medium: 1, Low: 2 } as const;

function topReasons(entry: ScoredStay, isBestConnected: boolean): string[] {
  return entry.explanations
    .filter(
      (explanation) =>
        explanation.score >= 70 && explanation.id !== "travelerFitScore"
    )
    .sort(
      (a, b) =>
        CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
        b.score - a.score
    )
    .slice(0, 3)
    .map((explanation) => {
      if (explanation.id === "airportAccessScore" && isBestConnected) {
        return "the shortest airport transfer";
      }
      const adjective = explanation.score >= 85 ? "excellent" : "strong";
      return `${adjective} ${explanation.label.toLowerCase()} (${explanation.score})`;
    });
}

function joinProse(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function RecommendationPanel({
  result,
  airports = {},
}: {
  result: ComparisonResult;
  airports?: Record<string, AirportIntelligence | null>;
}) {
  const { bestOverall, biggestRisk, scoredStays } = result;
  const bestAirport = airports[bestOverall.stay.id];
  const bestConnected = bestAirportStay(scoredStays, airports);
  const travelerLabel =
    TRAVELER_TYPES.find((type) => type.id === result.travelerType)?.label.toLowerCase() ??
    result.travelerType;
  const runnerUp = scoredStays.length > 1 ? scoredStays[1] : null;
  const sameStay = biggestRisk.stay.id === bestOverall.stay.id;
  const reasons = topReasons(
    bestOverall,
    bestConnected?.stay.id === bestOverall.stay.id
  );

  return (
    <Panel
      title="Primary recommendation"
      aside={<StatusTag status="go">Cleared</StatusTag>}
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-xl font-bold tracking-tight">
            {bestOverall.stay.name}
          </h3>
          <span className="data text-xl font-bold">
            {bestOverall.overallScore}
            <span className="text-sm font-normal text-muted-foreground">
              /100
            </span>
          </span>
        </div>
        <VerdictBadge verdict={bestOverall.verdict} />
      </div>

      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          Recommended for your {travelerLabel} profile,{" "}
          {reasons.length > 0
            ? `it leads the manifest on ${joinProse(reasons)}`
            : "it is the strongest overall fit"}
          .
        </p>
        {bestAirport && (
          <p>
            <span className="eyebrow">Transfer</span>{" "}
            <span className="data">
              {bestAirport.driveMinutes} min / {bestAirport.distanceKm} km
            </span>{" "}
            to {bestAirport.airport.name}
            {bestAirport.airport.iata ? ` (${bestAirport.airport.iata})` : ""}.
            {bestConnected && bestConnected.stay.id !== bestOverall.stay.id
              ? ` Fastest transfer on the shortlist is ${bestConnected.stay.name} (~${airports[bestConnected.stay.id]?.driveMinutes} min).`
              : " Shortest transfer on the shortlist."}
          </p>
        )}
        {runnerUp && runnerUp.stay.id !== bestOverall.stay.id && (
          <p className="text-muted-foreground">
            Fallback option: <span className="font-medium text-foreground">{runnerUp.stay.name}</span>{" "}
            at <span className="data">{runnerUp.overallScore}</span> if the
            primary books out.
          </p>
        )}
        {!sameStay && (
          <p className="text-muted-foreground">
            Lowest-rated:{" "}
            <span className="font-medium text-foreground">{biggestRisk.stay.name}</span>{" "}
            (<span className="data">{biggestRisk.overallScore}</span>),{" "}
            {biggestRisk.cons[0]?.toLowerCase() ?? "trails across several categories"}.
          </p>
        )}
      </div>
    </Panel>
  );
}
