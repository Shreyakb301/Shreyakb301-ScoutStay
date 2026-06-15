import { Panel } from "@/components/briefing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScoredStay } from "@/lib/scoring";
import type { LocationIntelligence } from "@/lib/types";

interface NearbyIntelligenceProps {
  scoredStays: ScoredStay[];
  errors: Record<string, string>;
  loading: boolean;
  /** Current search radius in meters. */
  radiusMeters: number;
  onRadiusChange: (radiusMeters: number) => void;
}

/** Selectable search radii, in meters. */
const RADIUS_OPTIONS = [800, 1000, 2000, 3000, 5000];

function formatRadius(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${meters / 1000} km`;
}

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

  return (
    <Panel
      title={<span className="block truncate">{entry.stay.name}</span>}
      titleClassName="text-sm font-semibold"
      bodyClassName="flex flex-col gap-4"
    >
      {!nearby ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {error ??
            "No location set, add an address to pull neighborhood data."}
        </p>
      ) : (
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
      )}
    </Panel>
  );
}

export function NearbyIntelligence({
  scoredStays,
  errors,
  loading,
  radiusMeters,
  onRadiusChange,
}: NearbyIntelligenceProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Live OpenStreetMap counts within {formatRadius(radiusMeters)} of each
          stay. The food, transit, and quietness scores above are derived from
          these signals.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="eyebrow">Radius</span>
          <Select
            value={String(radiusMeters)}
            onValueChange={(value) => onRadiusChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((meters) => (
                <SelectItem key={meters} value={String(meters)}>
                  {formatRadius(meters)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
