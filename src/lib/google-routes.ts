/**
 * Server-only Google Routes client. Imported exclusively by the
 * /api/airport-route handler, so GOOGLE_MAPS_API_KEY never reaches the
 * browser. Uses the Routes API computeRoutes endpoint for a real driving
 * distance + duration, with an in-memory cache keyed by rounded coordinates.
 */

import "server-only";

const ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingRoute {
  distanceKm: number;
  durationMinutes: number;
}

const cache = new Map<string, Promise<DrivingRoute | null>>();

function cacheKey(origin: LatLng, dest: LatLng): string {
  return (
    `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}` +
    `->${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`
  );
}

async function requestRoute(
  origin: LatLng,
  dest: LatLng,
  apiKey: string
): Promise<DrivingRoute | null> {
  try {
    const response = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      routes?: { distanceMeters?: number; duration?: string }[];
    };
    const route = data.routes?.[0];
    if (!route) return null;
    const meters = Number(route.distanceMeters);
    // duration comes back like "1234s".
    const seconds = Number(String(route.duration ?? "").replace(/s$/, ""));
    if (!Number.isFinite(meters) || !Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }
    return { distanceKm: meters / 1000, durationMinutes: seconds / 60 };
  } catch {
    return null;
  }
}

/**
 * Real driving distance + duration between two points, or null when the key
 * is missing or Google fails (callers then fall back to the estimate).
 */
export function getDrivingRoute(
  origin: LatLng,
  dest: LatLng
): Promise<DrivingRoute | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.resolve(null);

  const key = cacheKey(origin, dest);
  const cached = cache.get(key);
  if (cached) return cached;

  const request = requestRoute(origin, dest, apiKey).then((result) => {
    // Don't cache failures — let the next attempt retry.
    if (result === null) cache.delete(key);
    return result;
  });
  cache.set(key, request);
  return request;
}
