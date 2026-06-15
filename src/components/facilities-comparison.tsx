"use client";

import { useMemo, useState } from "react";

import { DataField, Panel } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import {
  facilityLabel,
  getFacilitiesComparisonSummary,
  getFacilitiesForStay,
  getFacilitiesOtherStaysHave,
  getMissingFacilitiesForStay,
} from "@/lib/facilities";
import type { FacilityId, StayListing } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChipVariant = "have" | "missing" | "gap" | "unique";

const CHIP_STYLES: Record<ChipVariant, string> = {
  have: "border-go/40",
  missing: "border-border text-muted-foreground",
  gap: "border-caution/50",
  unique: "border-signal",
};

const DOT_STYLES: Record<ChipVariant, string> = {
  have: "bg-go",
  missing: "bg-transparent",
  gap: "bg-caution",
  unique: "bg-signal",
};

function FacilityChip({
  id,
  variant,
}: {
  id: FacilityId;
  variant: ChipVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-xs",
        CHIP_STYLES[variant]
      )}
    >
      {variant !== "missing" && (
        <span className={cn("size-1.5", DOT_STYLES[variant])} aria-hidden />
      )}
      {facilityLabel(id)}
    </span>
  );
}

function ChipRow({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">
        {label} ({count})
      </span>
      {count === 0 ? (
        <span className="text-sm text-muted-foreground">None</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">{children}</div>
      )}
    </div>
  );
}

export function FacilitiesComparison({ stays }: { stays: StayListing[] }) {
  const summary = useMemo(
    () => getFacilitiesComparisonSummary(stays),
    [stays]
  );
  const [selectedId, setSelectedId] = useState(stays[0]?.id ?? "");
  const selected = stays.find((s) => s.id === selectedId) ?? stays[0];

  if (!summary.anyFacilitiesEntered) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          No facilities recorded yet. Add amenities to each stay in the
          comparison form to see what every option includes and where the gaps
          are.
        </p>
      </Panel>
    );
  }

  const has = getFacilitiesForStay(selected);
  const missing = getMissingFacilitiesForStay(selected);
  const gap = getFacilitiesOtherStaysHave(selected, stays);
  const unique = summary.unique[selected.id] ?? [];
  const ownSet = new Set(selected.facilities ?? []);

  const competitors = stays
    .filter((s) => s.id !== selected.id)
    .map((other) => ({
      stay: other,
      offers: getFacilitiesForStay(other).filter((id) => !ownSet.has(id)),
    }))
    .filter((c) => c.offers.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {summary.bestEquipped && (
          <DataField
            label="Best equipped"
            value={
              <span className="text-base font-semibold">
                {summary.bestEquipped.name}
              </span>
            }
          />
        )}
        {summary.mostMissing && (
          <DataField
            label="Most missing"
            value={
              <span className="text-base font-semibold">
                {summary.mostMissing.name}
              </span>
            }
          />
        )}
        <DataField
          label="Facility catalog"
          value={`${Object.values(summary.countsByStayId).reduce((a, b) => Math.max(a, b), 0)} max selected`}
        />
      </div>

      {/* Stay switcher */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {stays.map((stay, index) => {
          const active = stay.id === selected.id;
          return (
            <Button
              key={stay.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setSelectedId(stay.id)}
            >
              <span className="data">{String(index + 1).padStart(2, "0")}</span>
              <span className="max-w-32 truncate">{stay.name}</span>
              <span className="data text-xs opacity-70">
                {summary.countsByStayId[stay.id] ?? 0}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Selected stay breakdown */}
      <Panel
        title={<span className="truncate">{selected.name}</span>}
        titleClassName="text-sm font-semibold"
        bodyClassName="flex flex-col gap-5"
      >
        <ChipRow label="Included" count={has.length}>
          {has.map((id) => (
            <FacilityChip key={id} id={id} variant="have" />
          ))}
        </ChipRow>

        <div className="border-t border-border pt-4">
          <ChipRow label="Competitors offer, this stay lacks" count={gap.length}>
            {gap.map((id) => (
              <FacilityChip key={id} id={id} variant="gap" />
            ))}
          </ChipRow>
          {competitors.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {competitors.map(({ stay, offers }) => (
                <p key={stay.id} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {stay.name}
                  </span>{" "}
                  has{" "}
                  {offers.map((id) => facilityLabel(id)).join(", ")}.
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <ChipRow label="Unique to this stay" count={unique.length}>
            {unique.map((id) => (
              <FacilityChip key={id} id={id} variant="unique" />
            ))}
          </ChipRow>
        </div>

        <div className="border-t border-border pt-4">
          <ChipRow label="Not included" count={missing.length}>
            {missing.map((id) => (
              <FacilityChip key={id} id={id} variant="missing" />
            ))}
          </ChipRow>
        </div>
      </Panel>
    </div>
  );
}
