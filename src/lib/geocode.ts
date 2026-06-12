/**
 * Geocoding via OpenStreetMap's Nominatim — free, no API key.
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * - at most 1 request per second  → enforced by the throttle queue below
 * - no excessive repeat queries   → session cache + debounced callers
 * - identify the application      → browsers send Referer automatically;
 *   server-side callers get an explicit User-Agent.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

export interface GeocodeResult extends LngLat {
  /** Nominatim's formatted display name for the match. */
  displayName: string;
}

/** A single result from the Nominatim autocomplete search. */
export interface AddressSuggestion {
  id: string;
  /** Short name of the place, e.g. "Avenida da Liberdade". */
  placeName: string;
  /** Full formatted address. */
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

interface NominatimPlace {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "ScoutStay/0.1 (https://github.com/Shreyakb301/ScoutStay)";

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

const MIN_REQUEST_INTERVAL_MS = 1100;
let lastRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

/** Serializes Nominatim requests with ≥1.1s spacing, per their usage policy. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(async () => {
    const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return task();
  });
  requestQueue = run.catch(() => undefined);
  return run;
}

async function fetchPlaces(
  query: string,
  limit: number
): Promise<NominatimPlace[]> {
  const url =
    `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}` +
    `&format=jsonv2&addressdetails=1&limit=${limit}`;

  const response = await throttled(() =>
    fetch(url, {
      headers: {
        Accept: "application/json",
        // User-Agent is a forbidden header in browsers (the browser sets its
        // own); this only applies if the module is ever used server-side.
        ...(typeof window === "undefined" ? { "User-Agent": USER_AGENT } : {}),
      },
    })
  );

  if (response.status === 429) {
    throw new Error("Nominatim rate limit reached — try again in a moment");
  }
  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }
  return (await response.json()) as NominatimPlace[];
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function placeCity(place: NominatimPlace): string | undefined {
  const address = place.address ?? {};
  return (
    address.city ?? address.town ?? address.village ?? address.municipality
  );
}

function placeRegion(place: NominatimPlace): string | undefined {
  const address = place.address ?? {};
  return address.state ?? address.region ?? address.county;
}

function toSuggestion(place: NominatimPlace): AddressSuggestion | null {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (
    !place.display_name ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }
  return {
    id: String(place.place_id ?? place.display_name),
    placeName: place.name || place.display_name.split(",")[0],
    formattedAddress: place.display_name,
    latitude,
    longitude,
    city: placeCity(place),
    region: placeRegion(place),
  };
}

/* ------------------------------------------------------------------ */
/* Geocoding (single best match)                                       */
/* ------------------------------------------------------------------ */

/**
 * Session-scoped cache keyed by normalized address. Storing the promise
 * (not just the result) also dedupes concurrent requests for the same
 * address while one is in flight.
 */
const geocodeCache = new Map<string, Promise<GeocodeResult | null>>();

/**
 * Resolve an address to coordinates. Returns null when Nominatim has no
 * match. Results are cached in memory for the session; failures are not
 * cached so a retry (e.g. after a rate limit) can still succeed.
 */
export function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const key = address.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const request = fetchPlaces(key, 1)
    .then((places) => {
      const suggestion = places[0] ? toSuggestion(places[0]) : null;
      if (!suggestion) return null;
      return {
        lng: suggestion.longitude,
        lat: suggestion.latitude,
        displayName: suggestion.formattedAddress,
      };
    })
    .catch((error: unknown) => {
      geocodeCache.delete(key);
      throw error;
    });
  geocodeCache.set(key, request);
  return request;
}

/* ------------------------------------------------------------------ */
/* Address autocomplete                                                */
/* ------------------------------------------------------------------ */

/** Session cache for autocomplete queries, keyed by normalized query text. */
const suggestionCache = new Map<string, Promise<AddressSuggestion[]>>();

/**
 * Autocomplete search against Nominatim. Results are cached in memory per
 * session; failures are evicted so a retry can succeed.
 */
export function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const key = query.trim().toLowerCase();
  if (!key) return Promise.resolve([]);

  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const request = fetchPlaces(key, 5)
    .then((places) =>
      places
        .map(toSuggestion)
        .filter(
          (suggestion): suggestion is AddressSuggestion => suggestion !== null
        )
    )
    .catch((error: unknown) => {
      suggestionCache.delete(key);
      throw error;
    });
  suggestionCache.set(key, request);
  return request;
}
