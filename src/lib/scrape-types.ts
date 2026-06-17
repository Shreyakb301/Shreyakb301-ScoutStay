/**
 * Shared types for the Airbnb scrape import flow. These cross the
 * server/client boundary (the API route returns NormalizedListing; the review
 * UI consumes it), so this module stays free of any server-only imports.
 */

import type { FacilityId } from "@/lib/types";

export type Confidence = "high" | "medium" | "low";

/** A single extracted field with provenance + how much to trust it. */
export interface FieldEvidence<T> {
  field: string;
  value: T;
  /** Where the value came from, e.g. "apify", "derived", "fallback". */
  source: string;
  confidence: Confidence;
}

/**
 * Listing data normalized into ScoutStay's shape. Every field carries
 * confidence metadata so the review screen can flag low-trust values.
 */
export interface NormalizedListing {
  url: string;
  name: FieldEvidence<string | null>;
  pricePerNight: FieldEvidence<number | null>;
  address: FieldEvidence<string | null>;
  city: FieldEvidence<string | null>;
  region: FieldEvidence<string | null>;
  latitude: FieldEvidence<number | null>;
  longitude: FieldEvidence<number | null>;
  bedrooms: FieldEvidence<number | null>;
  beds: FieldEvidence<number | null>;
  bathrooms: FieldEvidence<number | null>;
  maxGuests: FieldEvidence<number | null>;
  rating: FieldEvidence<number | null>;
  reviewCount: FieldEvidence<number | null>;
  facilities: FieldEvidence<FacilityId[]>;
  amenities: FieldEvidence<string[]>;
  description: FieldEvidence<string | null>;
  reviews: FieldEvidence<string[]>;
  houseRules: FieldEvidence<string | null>;
  hostInfo: FieldEvidence<string | null>;
  images: FieldEvidence<string[]>;
  checkInInfo: FieldEvidence<string | null>;
  cancellationInfo: FieldEvidence<string | null>;
  /** Non-fatal notes about what couldn't be extracted or looked off. */
  warnings: string[];
}

export type ScrapeErrorCode =
  | "invalid_url"
  | "not_configured"
  | "timeout"
  | "no_data"
  | "provider_error";

export interface ScrapeSuccess {
  ok: true;
  listing: NormalizedListing;
}

export interface ScrapeFailure {
  ok: false;
  code: ScrapeErrorCode;
  error: string;
}

export type ScrapeResult = ScrapeSuccess | ScrapeFailure;
