import {
  Bus,
  HeartPulse,
  Landmark,
  Martini,
  ShoppingCart,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { scoreBarClass, scoreTextClass } from "@/components/verdict-badge";
import { quietRiskLabel } from "@/lib/nearby-places";
import type { ScoredStay } from "@/lib/scoring";
import type { LocationIntelligence } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NearbyIntelligenceProps {
  scoredStays: ScoredStay[];
  /** Overpass failure reason keyed by stay id (partial failures). */
  errors: Record<string, string>;
  loading: boolean;
}

const RISK_BADGE_STYLES: Record<string, string> = {
  Low: "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
  Moderate:
    "border-transparent bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
  High: "border-transparent bg-red-600 text-white dark:bg-red-500",
};

function CountChip({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto text-sm font-semibold tabular-nums">
        {count}
      </span>
    </div>
  );
}

function StayNearbyCard({
  entry,
  error,
}: {
  entry: ScoredStay;
  error?: string;
}) {
  const nearby: LocationIntelligence | undefined = entry.nearby;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-base" title={entry.stay.name}>
            {entry.stay.name}
          </CardTitle>
          {nearby && (
            <Badge
              className={
                RISK_BADGE_STYLES[quietRiskLabel(nearby.scores.quietRiskScore)]
              }
            >
              {quietRiskLabel(nearby.scores.quietRiskScore)} noise risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!nearby ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {error ??
              "No location set — add an address to this stay to see nearby data."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <CountChip
                icon={Utensils}
                label="Food & cafés"
                count={nearby.counts.restaurant + nearby.counts.cafe}
              />
              <CountChip
                icon={ShoppingCart}
                label="Grocery"
                count={nearby.counts.grocery}
              />
              <CountChip
                icon={Bus}
                label="Transit"
                count={nearby.counts.transit}
              />
              <CountChip
                icon={HeartPulse}
                label="Healthcare"
                count={nearby.counts.pharmacy + nearby.counts.healthcare}
              />
              <CountChip
                icon={Martini}
                label="Nightlife"
                count={nearby.counts.nightlife}
              />
              <CountChip
                icon={Landmark}
                label="Parks & sights"
                count={nearby.counts.park + nearby.counts.attraction}
              />
            </div>

            <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Convenience
              </span>
              <div
                role="progressbar"
                aria-label="Convenience score"
                aria-valuenow={nearby.scores.convenienceScore}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    scoreBarClass(nearby.scores.convenienceScore)
                  )}
                  style={{ width: `${nearby.scores.convenienceScore}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-right text-sm font-semibold tabular-nums",
                  scoreTextClass(nearby.scores.convenienceScore)
                )}
              >
                {nearby.scores.convenienceScore}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function NearbyIntelligence({
  scoredStays,
  errors,
  loading,
}: NearbyIntelligenceProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold">Nearby intelligence</h3>
      <p className="text-sm text-muted-foreground">
        Real OpenStreetMap data within 800 m of each stay — food, transit, and
        quietness scores above use these live signals.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {loading
          ? scoredStays.map((entry) => (
              <div
                key={entry.stay.id}
                className="h-48 animate-pulse rounded-xl bg-muted"
              />
            ))
          : scoredStays.map((entry) => (
              <StayNearbyCard
                key={entry.stay.id}
                entry={entry}
                error={errors[entry.stay.id]}
              />
            ))}
      </div>
    </div>
  );
}
