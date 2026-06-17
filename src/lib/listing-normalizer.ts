/**
 * Listing normalizer — best-effort mapping from a raw Apify Airbnb-scraper
 * item into ScoutStay's normalized shape, plus the conversion into a
 * StayListing for the comparison. Pure and isomorphic: it never touches the
 * network or process.env, so it runs on both the API route and the client.
 *
 * Airbnb's markup and the various community actors change often, so every
 * getter tries several likely shapes and degrades gracefully.
 */

import type { FacilityId, StayListing } from "@/lib/types";
import { ALL_FACILITY_IDS } from "@/lib/facilities";
import type {
  Confidence,
  FieldEvidence,
  NormalizedListing,
} from "@/lib/scrape-types";

const SOURCE = "apify";

/** Validates a string is a well-formed Airbnb listing link. */
export function isValidAirbnbUrl(value: string): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "abnb.me") return true;
  if (!/(^|\.)airbnb\.[a-z.]+$/.test(host)) return false;
  return /\/rooms\/\d+/.test(url.pathname);
}

// --- defensive value readers ----------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toStr(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Read the first key that yields a non-null value, walking dotted paths. */
function pickFrom(
  obj: Record<string, unknown>,
  paths: string[]
): unknown {
  for (const path of paths) {
    let current: unknown = obj;
    for (const segment of path.split(".")) {
      const rec = asRecord(current);
      if (!rec) {
        current = undefined;
        break;
      }
      current = rec[segment];
    }
    if (current !== undefined && current !== null && current !== "") {
      return current;
    }
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, paths: string[]): string | null {
  return toStr(pickFrom(obj, paths));
}

function pickNumber(obj: Record<string, unknown>, paths: string[]): number | null {
  return toNum(pickFrom(obj, paths));
}

function ev<T>(field: string, value: T, confidence: Confidence): FieldEvidence<T> {
  return { field, value, source: SOURCE, confidence };
}

/** Confidence "high" when the value resolved, "low" when it's null/empty. */
function autoEv<T>(field: string, value: T | null): FieldEvidence<T | null> {
  const present =
    value !== null &&
    value !== undefined &&
    !(Array.isArray(value) && value.length === 0);
  return ev(field, value, present ? "high" : "low");
}

// --- amenity → facility mapping --------------------------------------------

const FACILITY_KEYWORDS: Record<FacilityId, string[]> = {
  wifi: ["wifi", "wi-fi", "wireless internet", "internet"],
  kitchen: ["kitchen", "kitchenette", "cooking basics"],
  "washer-dryer": ["washer", "dryer", "laundry", "washing machine"],
  "air-conditioning": ["air conditioning", "air-conditioning", "ac unit"],
  heating: ["heating", "heater", "central heating", "radiant heating"],
  workspace: ["workspace", "dedicated workspace", "desk", "laptop-friendly"],
  "free-parking": ["free parking", "free residential parking", "free driveway parking"],
  "self-check-in": ["self check-in", "self check in", "lockbox", "keypad", "smart lock"],
  "dedicated-entrance": ["private entrance", "separate entrance", "dedicated entrance"],
  pool: ["pool", "swimming pool", "shared pool", "private pool"],
  gym: ["gym", "fitness", "exercise equipment"],
  "hot-tub": ["hot tub", "jacuzzi", "hot-tub"],
  "balcony-patio": ["balcony", "patio", "terrace"],
  "pet-friendly": ["pets allowed", "pet friendly", "pet-friendly", "dogs allowed", "cats allowed"],
  "security-cameras": ["security camera", "security cameras", "doorbell camera", "cctv"],
  "smoke-alarm": ["smoke alarm", "smoke detector"],
  "carbon-monoxide-alarm": ["carbon monoxide alarm", "carbon monoxide detector", "co alarm", "co detector"],
  "first-aid-kit": ["first aid kit", "first-aid"],
  "fire-extinguisher": ["fire extinguisher"],
};

export function mapAmenitiesToFacilities(amenities: string[]): FacilityId[] {
  const haystack = amenities.map((a) => a.toLowerCase());
  return ALL_FACILITY_IDS.filter((id) =>
    FACILITY_KEYWORDS[id].some((keyword) =>
      haystack.some((amenity) => amenity.includes(keyword))
    )
  );
}

// --- collection extractors --------------------------------------------------

/** Flatten amenities given as strings, {title|name}, or grouped {values}. */
function extractAmenities(raw: Record<string, unknown>): string[] {
  const source =
    pickFrom(raw, ["amenities", "amenityIds", "previewAmenities", "listingAmenities"]) ??
    [];
  const out: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      const s = value.trim();
      if (s) out.push(s);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const rec = asRecord(value);
    if (rec) {
      // Airbnb lists unavailable amenities too — skip those.
      if (rec.available === false) return;
      const label = toStr(rec.title ?? rec.name ?? rec.label ?? rec.text);
      if (label) out.push(label);
      if (Array.isArray(rec.values)) rec.values.forEach(visit);
    }
  };
  visit(source);
  return [...new Set(out)];
}

