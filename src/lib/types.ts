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

/** Amenities/facilities a stay may include (Airbnb-style). */
export type FacilityId =
  | "wifi"
  | "security-cameras"
  | "washer-dryer"
  | "pool"
  | "gym"
  | "workspace"
  | "air-conditioning"
  | "pet-friendly"
  | "kitchen"
  | "free-parking"
  | "self-check-in"
  | "heating"
  | "hot-tub"
  | "balcony-patio"
  | "dedicated-entrance"
  | "smoke-alarm"
  | "carbon-monoxide-alarm"
  | "first-aid-kit"
  | "fire-extinguisher";

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
  /** Selected amenities/facilities for this stay. */
  facilities?: FacilityId[];

  /* --- Evidence sources for the RAG stay-match engine (all optional) --- */
  /** Full listing description / "about this space" text. */
  listingDescription?: string;
  /** Pasted guest reviews. */
  reviewText?: string;
  /** House rules text. */
  houseRulesText?: string;
  /** Free-text amenities blurb (in addition to the structured facilities). */
  amenitiesText?: string;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  maxGuests?: number;
  /** Overall rating, 0–5. */
  rating?: number;
  reviewCount?: number;
  squareFeet?: number;
}

/** Purpose of the trip, used to weight the evidence match. */
export type TripPurpose =
  | "leisure"
  | "business"
  | "family"
  | "remote-work"
  | "event"
  | "other";

/**
 * What the traveler actually needs. Drives the Evidence Based Stay Match:
 * boolean needs and numeric thresholds are checked structurally; the free-text
 * rules become retrieval queries against each stay's evidence.
 */
export interface UserTripProfile {
  tripPurpose: TripPurpose;
  travelerCount: number;
  needsTransit: boolean;
  needsQuiet: boolean;
  needsWorkspace: boolean;
  needsPool: boolean;
  needsGym: boolean;
  needsParking: boolean;
  needsPetFriendly: boolean;
  lateArrival: boolean;
  mustHaves: string[];
  dealBreakers: string[];
  niceToHaves: string[];
  plannedDestinations: string[];
  minimumBeds: number;
  minimumBathrooms: number;
  minimumRating: number;
  maxAirportTransferMinutes: number;
}

export function createDefaultUserTripProfile(): UserTripProfile {
  return {
    tripPurpose: "leisure",
    travelerCount: 2,
    needsTransit: false,
    needsQuiet: false,
    needsWorkspace: false,
    needsPool: false,
    needsGym: false,
    needsParking: false,
    needsPetFriendly: false,
    lateArrival: false,
    mustHaves: [],
    dealBreakers: [],
    niceToHaves: [],
    plannedDestinations: [],
    minimumBeds: 0,
    minimumBathrooms: 0,
    minimumRating: 0,
    maxAirportTransferMinutes: 0,
  };
}

export interface ComparisonRequest {
  travelerType: TravelerTypeId;
  stays: StayListing[];
  /** Optional guided-intake context. Scoring uses travelerType; this is extra. */
  tripContext?: import("@/lib/trip-intake").TripContext;
  /** Optional explicit trip needs for the evidence stay-match engine. */
  tripProfile?: UserTripProfile;
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
