/**
 * Nearby-places lookups via the OpenStreetMap Overpass API — free, no key.
 *
 * One minimal query per stay location, results cached for the session by
 * rounded coordinates; requests go through the shared throttled client in
 * lib/overpass.ts.
 */

import { overpassQuery, type OverpassElement } from "@/lib/overpass";
import type {
  LocationScoreBreakdown,
  NearbyCategory,
  NearbyPlace,
  NearbyPlaceCounts,
  TravelerTypeId,
} from "@/lib/types";

export const DEFAULT_NEARBY_RADIUS_M = 800;

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

/**
 * Session cache keyed by rounded coordinates (3 decimals ≈ 110 m), so two
 * stays on the same block share one request and re-renders never refetch.
 */
const nearbyCache = new Map<string, Promise<NearbyPlace[]>>();

function cacheKey(lat: number, lng: number, radius: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

function buildQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${radius},${lat},${lng})`;
  return `
[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe|pharmacy|hospital|clinic|doctors|bar|pub|nightclub|biergarten|bus_station)$"]${around};
  nwr["shop"~"^(supermarket|grocery|greengrocer|convenience|chemist)$"]${around};
  node["highway"="bus_stop"]${around};
  nwr["railway"~"^(station|tram_stop|halt|subway_entrance)$"]${around};
  nwr["leisure"~"^(park|garden)$"]${around};
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo)$"]${around};
);
out center 600;`;
}

/**
 * Fetch and categorize everything of interest within `radius` meters.
 * Cached per session by rounded coordinates; failures are evicted so a
 * retry can succeed.
 */
export function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number = DEFAULT_NEARBY_RADIUS_M
): Promise<NearbyPlace[]> {
  const key = cacheKey(lat, lng, radius);

  const cached = nearbyCache.get(key);
  if (cached) return cached;

  const request = overpassQuery(buildQuery(lat, lng, radius))
    .then(categorizePlaces)
    .catch((error: unknown) => {
      nearbyCache.delete(key);
      throw error;
    });

  nearbyCache.set(key, request);
  return request;
}

/* ------------------------------------------------------------------ */
/* Categorization                                                      */
/* ------------------------------------------------------------------ */

const AMENITY_CATEGORIES: Record<string, NearbyCategory> = {
  restaurant: "restaurant",
  fast_food: "restaurant",
  cafe: "cafe",
  pharmacy: "pharmacy",
  hospital: "healthcare",
  clinic: "healthcare",
  doctors: "healthcare",
  bar: "nightlife",
  pub: "nightlife",
  nightclub: "nightlife",
  biergarten: "nightlife",
  bus_station: "transit",
};

const SHOP_CATEGORIES: Record<string, NearbyCategory> = {
  supermarket: "grocery",
  grocery: "grocery",
  greengrocer: "grocery",
  convenience: "grocery",
  chemist: "pharmacy",
};

const RAILWAY_CATEGORIES: Record<string, NearbyCategory> = {
  station: "transit",
  tram_stop: "transit",
  halt: "transit",
  subway_entrance: "transit",
};

const LEISURE_CATEGORIES: Record<string, NearbyCategory> = {
  park: "park",
  garden: "park",
};

const TOURISM_CATEGORIES: Record<string, NearbyCategory> = {
  attraction: "attraction",
  museum: "attraction",
  gallery: "attraction",
  viewpoint: "attraction",
  zoo: "attraction",
};

function categoryForTags(
  tags: Record<string, string>
): NearbyCategory | null {
  if (tags.amenity && AMENITY_CATEGORIES[tags.amenity]) {
    return AMENITY_CATEGORIES[tags.amenity];
  }
  if (tags.shop && SHOP_CATEGORIES[tags.shop]) {
    return SHOP_CATEGORIES[tags.shop];
  }
  if (tags.highway === "bus_stop") return "transit";
  if (tags.railway && RAILWAY_CATEGORIES[tags.railway]) {
    return RAILWAY_CATEGORIES[tags.railway];
  }
  if (tags.leisure && LEISURE_CATEGORIES[tags.leisure]) {
    return LEISURE_CATEGORIES[tags.leisure];
  }
  if (tags.tourism && TOURISM_CATEGORIES[tags.tourism]) {
    return TOURISM_CATEGORIES[tags.tourism];
  }
  return null;
}

/** Map raw Overpass elements to typed places; unknown tags are dropped. */
export function categorizePlaces(
  rawPlaces: OverpassElement[]
): NearbyPlace[] {
  const places: NearbyPlace[] = [];
  for (const element of rawPlaces) {
    const tags = element.tags;
    if (!tags) continue;
    const category = categoryForTags(tags);
    if (!category) continue;
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (latitude === undefined || longitude === undefined) continue;
    places.push({
      id: `${element.type}/${element.id}`,
      name: tags.name,
      category,
      latitude,
      longitude,
    });
  }
  return places;
}

export function countNearbyPlaces(places: NearbyPlace[]): NearbyPlaceCounts {
  const counts: NearbyPlaceCounts = {
    restaurant: 0,
    cafe: 0,
    grocery: 0,
    pharmacy: 0,
    healthcare: 0,
    transit: 0,
    nightlife: 0,
    park: 0,
    attraction: 0,
  };
  for (const place of places) {
    counts[place.category] += 1;
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/**
 * Saturating 0–100 score: hits 50 at `half` places and approaches 100
 * with diminishing returns, so one extra cafe matters in a quiet suburb
 * but not in a city center.
 */
function saturate(count: number, half: number): number {
  return Math.round((100 * count) / (count + half));
}

/** Convenience weights per traveler type (each row sums to 1). */
const CONVENIENCE_WEIGHTS: Record<
  TravelerTypeId,
  { food: number; grocery: number; transit: number; healthcare: number }
> = {
  solo: { food: 0.3, grocery: 0.15, transit: 0.35, healthcare: 0.2 },
  couple: { food: 0.4, grocery: 0.15, transit: 0.25, healthcare: 0.2 },
  family: { food: 0.25, grocery: 0.3, transit: 0.2, healthcare: 0.25 },
  friends: { food: 0.4, grocery: 0.2, transit: 0.3, healthcare: 0.1 },
  business: { food: 0.25, grocery: 0.1, transit: 0.5, healthcare: 0.15 },
};

export function calculateLocationScores(
  places: NearbyPlace[],
  travelerType: TravelerTypeId
): LocationScoreBreakdown {
  const counts = countNearbyPlaces(places);

  const foodAccessScore = saturate(counts.restaurant + counts.cafe, 8);
  const groceryAccessScore = saturate(counts.grocery, 2);
  const transitScore = saturate(counts.transit, 4);
  const healthcareAccessScore = saturate(
    counts.pharmacy + counts.healthcare,
    2
  );
  // Half-saturation of 12 keeps a handful of pubs from reading as a party
  // district; 800 m in a city center can legitimately contain 50+ venues.
  const nightlifeDensityScore = saturate(counts.nightlife, 12);
  const quietRiskScore = nightlifeDensityScore;

  const weights = CONVENIENCE_WEIGHTS[travelerType];
  const convenienceScore = Math.round(
    foodAccessScore * weights.food +
      groceryAccessScore * weights.grocery +
      transitScore * weights.transit +
      healthcareAccessScore * weights.healthcare
  );

  return {
    foodAccessScore,
    groceryAccessScore,
    transitScore,
    healthcareAccessScore,
    nightlifeDensityScore,
    quietRiskScore,
    convenienceScore,
  };
}

export function quietRiskLabel(score: number): "Low" | "Moderate" | "High" {
  if (score < 34) return "Low";
  if (score < 67) return "Moderate";
  return "High";
}
