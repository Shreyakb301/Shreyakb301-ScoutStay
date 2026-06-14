import { ExternalLink } from "lucide-react";

import { Panel } from "@/components/briefing";
import { Badge } from "@/components/ui/badge";
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

  const titleBar = (
    <div className="flex w-full items-center gap-2">
      <span className="data text-foreground">
        {String(entry.rank).padStart(2, "0")}
      </span>
      <span className="truncate text-foreground" title={stay.name}>
        {stay.name}
      </span>
    </div>
  );

  return (
    <Panel
      title={titleBar}
      titleClassName="text-sm font-semibold"
      aside={
        <span className={cn("data text-lg font-bold", scoreTextClass(entry.overallScore))}>
          {entry.overallScore}
        </span>
      }
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Badge variant="secondary">{platform}</Badge>
        <span className="data text-sm text-muted-foreground">
          ${Number(stay.pricePerNight) || 0}/nt
        </span>
        <VerdictBadge verdict={entry.verdict} />
        {stay.url && (
          <a
            href={stay.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
          >
            Listing <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {BREAKDOWN_ORDER.map((category) => {
        const score = scores[category];
        return (
          <div
            key={category}
            className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3"
          >
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </span>
            <div
              role="progressbar"
              aria-label={CATEGORY_LABELS[category]}
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden bg-muted"
            >
              <div
                className={cn("h-full", scoreBarClass(score))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="data text-right text-sm font-medium">{score}</span>
          </div>
        );
      })}
    </Panel>
  );
}