/** Strip HTML tags / common entities from a description blob. */
function stripHtml(value: string | null): string | null {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return text || null;
}

interface RoomCounts {
  guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
}

/** Parse "12 guests", "4 bedrooms", "5 beds", "3.5 baths" from a string list. */
function parseRoomCounts(parts: string[]): RoomCounts {
  const counts: RoomCounts = {
    guests: null,
    bedrooms: null,
    beds: null,
    bathrooms: null,
  };
  for (const part of parts) {
    // Order matters: match "bedroom" before "bed".
    const match = part.match(/([\d.]+)\s*(guest|bedroom|bed|bath)/i);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const kind = match[2].toLowerCase();
    if (kind === "guest" && counts.guests === null) counts.guests = value;
    else if (kind === "bedroom" && counts.bedrooms === null) counts.bedrooms = value;
    else if (kind === "bed" && counts.beds === null) counts.beds = value;
    else if (kind === "bath" && counts.bathrooms === null) counts.bathrooms = value;
  }
  return counts;
}

/** Join house-rule titles into a single text blob. */
function extractHouseRules(raw: Record<string, unknown>): string | null {
  const source = raw.houseRules;
  if (Array.isArray(source)) {
    const titles = source
      .map((item) =>
        typeof item === "string" ? item : toStr(asRecord(item)?.title)
      )
      .filter((s): s is string => Boolean(s));
    return titles.length > 0 ? titles.join(". ") : null;
  }
  return toStr(source);
}

/** Find the check-in/checkout line in the house rules, if present. */
function extractCheckIn(raw: Record<string, unknown>): string | null {
  const source = raw.houseRules;
  if (!Array.isArray(source)) return null;
  const lines = source
    .map((item) => (typeof item === "string" ? item : toStr(asRecord(item)?.title)))
    .filter((s): s is string => Boolean(s))
    .filter((s) => /check.?in|check.?out|checkout/i.test(s));
  return lines.length > 0 ? lines.join(". ") : null;
}

/** Summarize the host into a short string. */
function extractHostInfo(raw: Record<string, unknown>): string | null {
  const host = asRecord(raw.hostDetails) ?? asRecord(raw.host);
  if (!host) return toStr(pickFrom(raw, ["hostName", "host.name"]));
  const name = toStr(host.name);
  if (!name) return null;
  return host.isSuperhost ? `${name} (Superhost)` : name;
}

/** Pull a nightly price out of the various costPerNight/price shapes. */
function extractPrice(raw: Record<string, unknown>): number | null {
  const cost = raw.costPerNight;
  if (typeof cost === "number") return cost;
  const rec = asRecord(cost);
  if (rec) {
    const n = toNum(rec.amount ?? rec.price ?? rec.total ?? rec.rate);
    if (n !== null) return n;
  }
  return pickNumber(raw, [
    "price",
    "pricePerNight",
    "price.rate",
    "price.amount",
    "pricing.rate.amount",
    "rate",
  ]);
}

/** Flatten reviews given as strings or {comments|text|review} objects. */
function extractReviews(raw: Record<string, unknown>): string[] {
  const source = pickFrom(raw, ["reviews", "reviewsList", "guestReviews"]) ?? [];
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const rec = asRecord(item);
      return rec
        ? toStr(rec.comments ?? rec.text ?? rec.review ?? rec.body) ?? ""
        : "";
    })
    .filter(Boolean)
    .slice(0, 20);
}

function extractImages(raw: Record<string, unknown>): string[] {
  const source =
    pickFrom(raw, ["images", "photos", "pictures", "thumbnails"]) ?? [];
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (typeof item === "string") return item;
      const rec = asRecord(item);
      return rec ? toStr(rec.url ?? rec.src ?? rec.imageUrl ?? rec.picture) : null;
    })
    .filter((u): u is string => Boolean(u))
    .slice(0, 12);
}

