/**
 * Travel timeline — reconstructs the door-to-door journey for each stay from
 * data we already have: airport intelligence (transfer time / distance),
 * nearby OpenStreetMap places (real walking distances to food, transit, and
 * nightlife), and the scoring engine (walkability, activity). Every figure is
 * derived; none of the narrative is invented.
 */

import { haversineKm } from "@/lib/airport-intelligence";
import type {
  ComparisonResult,
  ScoredStay,
} from "@/lib/scoring";
import type { NearbyCategory } from "@/lib/types";

/** Brisk urban walking pace, ~4.8 km/h. */
const WALK_SPEED_M_PER_MIN = 80;
/** Deplane + baggage + walk-to-transfer allowance before the drive starts. */
const DEPLANE_BUFFER_MIN = 9;
/** A fixed reference landing time so every timeline reads on the same clock. */
const NOMINAL_LANDING_MIN = 11 * 60 + 35; // 11:35 AM
/** Recommended time at the airport before a departure. */
const PREFLIGHT_ALLOWANCE_MIN = 120;

export type Friction = "Low" | "Moderate" | "High" | "Unknown";
export type ActivityLevel = "Quiet" | "Moderate" | "Lively";
export type WalkProfile = "High" | "Moderate" | "Low";
export type CheckpointStatus = "go" | "caution" | "nogo" | "signal" | "neutral";

export type CheckpointId =
  | "arrival"
  | "transfer"
  | "checkin"
  | "food"
  | "transit"
  | "evening"
  | "return";

export interface TimelineCheckpoint {
  id: CheckpointId;
  label: string;
  /** Clock time, e.g. "12:02 PM", or null when this step has no fixed time. */
  time: string | null;
  detail: string;
  sub: string[];
  status: CheckpointStatus;
}

export interface StayTimeline {
  stayId: string;
  stayName: string;
  overallScore: number;
  iata: string | null;
  airportName: string | null;
  transferMinutes: number | null;
  distanceKm: number | null;
  arrivalFriction: Friction;
  departureFriction: Friction;
  walkability: WalkProfile;
  activityLevel: ActivityLevel;
  foodWalkMinutes: number | null;
  transitWalkMinutes: number | null;
  eveningWalkMinutes: number | null;
  /** A short, fully data-derived summary of the journey. */
  narrative: string;
  checkpoints: TimelineCheckpoint[];
}

function formatClock(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Nearest walking minutes to any place in the given categories, from real coords. */
function nearestWalk(
  entry: ScoredStay,
  categories: NearbyCategory[]
): { minutes: number | null; count: number } {
  const nearby = entry.nearby;
  if (!nearby) return { minutes: null, count: 0 };

  const wanted = new Set(categories);
  const matches = nearby.places.filter((place) => wanted.has(place.category));
  if (matches.length === 0) return { minutes: null, count: 0 };

  const { latitude, longitude } = entry.stay;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    // No stay coords: estimate from density within the search radius.
    const nearestMeters = nearby.radiusMeters / Math.sqrt(matches.length + 1);
    return {
      minutes: Math.max(1, Math.round(nearestMeters / WALK_SPEED_M_PER_MIN)),
      count: matches.length,
    };
  }

  let bestKm = Infinity;
  for (const place of matches) {
    const km = haversineKm(latitude, longitude, place.latitude, place.longitude);
    if (km < bestKm) bestKm = km;
  }
  return {
    minutes: Math.max(1, Math.round((bestKm * 1000) / WALK_SPEED_M_PER_MIN)),
    count: matches.length,
  };
}

