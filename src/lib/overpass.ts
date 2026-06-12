/**
 * Shared client for the OpenStreetMap Overpass API — free, no key.
 *
 * All ScoutStay features that query Overpass (nearby places, airports) go
 * through this single throttled queue, so combined usage stays at ~1
 * request per second toward the shared public instance. Production apps
 * should run their own Overpass instance or use a paid provider.
 */

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "ScoutStay/0.1 (https://github.com/Shreyakb301/ScoutStay)";

const MIN_REQUEST_INTERVAL_MS = 1000;
let lastRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

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

/** Run an Overpass QL query and return its elements. Throttled to ~1 req/s. */
export function overpassQuery(query: string): Promise<OverpassElement[]> {
  return throttled(async () => {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass 406s clients without an identifying User-Agent. Browsers
        // set their own (this header is forbidden there); this covers
        // server-side/script use.
        ...(typeof window === "undefined" ? { "User-Agent": USER_AGENT } : {}),
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (response.status === 429) {
      throw new Error("Overpass rate limit reached — try again in a moment");
    }
    if (!response.ok) {
      throw new Error(`Overpass request failed with status ${response.status}`);
    }
    const data = (await response.json()) as OverpassResponse;
    return data.elements ?? [];
  });
}
