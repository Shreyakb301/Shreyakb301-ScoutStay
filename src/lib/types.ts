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
  /** Emoji used as a lightweight icon on the selector cards. */
  icon: string;
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