function walkProfile(score: number): WalkProfile {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

function activityLevel(entry: ScoredStay): ActivityLevel {
  const nearby = entry.nearby;
  if (!nearby) return "Quiet";
  const density = nearby.scores.nightlifeDensityScore;
  if (density >= 60) return "Lively";
  if (density >= 30) return "Moderate";
  return "Quiet";
}

/** Combines transfer time and how easy it is to get around into a friction band. */
function frictionFor(entry: ScoredStay): Friction {
  const airport = entry.airport;
  if (!airport) return "Unknown";
  let level = airport.driveMinutes <= 20 ? 0 : airport.driveMinutes <= 45 ? 1 : 2;
  if (entry.scores.transitScore < 40) level += 1;
  level = Math.min(2, level);
  return level === 0 ? "Low" : level === 1 ? "Moderate" : "High";
}

function frictionStatus(friction: Friction): CheckpointStatus {
  if (friction === "Low") return "go";
  if (friction === "Moderate") return "caution";
  if (friction === "High") return "nogo";
  return "neutral";
}

function accessStatus(score: number, available: boolean): CheckpointStatus {
  if (!available) return "neutral";
  if (score >= 70) return "go";
  if (score >= 45) return "caution";
  return "nogo";
}

function joinProse(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function buildNarrative(t: {
  iata: string | null;
  transferMinutes: number | null;
  foodWalkMinutes: number | null;
  transitWalkMinutes: number | null;
  arrivalFriction: Friction;
  activityLevel: ActivityLevel;
}): string {
  const lead =
    t.transferMinutes != null && t.iata
      ? `A ${t.transferMinutes}-minute transfer from ${t.iata}`
      : "No major airport on file";

  const walkParts: string[] = [];
  if (t.foodWalkMinutes != null) {
    walkParts.push(`${t.foodWalkMinutes} min to the nearest restaurants`);
  }
  if (t.transitWalkMinutes != null) {
    walkParts.push(`${t.transitWalkMinutes} min to transit`);
  }

  const frictionPhrase =
    t.arrivalFriction === "Unknown"
      ? "Arrival"
      : `A ${t.arrivalFriction.toLowerCase()}-friction arrival`;

  const tail = `${frictionPhrase} in a ${t.activityLevel.toLowerCase()} neighborhood.`;

  if (walkParts.length === 0) return `${lead}. ${tail}`;
  return `${lead}, then ${joinProse(walkParts)}. ${tail}`;
}

export function buildStayTimeline(entry: ScoredStay): StayTimeline {
  const airport = entry.airport ?? null;
  const nearby = entry.nearby;
  const hasNearby = Boolean(nearby);

  const food = nearestWalk(entry, ["restaurant", "cafe"]);
  const transit = nearestWalk(entry, ["transit"]);
  const evening = nearestWalk(entry, ["nightlife"]);

  const arrivalFriction = frictionFor(entry);
  const departureFriction = arrivalFriction; // transfer is symmetric
  const walkability = walkProfile(entry.scores.walkabilityScore);
  const activity = activityLevel(entry);

  const iata = airport?.airport.iata ?? null;
  const transferMinutes = airport?.driveMinutes ?? null;
  const distanceKm = airport?.distanceKm ?? null;

  const landTime = NOMINAL_LANDING_MIN;
  const arrivalTime =
    transferMinutes != null
      ? landTime + DEPLANE_BUFFER_MIN + transferMinutes
      : null;

  const checkpoints: TimelineCheckpoint[] = [];

  // 1 — Arrival at airport
  checkpoints.push(
    airport
      ? {
          id: "arrival",
          label: `Land at ${iata ?? "airport"}`,
          time: formatClock(landTime),
          detail: airport.airport.name,
          sub: [`Airport access ${airport.accessibilityScore}/100`],
          status: "signal",
        }
      : {
          id: "arrival",
          label: "Arrival",
          time: null,
          detail: hasNearby
            ? "No major airport within range — local arrival"
            : "No location set for this stay",
          sub: [],
          status: "neutral",
        }
  );

  // 2 — Airport transfer
  if (airport && transferMinutes != null && distanceKm != null) {
    checkpoints.push({
      id: "transfer",
      label: "Airport transfer",
      time: null,
      detail: `${transferMinutes} min drive / ${distanceKm} km`,
      sub: [`${arrivalFriction} friction`],
      status: frictionStatus(arrivalFriction),
    });
  }

  // 3 — Check in
  checkpoints.push({
    id: "checkin",
    label: `Check in — ${entry.stay.name}`,
    time: arrivalTime != null ? formatClock(arrivalTime) : null,
    detail:
      arrivalFriction === "Unknown"
        ? "Settle in"
        : `${arrivalFriction}-friction arrival`,
    sub: [`Walkability ${walkability.toLowerCase()}`],
    status: frictionStatus(arrivalFriction),
  });

  // 4 — Food access
  checkpoints.push({
    id: "food",
    label: "Food access",
    time: null,
    detail:
      food.minutes != null
        ? `${food.minutes} min walk to nearest restaurant cluster`
        : hasNearby
          ? "No dining within walking range"
          : "No neighborhood data",
    sub: food.count > 0 ? [`${food.count} restaurants & cafés nearby`] : [],
    status: accessStatus(entry.scores.foodAccessScore, hasNearby),
  });

  // 5 — Transit access
  checkpoints.push({
    id: "transit",
    label: "Transit access",
    time: null,
    detail:
      transit.minutes != null
        ? `${transit.minutes} min walk to nearest transit stop`
        : hasNearby
          ? "No transit within walking range"
          : "No neighborhood data",
    sub: transit.count > 0 ? [`${transit.count} stops nearby`] : [],
    status: accessStatus(entry.scores.transitScore, hasNearby),
  });

  // 6 — Evening activity access
  checkpoints.push({
    id: "evening",
    label: "Evening activity",
    time: null,
    detail:
      evening.minutes != null
        ? `${evening.minutes} min walk to nightlife`
        : hasNearby
          ? "Quiet after dark — no nightlife nearby"
          : "No neighborhood data",
    sub: hasNearby ? [`${activity} neighborhood`] : [],
    status: "neutral",
  });

  // 7 — Return journey
  checkpoints.push(
    airport && transferMinutes != null
      ? {
          id: "return",
          label: "Return journey",
          time: null,
          detail: `Leave ~${transferMinutes + PREFLIGHT_ALLOWANCE_MIN} min before departure`,
          sub: [`${transferMinutes} min transfer / ${departureFriction} friction`],
          status: frictionStatus(departureFriction),
        }
      : {
          id: "return",
          label: "Return journey",
          time: null,
          detail: "No airport transfer on file",
          sub: [],
          status: "neutral",
        }
  );

  return {
    stayId: entry.stay.id,
    stayName: entry.stay.name,
    overallScore: entry.overallScore,
    iata,
    airportName: airport?.airport.name ?? null,
    transferMinutes,
    distanceKm,
    arrivalFriction,
    departureFriction,
    walkability,
    activityLevel: activity,
    foodWalkMinutes: food.minutes,
    transitWalkMinutes: transit.minutes,
    eveningWalkMinutes: evening.minutes,
    narrative: buildNarrative({
      iata,
      transferMinutes,
      foodWalkMinutes: food.minutes,
      transitWalkMinutes: transit.minutes,
      arrivalFriction,
      activityLevel: activity,
    }),
    checkpoints,
  };
}

/** Build a journey timeline for every stay, in ranked order. */
export function buildTravelTimelines(result: ComparisonResult): StayTimeline[] {
  return result.scoredStays.map(buildStayTimeline);
}
