import { Lightbulb } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerdictBadge } from "@/components/verdict-badge";
import { bestAirportStay } from "@/components/airport-intelligence";
import type { AirportIntelligence } from "@/lib/airport-intelligence";
import { TRAVELER_TYPES } from "@/lib/mock-data";
import type { ComparisonResult, ScoredStay } from "@/lib/scoring";

const CONFIDENCE_RANK = { High: 0, Medium: 1, Low: 2 } as const;

/**
 * The strongest reasons behind the top pick, phrased for prose. Prefers
 * high-confidence (real-data) explanations, then higher scores.
 */
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
  /** Nearest-airport data keyed by stay id, when available. */
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
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="size-4" />
          </span>
          <div>
            <CardTitle>Our recommendation</CardTitle>
            <CardDescription>
              Based on your {travelerLabel} trip priorities
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          <span className="font-semibold">{bestOverall.stay.name}</span> is your
          strongest pick at{" "}
          <span className="font-semibold tabular-nums">
            {bestOverall.overallScore}/100
          </span>{" "}
          <VerdictBadge verdict={bestOverall.verdict} className="align-middle" />
          {" — "}
          {reasons.length > 0
            ? `it ranks first because it has ${joinProse(reasons)}`
            : "it's the best overall fit"}
          , making it the strongest match for a {travelerLabel} trip.
        </p>
        {bestAirport && (
          <p>
            Airport access: about{" "}
            <span className="font-medium">
              {bestAirport.driveMinutes} min ({bestAirport.distanceKm} km)
            </span>{" "}
            to {bestAirport.airport.name}
            {bestAirport.airport.iata ? ` (${bestAirport.airport.iata})` : ""}.
            {bestConnected && bestConnected.stay.id !== bestOverall.stay.id
              ? ` If a quick transfer matters most, ${bestConnected.stay.name} is your best-connected stay (~${airports[bestConnected.stay.id]?.driveMinutes} min).`
              : " That's also the shortest airport transfer of your shortlist."}
          </p>
        )}
        {runnerUp && runnerUp.stay.id !== bestOverall.stay.id && (
          <p>
            <span className="font-medium">{runnerUp.stay.name}</span> is a solid
            backup at {runnerUp.overallScore}/100 if your first choice books out.
          </p>
        )}
        {!sameStay && (
          <p className="text-muted-foreground">
            Watch out for <span className="font-medium text-foreground">{biggestRisk.stay.name}</span>{" "}
            ({biggestRisk.overallScore}/100) — it scored lowest for this trip:{" "}
            {biggestRisk.cons[0]?.toLowerCase() ?? "it trails in several categories"}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
