/**
 * Facilities / amenities — the catalog of selectable stay features and the
 * pure comparison helpers behind the Facilities Comparison section. All
 * client-side; nothing here touches the network.
 */

import type { FacilityId, StayListing } from "@/lib/types";

export type FacilityGroup = "Essentials" | "Features" | "Safety";

export interface FacilityDef {
  id: FacilityId;
  label: string;
  group: FacilityGroup;
}

export const FACILITY_GROUPS: FacilityGroup[] = [
  "Essentials",
  "Features",
  "Safety",
];

export const FACILITIES: FacilityDef[] = [
  { id: "wifi", label: "Wi-Fi", group: "Essentials" },
  { id: "kitchen", label: "Kitchen", group: "Essentials" },
  { id: "washer-dryer", label: "Washer or dryer", group: "Essentials" },
  { id: "air-conditioning", label: "Air conditioning", group: "Essentials" },
  { id: "heating", label: "Heating", group: "Essentials" },
  { id: "workspace", label: "Workspace", group: "Essentials" },
  { id: "free-parking", label: "Free parking", group: "Essentials" },
  { id: "self-check-in", label: "Self check-in", group: "Essentials" },
  { id: "dedicated-entrance", label: "Dedicated entrance", group: "Essentials" },
  { id: "pool", label: "Pool", group: "Features" },
  { id: "gym", label: "Gym", group: "Features" },
  { id: "hot-tub", label: "Hot tub", group: "Features" },
  { id: "balcony-patio", label: "Balcony or patio", group: "Features" },
  { id: "pet-friendly", label: "Pet friendly", group: "Features" },
  { id: "security-cameras", label: "Doorbell / security cameras", group: "Safety" },
  { id: "smoke-alarm", label: "Smoke alarm", group: "Safety" },
  { id: "carbon-monoxide-alarm", label: "Carbon monoxide alarm", group: "Safety" },
  { id: "first-aid-kit", label: "First aid kit", group: "Safety" },
  { id: "fire-extinguisher", label: "Fire extinguisher", group: "Safety" },
];

export const ALL_FACILITY_IDS: FacilityId[] = FACILITIES.map((f) => f.id);

const LABEL_BY_ID: Record<FacilityId, string> = FACILITIES.reduce(
  (acc, facility) => {
    acc[facility.id] = facility.label;
    return acc;
  },
  {} as Record<FacilityId, string>
);

export function facilityLabel(id: FacilityId): string {
  return LABEL_BY_ID[id] ?? id;
}

/** Facilities (deduped, in catalog order) selected for a stay. */
export function getFacilitiesForStay(stay: StayListing): FacilityId[] {
  const set = new Set(stay.facilities ?? []);
  return ALL_FACILITY_IDS.filter((id) => set.has(id));
}

/** Every catalog facility this stay does NOT have, in catalog order. */
export function getMissingFacilitiesForStay(stay: StayListing): FacilityId[] {
  const set = new Set(stay.facilities ?? []);
  return ALL_FACILITY_IDS.filter((id) => !set.has(id));
}

/** Facilities present in at least one OTHER stay but missing from this one. */
export function getFacilitiesOtherStaysHave(
  stay: StayListing,
  stays: StayListing[]
): FacilityId[] {
  const own = new Set(stay.facilities ?? []);
  const others = new Set<FacilityId>();
  for (const other of stays) {
    if (other.id === stay.id) continue;
    for (const id of other.facilities ?? []) others.add(id);
  }
  return ALL_FACILITY_IDS.filter((id) => others.has(id) && !own.has(id));
}

function facilityCount(stay: StayListing): number {
  return new Set(stay.facilities ?? []).size;
}

/** The stay with the most facilities (null if no stay has any). */
export function getBestEquippedStay(stays: StayListing[]): StayListing | null {
  let best: StayListing | null = null;
  let bestCount = 0;
  for (const stay of stays) {
    const count = facilityCount(stay);
    if (count > bestCount) {
      best = stay;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The stay lacking the most facilities that other stays offer (null when no
 * facilities have been entered or nothing is missing).
 */
export function getMostMissingFacilitiesStay(
  stays: StayListing[]
): StayListing | null {
  let worst: StayListing | null = null;
  let worstGap = 0;
  for (const stay of stays) {
    const gap = getFacilitiesOtherStaysHave(stay, stays).length;
    if (gap > worstGap) {
      worst = stay;
      worstGap = gap;
    }
  }
  return worst;
}

/** Facilities unique to each stay (no other stay in the shortlist has them). */
export function getUniqueFacilitiesByStay(
  stays: StayListing[]
): Record<string, FacilityId[]> {
  const counts = new Map<FacilityId, number>();
  for (const stay of stays) {
    for (const id of new Set(stay.facilities ?? [])) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const result: Record<string, FacilityId[]> = {};
  for (const stay of stays) {
    const own = new Set(stay.facilities ?? []);
    result[stay.id] = ALL_FACILITY_IDS.filter(
      (id) => own.has(id) && counts.get(id) === 1
    );
  }
  return result;
}

export interface FacilitiesComparisonSummary {
  /** True when at least one stay has any facilities recorded. */
  anyFacilitiesEntered: boolean;
  countsByStayId: Record<string, number>;
  bestEquipped: StayListing | null;
  mostMissing: StayListing | null;
  unique: Record<string, FacilityId[]>;
}

export function getFacilitiesComparisonSummary(
  stays: StayListing[]
): FacilitiesComparisonSummary {
  const countsByStayId: Record<string, number> = {};
  for (const stay of stays) countsByStayId[stay.id] = facilityCount(stay);

  return {
    anyFacilitiesEntered: stays.some((stay) => facilityCount(stay) > 0),
    countsByStayId,
    bestEquipped: getBestEquippedStay(stays),
    mostMissing: getMostMissingFacilitiesStay(stays),
    unique: getUniqueFacilitiesByStay(stays),
  };
}