// --- main normalizer --------------------------------------------------------

export function normalizeApifyItem(
  rawItem: unknown,
  url: string
): NormalizedListing {
  const raw = asRecord(rawItem) ?? {};
  const warnings: string[] = [];
  const location = asRecord(raw.location);

  const name = pickString(raw, ["title", "name", "sharingTitle", "listingName"]);
  const price = extractPrice(raw);

  // Room counts come from "12 guests / 4 bedrooms / 5 beds / 3.5 baths"
  // strings, with the sharing title as a fallback source.
  const overview = Array.isArray(raw.overviewItems)
    ? (raw.overviewItems as unknown[]).filter(
        (x): x is string => typeof x === "string"
      )
    : [];
  const sharing = toStr(raw.sharingTitle);
  const counts = parseRoomCounts(
    overview.length > 0 ? overview : sharing ? sharing.split(/[·•]/) : []
  );

  const city =
    (location ? toStr(location.title) : null) ??
    pickString(raw, ["city", "location.city"]);
  // The title usually reads "Entire home in Rocky Mount, Missouri".
  const region =
    name && name.includes(",")
      ? name.split(",").pop()!.trim() || null
      : pickString(raw, ["region", "state"]);

  // Airbnb hides exact addresses; "Neighborhood highlights" is a section
  // label, not an address — fall back to the city/region in that case.
  const rawAddress =
    (location ? toStr(location.address) : null) ??
    pickString(raw, ["address", "publicAddress", "fullAddress"]);
  const address =
    rawAddress && !/neighborhood|highlight/i.test(rawAddress)
      ? rawAddress
      : [city, region].filter(Boolean).join(", ") || rawAddress;

  const latitude =
    (location ? toNum(location.latitude) : null) ??
    pickNumber(raw, ["latitude", "lat", "coordinates.latitude"]);
  const longitude =
    (location ? toNum(location.longitude) : null) ??
    pickNumber(raw, ["longitude", "lng", "coordinates.longitude"]);

  const bedrooms = counts.bedrooms ?? pickNumber(raw, ["bedrooms"]);
  const beds = counts.beds ?? pickNumber(raw, ["beds"]);
  const bathrooms = counts.bathrooms ?? pickNumber(raw, ["bathrooms", "baths"]);
  const maxGuests =
    pickNumber(raw, ["maxGuestCapacity", "maxGuests", "personCapacity"]) ??
    counts.guests;
  const rating = pickNumber(raw, ["starRating", "rating", "stars", "avgRating"]);
  const reviewCount = pickNumber(raw, [
    "reviewsCount",
    "reviewCount",
    "numberOfReviews",
  ]);
  const description = stripHtml(
    pickString(raw, ["description", "summary", "about"])
  );
  const houseRules = extractHouseRules(raw);
  const hostInfo = extractHostInfo(raw);
  const checkInInfo = extractCheckIn(raw);
  const cancellationInfo = pickString(raw, [
    "cancellationPolicy",
    "cancellation",
    "cancellationInfo",
  ]);

  const amenities = extractAmenities(raw);
  const facilities = mapAmenitiesToFacilities(amenities);
  // The actor exposes pets via a dedicated field, not always an amenity.
  if (raw.petsAllowed && !facilities.includes("pet-friendly")) {
    facilities.push("pet-friendly");
  }
  const reviews = extractReviews(raw);
  const images = extractImages(raw);

  if (!name) warnings.push("Could not read the listing title.");
  if (price === null) {
    warnings.push(
      "No nightly price returned — the listing may be unavailable for the sample dates. Add the price manually."
    );
  }
  if (latitude === null || longitude === null) {
    warnings.push("Could not read coordinates — map and location data may be limited.");
  }
  if (amenities.length === 0) {
    warnings.push("No amenities found — facilities comparison may be empty.");
  }

  return {
    url,
    name: autoEv("name", name),
    pricePerNight: autoEv("pricePerNight", price),
    address: autoEv("address", address),
    city: autoEv("city", city),
    region: autoEv("region", region),
    latitude: autoEv("latitude", latitude),
    longitude: autoEv("longitude", longitude),
    bedrooms: autoEv("bedrooms", bedrooms),
    beds: autoEv("beds", beds),
    bathrooms: autoEv("bathrooms", bathrooms),
    maxGuests: autoEv("maxGuests", maxGuests),
    rating: autoEv("rating", rating),
    reviewCount: autoEv("reviewCount", reviewCount),
    // Facilities are inferred from amenity text → medium confidence at best.
    facilities: ev("facilities", facilities, facilities.length > 0 ? "medium" : "low"),
    amenities: ev("amenities", amenities, amenities.length > 0 ? "high" : "low"),
    description: autoEv("description", description),
    reviews: ev("reviews", reviews, reviews.length > 0 ? "high" : "low"),
    houseRules: autoEv("houseRules", houseRules),
    hostInfo: autoEv("hostInfo", hostInfo),
    images: ev("images", images, images.length > 0 ? "high" : "low"),
    checkInInfo: autoEv("checkInInfo", checkInInfo),
    cancellationInfo: autoEv("cancellationInfo", cancellationInfo),
    warnings,
  };
}

