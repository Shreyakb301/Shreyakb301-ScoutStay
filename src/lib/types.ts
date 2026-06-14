export type TravelerTypeId =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "business";

export interface TravelerType {
  id: TravelerTypeId;
  label: string;
  description: string;
  /** Short operational passenger code, e.g. "SOLO", "DUO". */
  code: string;
  /** Criteria this traveler type prioritizes when comparing stays. */
  priorities: string[];
}

export type Platform = "airbnb" | "vrbo" | "booking" | "hotel" | "other";

export interface StayListing {
  /** Client-generated id used as the React key. */
  id: string;
  name: string;
  url: string;
  platform: Platform;
  pricePerNight: string;
  /** Formatted address (from autocomplete selection or typed manually). */
  address?: string;
  /** Coordinates, set when the user picks an autocomplete suggestion. */
  latitude?: number;
  longitude?: number;
  /** Short place name from the selected suggestion, e.g. street or POI name. */
  placeName?: string;
  city?: string;
  region?: string;
  /** Optional free-text notes: review snippets, location details, amenities. */
  notes?: string;
}

export interface ComparisonRequest {
  travelerType: TravelerTypeId;
  stays: StayListing[];
}

export const MIN_STAYS = 2;
export const MAX_STAYS = 5;

/* ------------------------------------------------------------------ */
/* Nearby places (OpenStreetMap Overpass)                              */
/* ------------------------------------------------------------------ */

export type NearbyCategory =
  | "restaurant"
  | "cafe"
  | "grocery"
  | "pharmacy"
  | "healthcare"
  | "transit"
  | "nightlife"
  | "park"
  | "attraction";

export interface NearbyPlace {
  /** OSM element identity, e.g. "node/123456". */
  id: string;
  name?: string;
  category: NearbyCategory;
  latitude: number;
  longitude: number;
}

export type NearbyPlaceCounts = Record<NearbyCategory, number>;

/** All scores 0–100. Higher is better except quietRiskScore (higher = noisier area). */
export interface LocationScoreBreakdown {
  foodAccessScore: number;
  groceryAccessScore: number;
  transitScore: number;
  healthcareAccessScore: number;
  nightlifeDensityScore: number;
  quietRiskScore: number;
  convenienceScore: number;
}

/** Real-world location signals for one stay, derived from Overpass data. */
export interface LocationIntelligence {
  radiusMeters: number;
  counts: NearbyPlaceCounts;
  scores: LocationScoreBreakdown;
  places: NearbyPlace[];
}
