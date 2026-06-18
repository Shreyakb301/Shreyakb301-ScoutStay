/**
 * Airport accessibility via OpenStreetMap data (Overpass) — free, no key.
 *
 * "Major airport" means an aerodrome with an IATA code, which filters out
 * airfields, heliports, and military strips.
 */

import { overpassQuery, type OverpassElement } from "@/lib/overpass";

export interface Airport {
  /** OSM element identity, e.g. "way/123456". */
  id: string;
  name: string;
  iata?: string;
  latitude: number;
  longitude: number;
  /**
   * True for airports tagged as international or with passenger volume —
   * preferred over small IATA-coded airfields when picking the nearest.
   */
  isMajor: boolean;
}

export interface AirportIntelligence {
  airport: Airport;
  /** Distance in km (1 decimal). Driving distance when source is "google". */
  distanceKm: number;
  /** Drive time in minutes. Real when source is "google", else an estimate. */
  driveMinutes: number;
  /** 0–100; higher = easier airport access. */
  accessibilityScore: number;
  /** Where distance/time came from: a real Google route, or our estimate. */
  source: "google" | "estimate";
}

export const AIRPORT_SEARCH_RADIUS_KM = 100;
const URBAN_SPEED_KMH = 40;

/* ------------------------------------------------------------------ */
/* Distance & estimates                                                */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateDriveMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / URBAN_SPEED_KMH) * 60));
}

/**
 * Distance → 0–100 score, linearly interpolated between band breakpoints:
 * under 10 km is excellent (85+), 10–25 km good (70–84), 25–50 km moderate
 * (40–69), beyond 50 km poor.
 */
const SCORE_BREAKPOINTS: [km: number, score: number][] = [
  [0, 100],
  [10, 85],
  [25, 70],
  [50, 40],
  [100, 10],
];

export function airportAccessibilityScore(distanceKm: number): number {
  const last = SCORE_BREAKPOINTS[SCORE_BREAKPOINTS.length - 1];
  if (distanceKm >= last[0]) return 5;
  for (let i = 1; i < SCORE_BREAKPOINTS.length; i++) {
    const [km, score] = SCORE_BREAKPOINTS[i];
    if (distanceKm <= km) {
      const [prevKm, prevScore] = SCORE_BREAKPOINTS[i - 1];
      const t = (distanceKm - prevKm) / (km - prevKm);
      return Math.round(prevScore + t * (score - prevScore));
    }
  }
  return 5;
}

/* ------------------------------------------------------------------ */
/* Airport lookup                                                      */
/* ------------------------------------------------------------------ */

/**
 * Airports change slowly across a metro area, so the lookup cache is keyed
 * by coarsely rounded coordinates (1 decimal ≈ 11 km): every stay in the
 * same city shares one Overpass request. The nearest airport and distances
 * are still computed from each stay's exact coordinates.
 */
const airportCache = new Map<string, Promise<Airport[]>>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function toAirport(element: OverpassElement): Airport | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const tags = element.tags ?? {};
  const name = tags["name:en"] ?? tags.name ?? tags.iata;
  if (latitude === undefined || longitude === undefined || !name) return null;
  const isMajor =
    tags.aerodrome === "international" ||
    (tags["aerodrome:type"]?.includes("international") ?? false) ||
    tags.passengers !== undefined;
  return {
    id: `${element.type}/${element.id}`,
    name,
    iata: tags.iata,
    latitude,
    longitude,
    isMajor,
  };
}

/** All IATA-coded airports within the search radius, session-cached. */
export function fetchAirportsNear(
  lat: number,
  lng: number
): Promise<Airport[]> {
  const key = cacheKey(lat, lng);

  const cached = airportCache.get(key);
  if (cached) return cached;

  const query = `
[out:json][timeout:25];
nwr["aeroway"="aerodrome"]["iata"](around:${AIRPORT_SEARCH_RADIUS_KM * 1000},${lat},${lng});
out center 30;`;

  const request = overpassQuery(query)
    .then((elements) =>
      elements
        .map(toAirport)
        .filter((airport): airport is Airport => airport !== null)
    )
    .catch((error: unknown) => {
      airportCache.delete(key);
      throw error;
    });

  airportCache.set(key, request);
  return request;
}

/**
 * Nearest major airport for a location with distance, drive estimate, and
 * accessibility score. Returns null when no IATA-coded airport exists
 * within the search radius.
 */
export async function getAirportIntelligence(
  lat: number,
  lng: number
): Promise<AirportIntelligence | null> {
  const airports = await fetchAirportsNear(lat, lng);
  if (airports.length === 0) return null;

  // Prefer real passenger airports; only fall back to small IATA-coded
  // airfields when no major airport is within the search radius.
  const major = airports.filter((airport) => airport.isMajor);
  const candidates = major.length > 0 ? major : airports;

  let nearest = candidates[0];
  let nearestKm = haversineKm(lat, lng, nearest.latitude, nearest.longitude);
  for (const airport of candidates.slice(1)) {
    const km = haversineKm(lat, lng, airport.latitude, airport.longitude);
    if (km < nearestKm) {
      nearest = airport;
      nearestKm = km;
    }
  }

  const distanceKm = Math.round(nearestKm * 10) / 10;
  return {
    airport: nearest,
    distanceKm,
    driveMinutes: estimateDriveMinutes(distanceKm),
    accessibilityScore: airportAccessibilityScore(distanceKm),
    source: "estimate",
  };
}

/**
 * Merge a real Google driving route into an airport intelligence record,
 * replacing the straight-line estimate with actual distance + duration.
 */
export function withDrivingRoute(
  intel: AirportIntelligence,
  route: { distanceKm: number; durationMinutes: number }
): AirportIntelligence {
  const distanceKm = Math.round(route.distanceKm * 10) / 10;
  return {
    ...intel,
    distanceKm,
    driveMinutes: Math.max(1, Math.round(route.durationMinutes)),
    accessibilityScore: airportAccessibilityScore(distanceKm),
    source: "google",
  };
}