/** A blank normalized listing for the manual-paste fallback. */
export function emptyNormalizedListing(url: string): NormalizedListing {
  const lo = <T>(field: string, value: T) =>
    ({ field, value, source: "fallback", confidence: "low" }) as FieldEvidence<T>;
  return {
    url,
    name: lo("name", null),
    pricePerNight: lo("pricePerNight", null),
    address: lo("address", null),
    city: lo("city", null),
    region: lo("region", null),
    latitude: lo("latitude", null),
    longitude: lo("longitude", null),
    bedrooms: lo("bedrooms", null),
    beds: lo("beds", null),
    bathrooms: lo("bathrooms", null),
    maxGuests: lo("maxGuests", null),
    rating: lo("rating", null),
    reviewCount: lo("reviewCount", null),
    facilities: lo("facilities", [] as FacilityId[]),
    amenities: lo("amenities", [] as string[]),
    description: lo("description", null),
    reviews: lo("reviews", [] as string[]),
    houseRules: lo("houseRules", null),
    hostInfo: lo("hostInfo", null),
    images: lo("images", [] as string[]),
    checkInInfo: lo("checkInInfo", null),
    cancellationInfo: lo("cancellationInfo", null),
    warnings: ["Entered manually — no data was scraped."],
  };
}

/** Convert normalized listing data into a StayListing for the comparison. */
export function normalizedToStayListing(
  listing: NormalizedListing,
  id: string
): StayListing {
  const notesParts = [
    listing.hostInfo.value ? `Host: ${listing.hostInfo.value}` : null,
    listing.checkInInfo.value ? `Check-in: ${listing.checkInInfo.value}` : null,
    listing.cancellationInfo.value
      ? `Cancellation: ${listing.cancellationInfo.value}`
      : null,
  ].filter(Boolean) as string[];

  const stay: StayListing = {
    id,
    name: listing.name.value ?? "Airbnb listing",
    url: listing.url,
    platform: "airbnb",
    pricePerNight:
      listing.pricePerNight.value !== null
        ? String(listing.pricePerNight.value)
        : "",
    facilities: listing.facilities.value,
  };

  if (listing.address.value) stay.address = listing.address.value;
  if (listing.city.value) stay.city = listing.city.value;
  if (listing.region.value) stay.region = listing.region.value;
  if (listing.latitude.value !== null) stay.latitude = listing.latitude.value;
  if (listing.longitude.value !== null) stay.longitude = listing.longitude.value;
  if (listing.bedrooms.value !== null) stay.bedrooms = listing.bedrooms.value;
  if (listing.beds.value !== null) stay.beds = listing.beds.value;
  if (listing.bathrooms.value !== null) stay.bathrooms = listing.bathrooms.value;
  if (listing.maxGuests.value !== null) stay.maxGuests = listing.maxGuests.value;
  if (listing.rating.value !== null) stay.rating = listing.rating.value;
  if (listing.reviewCount.value !== null) stay.reviewCount = listing.reviewCount.value;
  if (listing.description.value) stay.listingDescription = listing.description.value;
  if (listing.reviews.value.length > 0)
    stay.reviewText = listing.reviews.value.join("\n\n");
  if (listing.houseRules.value) stay.houseRulesText = listing.houseRules.value;
  if (listing.amenities.value.length > 0)
    stay.amenitiesText = listing.amenities.value.join(", ");
  if (notesParts.length > 0) stay.notes = notesParts.join(". ");

  return stay;
}
