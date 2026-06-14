import { Panel, StatusTag } from "@/components/briefing";
import { scoreBarClass, scoreTextClass } from "@/components/verdict-badge";
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
      aside={isBest ? <StatusTag status="go">Best access</StatusTag> : null}
      bodyClassName="flex flex-col gap-4"
    >
      {info === undefined ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {error ?? "No location set — add an address to compute airport access."}
        </p>
      ) : info === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No major airport within {AIRPORT_SEARCH_RADIUS_KM} km.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="data flex h-10 min-w-12 items-center justify-center border-2 border-foreground px-2 text-lg font-bold tracking-wider">
              {info.airport.iata ?? "APT"}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {info.airport.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="border-l-2 border-border pl-3">
              <span className="eyebrow">Distance</span>
              <p className="data text-base font-semibold">{info.distanceKm} km</p>
            </div>
            <div className="border-l-2 border-border pl-3">
              <span className="eyebrow">Est. transfer</span>
              <p className="data text-base font-semibold">~{info.driveMinutes} min</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-3">
            <span className="eyebrow w-20 shrink-0">Access</span>
            <div
              role="progressbar"
              aria-label="Airport accessibility score"
              aria-valuenow={info.accessibilityScore}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden bg-muted"
            >
              <div
                className={cn("h-full", scoreBarClass(info.accessibilityScore))}
                style={{ width: `${info.accessibilityScore}%` }}
              />
            </div>
            <span
              className={cn(
                "data w-8 shrink-0 text-right text-sm font-bold",
                scoreTextClass(info.accessibilityScore)
              )}
            >
              {info.accessibilityScore}
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
        straight-line estimates at 40 km/h — no live routing.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {loading
          ? scoredStays.map((entry) => (
              <div
                key={entry.stay.id}
                className="h-44 animate-pulse bg-muted"
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
