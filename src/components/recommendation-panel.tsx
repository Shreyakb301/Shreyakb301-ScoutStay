import { Lightbulb } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerdictBadge } from "@/components/verdict-badge";
import { TRAVELER_TYPES } from "@/lib/mock-data";
import { CATEGORY_LABELS, type CategoryId, type ComparisonResult } from "@/lib/scoring";

function topCategories(result: ComparisonResult): string {
  const { scores } = result.bestOverall;
  const ranked = (Object.entries(scores) as [CategoryId, number][])
    .filter(([category]) => category !== "travelerFitScore")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category]) => CATEGORY_LABELS[category].toLowerCase());
  return ranked.join(" and ");
}

export function RecommendationPanel({ result }: { result: ComparisonResult }) {
  const { bestOverall, biggestRisk, scoredStays } = result;
  const travelerLabel =
    TRAVELER_TYPES.find((type) => type.id === result.travelerType)?.label.toLowerCase() ??
    result.travelerType;
  const runnerUp = scoredStays.length > 1 ? scoredStays[1] : null;
  const sameStay = biggestRisk.stay.id === bestOverall.stay.id;

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
          {" — "}it leads your shortlist on {topCategories(result)}, and it&apos;s
          the best overall fit for a {travelerLabel} trip.
        </p>
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
