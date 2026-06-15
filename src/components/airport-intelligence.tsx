import { Panel, StatusTag } from "@/components/briefing";
import { scoreTextClass } from "@/components/verdict-badge";
import type { AirportIntelligence as AirportInfo } from "@/lib/airport-intelligence";
import { AIRPORT_SEARCH_RADIUS_KM } from "@/lib/airport-intelligence";
import type { ScoredStay } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface AirportIntelligenceProps {
  scoredStays: ScoredStay[];
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
    <Panel
      title={<span className="block truncate">{entry.stay.name}</span>}
      titleClassName="text-sm font-semibold"
      aside={isBest ? <StatusTag status="go">Best</StatusTag> : null}
      bodyClassName="flex flex-col gap-2.5 p-3"
    >
      {info === undefined ? (
        <p className="text-sm text-muted-foreground">
          {error ?? "No location set."}
        </p>
      ) : info === null ? (
        <p className="text-sm text-muted-foreground">
          No major airport within {AIRPORT_SEARCH_RADIUS_KM} km.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="data flex h-6 min-w-9 items-center justify-center border border-foreground px-1 text-xs font-bold tracking-wider">
              {info.airport.iata ?? "APT"}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {info.airport.name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span>
              <span className="eyebrow">Dist</span>{" "}
              <span className="data font-semibold">{info.distanceKm} km</span>
            </span>
            <span>
              <span className="eyebrow">Transfer</span>{" "}
              <span className="data font-semibold">~{info.driveMinutes} min</span>
            </span>
            <span className="ml-auto">
              <span className="eyebrow">Access</span>{" "}
              <span
                className={cn(
                  "data font-bold",
                  scoreTextClass(info.accessibilityScore)
                )}
              >
                {info.accessibilityScore}
              </span>
            </span>
          </div>
        </>
      )}
    </Panel>
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Nearest major airport per stay, from OpenStreetMap. Transfer times are
        straight-line estimates at 40 km/h, no live routing.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? scoredStays.map((entry) => (
              <div
                key={entry.stay.id}
                className="h-24 animate-pulse bg-muted"
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
