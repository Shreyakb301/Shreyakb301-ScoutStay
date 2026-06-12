import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  VerdictBadge,
  scoreBarClass,
  scoreTextClass,
} from "@/components/verdict-badge";
import { PLATFORM_OPTIONS } from "@/lib/mock-data";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type ScoredStay,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

const BREAKDOWN_ORDER: CategoryId[] = [
  "travelerFitScore",
  "safetyScore",
  "valueScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
];

export function ListingScoreCard({ entry }: { entry: ScoredStay }) {
  const { stay, scores } = entry;
  const platform =
    PLATFORM_OPTIONS.find((option) => option.value === stay.platform)?.label ??
    stay.platform;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base" title={stay.name}>
              <span className="mr-2 font-mono text-sm text-muted-foreground">
                #{entry.rank}
              </span>
              {stay.name}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{platform}</Badge>
              <span className="tabular-nums">
                ${Number(stay.pricePerNight) || 0}/night
              </span>
              {stay.url && (
                <a
                  href={stay.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                >
                  Listing <ExternalLink className="size-3" />
                </a>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums",
                scoreTextClass(entry.overallScore)
              )}
            >
              {entry.overallScore}
            </span>
            <VerdictBadge verdict={entry.verdict} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {BREAKDOWN_ORDER.map((category) => {
          const score = scores[category];
          return (
            <div key={category} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </span>
              <div
                role="progressbar"
                aria-label={CATEGORY_LABELS[category]}
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full", scoreBarClass(score))}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-right text-sm font-medium tabular-nums">
                {score}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
