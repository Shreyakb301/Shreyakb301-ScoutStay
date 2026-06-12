import { Car, Plane, Ruler } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { scoreBarClass, scoreTextClass } from "@/components/verdict-badge";
import type { AirportIntelligence as AirportInfo } from "@/lib/airport-intelligence";
import { AIRPORT_SEARCH_RADIUS_KM } from "@/lib/airport-intelligence";
import type { ScoredStay } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface AirportIntelligenceProps {
  scoredStays: ScoredStay[];
  /** Lookup result keyed by stay id; null = no airport within range. */
  airports: Record<string, AirportInfo | null>;
  errors: Record<string, string>;
  loading: boolean;
}

/** The stay with the highest airport accessibility score, if any resolved. */
export function bestAirportStay(
  scoredStays: ScoredStay[],
  airports: Record<string, AirportInfo | null>
): ScoredStay | null {
  let best: ScoredStay | null = null;
  let bestScore = -1;
  for (const entry of scoredStays) {
    const info = airports[entry.stay.id];
    if (info && info.accessibilityScore > bestScore) {
      best = entry;
      bestScore = info.accessibilityScore;
    }
  }
  return best;
}

function StayAirportCard({
  entry,
  info,
  error,
  isBest,
}: {
  entry: ScoredStay;
  info: AirportInfo | null | undefined;
  error?: string;
  isBest: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-base" title={entry.stay.name}>
            {entry.stay.name}
          </CardTitle>
          {isBest && (
            <Badge className="border-transparent bg-emerald-600 text-white dark:bg-emerald-500">
              Best airport access
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {info === undefined ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {error ??
              "No location set — add an address to this stay to see airport access."}
          </p>
        ) : info === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No major airport within {AIRPORT_SEARCH_RADIUS_KM} km.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Plane className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate font-medium">
                {info.airport.name}
              </span>
              {info.airport.iata && (
                <Badge variant="secondary">{info.airport.iata}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                <Ruler className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Distance</span>
                <span className="ml-auto text-sm font-semibold tabular-nums">
                  {info.distanceKm} km
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                <Car className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Est. drive
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums">
                  ~{info.driveMinutes} min
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3">
              <span className="text-sm text-muted-foreground">Access</span>
              <div
                role="progressbar"
                aria-label="Airport accessibility score"
                aria-valuenow={info.accessibilityScore}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    scoreBarClass(info.accessibilityScore)
                  )}
                  style={{ width: `${info.accessibilityScore}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-right text-sm font-semibold tabular-nums",
                  scoreTextClass(info.accessibilityScore)
                )}
              >
                {info.accessibilityScore}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AirportIntelligence({
  scoredStays,
  airports,
  errors,
  loading,
}: AirportIntelligenceProps) {
  const best = bestAirportStay(scoredStays, airports);

  return (
    <div>
      <h3 className="text-lg font-semibold">Airport accessibility</h3>
      <p className="text-sm text-muted-foreground">
        Nearest major airport per stay, from OpenStreetMap data. Drive times
        are straight-line estimates at 40 km/h — no routing yet.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {loading
          ? scoredStays.map((entry) => (
              <div
                key={entry.stay.id}
                className="h-44 animate-pulse rounded-xl bg-muted"
              />
            ))
          : scoredStays.map((entry) => (
              <StayAirportCard
                key={entry.stay.id}
                entry={entry}
                info={airports[entry.stay.id]}
                error={errors[entry.stay.id]}
                isBest={best?.stay.id === entry.stay.id}
              />
            ))}
      </div>
    </div>
  );
}
