import { Panel, StatusTag } from "@/components/briefing";
import { scoreBarClass, scoreTextClass } from "@/components/verdict-badge";
import { quietRiskLabel } from "@/lib/nearby-places";
import type { ScoredStay } from "@/lib/scoring";
import type { LocationIntelligence } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NearbyIntelligenceProps {
  scoredStays: ScoredStay[];
  errors: Record<string, string>;
  loading: boolean;
}

const RISK_STATUS = {
  Low: "go",
  Moderate: "caution",
  High: "nogo",
} as const;

function CountField({ label, count }: { label: string; count: number }) {
  return (
    <div className="border-l-2 border-border pl-2.5">
      <span className="eyebrow block leading-tight">{label}</span>
      <span className="data text-lg font-semibold">{count}</span>
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
  const risk = nearby ? quietRiskLabel(nearby.scores.quietRiskScore) : null;

  return (
    <Panel
      title={<span className="block truncate">{entry.stay.name}</span>}
      titleClassName="text-sm font-semibold"
      aside={
        risk ? (
          <StatusTag status={RISK_STATUS[risk]}>Noise {risk}</StatusTag>
        ) : null
      }
      bodyClassName="flex flex-col gap-4"
    >
      {!nearby ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {error ??
            "No location set — add an address to pull neighborhood data."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <CountField
              label="Food / café"
              count={nearby.counts.restaurant + nearby.counts.cafe}
            />
            <CountField label="Grocery" count={nearby.counts.grocery} />
            <CountField label="Transit" count={nearby.counts.transit} />
            <CountField
              label="Healthcare"
              count={nearby.counts.pharmacy + nearby.counts.healthcare}
            />
            <CountField label="Nightlife" count={nearby.counts.nightlife} />
            <CountField
              label="Parks / sights"
              count={nearby.counts.park + nearby.counts.attraction}
            />
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-3">
            <span className="eyebrow w-24 shrink-0">Convenience</span>
            <div
              role="progressbar"
              aria-label="Convenience score"
              aria-valuenow={nearby.scores.convenienceScore}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden bg-muted"
            >
              <div
                className={cn(
                  "h-full",
                  scoreBarClass(nearby.scores.convenienceScore)
                )}
                style={{ width: `${nearby.scores.convenienceScore}%` }}
              />
            </div>
            <span
              className={cn(
                "data w-8 shrink-0 text-right text-sm font-bold",
                scoreTextClass(nearby.scores.convenienceScore)
              )}
            >
              {nearby.scores.convenienceScore}
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

export function NearbyIntelligence({
  scoredStays,
  errors,
  loading,
}: NearbyIntelligenceProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Live OpenStreetMap counts within 800 m of each stay. The food, transit,
        and quietness scores above are derived from these signals.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {loading
          ? scoredStays.map((entry) => (
              <div
                key={entry.stay.id}
                className="h-48 animate-pulse bg-muted"
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
