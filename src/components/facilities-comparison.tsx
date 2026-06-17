"use client";

import { Fragment, useMemo, useState } from "react";

import { DataField, Panel } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import {
  FACILITIES,
  FACILITY_GROUPS,
  getFacilitiesComparisonSummary,
} from "@/lib/facilities";
import type { StayListing } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One card: every amenity as a row, each stay as a column with a marker. */
function AmenityMatrix({
  stays,
  numberById,
}: {
  stays: StayListing[];
  numberById: Record<string, number>;
}) {
  const haveSets = stays.map((stay) => new Set(stay.facilities ?? []));
  return (
    <Panel bodyClassName="p-0">
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="eyebrow h-9 bg-card px-3 text-left">Amenity</th>
              {stays.map((stay) => (
                <th
                  key={stay.id}
                  className="bg-card px-3 py-1.5 text-center align-bottom"
                >
                  <span className="data block text-xs font-semibold">
                    {String(numberById[stay.id] ?? 0).padStart(2, "0")}
                  </span>
                  <span
                    className="mx-auto block max-w-24 truncate text-[0.7rem] font-medium text-muted-foreground"
                    title={stay.name}
                  >
                    {stay.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FACILITY_GROUPS.map((group) => (
              <Fragment key={group}>
                <tr className="border-b border-border bg-muted/40">
                  <td
                    className="eyebrow px-3 py-1.5"
                    colSpan={stays.length + 1}
                  >
                    {group}
                  </td>
                </tr>
                {FACILITIES.filter((facility) => facility.group === group).map(
                  (facility) => (
                    <tr
                      key={facility.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-1.5">{facility.label}</td>
                      {haveSets.map((set, index) => {
                        const has = set.has(facility.id);
                        return (
                          <td
                            key={stays[index].id}
                            className="px-3 py-1.5 text-center"
                          >
                            <span
                              className={cn(
                                "inline-block size-2.5 border",
                                has
                                  ? "border-go bg-go"
                                  : "border-border bg-transparent"
                              )}
                              aria-label={has ? "included" : "not included"}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Up to this many stays can be shown in the matrix at once. */
const MAX_COMPARE = 3;

export function FacilitiesComparison({ stays }: { stays: StayListing[] }) {
  const summary = useMemo(
    () => getFacilitiesComparisonSummary(stays),
    [stays]
  );
  const numberById = useMemo(
    () =>
      Object.fromEntries(stays.map((stay, index) => [stay.id, index + 1])) as Record<
        string,
        number
      >,
    [stays]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    stays.slice(0, MAX_COMPARE).map((stay) => stay.id)
  );

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

  const limited = stays.length > MAX_COMPARE;
  const selectedStays = stays.filter((stay) => selectedIds.includes(stay.id));
  const matrixStays = limited
    ? selectedStays.length > 0
      ? selectedStays
      : stays.slice(0, MAX_COMPARE)
    : stays;

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, id]
    );

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

      {/* Pick which stays to compare when there are more than three */}
      {limited && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="eyebrow">
            Compare up to {MAX_COMPARE} ({matrixStays.length} selected)
          </span>
          <div className="flex flex-wrap gap-2">
            {stays.map((stay, index) => {
              const active = selectedIds.includes(stay.id);
              const atMax = !active && selectedIds.length >= MAX_COMPARE;
              return (
                <Button
                  key={stay.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={atMax}
                  onClick={() => toggle(stay.id)}
                >
                  <span className="data">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-32 truncate">{stay.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* All amenities in one card */}
      <AmenityMatrix stays={matrixStays} numberById={numberById} />
    </div>
  );
}
