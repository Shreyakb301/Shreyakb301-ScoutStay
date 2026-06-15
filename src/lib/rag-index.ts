/**
 * RAG index — turns each stay (and everything we know about it) into a set of
 * small, source-tagged evidence chunks that the retrieval engine can search.
 * This is the "documents" side of the pipeline: listing text, reviews, house
 * rules, amenities, structured facilities, specs, ratings, nearby intelligence,
 * airport intelligence, and the scoring engine's own explanations all become
 * retrievable evidence. Entirely local — no embeddings, no network.
 */

import { facilityLabel } from "@/lib/facilities";
import type { ScoredStay } from "@/lib/scoring";

export type EvidenceSource =
  | "description"
  | "reviews"
  | "house-rules"
  | "amenities"
  | "facilities"
  | "specs"
  | "ratings"
  | "nearby"
  | "airport"
  | "scoring";

export const EVIDENCE_SOURCE_LABEL: Record<EvidenceSource, string> = {
  description: "Listing description",
  reviews: "Guest reviews",
  "house-rules": "House rules",
  amenities: "Amenities",
  facilities: "Facilities",
  specs: "Specs",
  ratings: "Ratings",
  nearby: "Nearby data",
  airport: "Airport access",
  scoring: "Scoring analysis",
};

export interface EvidenceChunk {
  id: string;
  stayId: string;
  stayName: string;
  source: EvidenceSource;
  text: string;
  /** Normalized tokens, for keyword/synonym retrieval. */
  tokens: string[];
}

export interface StayEvidence {
  stayId: string;
  stayName: string;
  chunks: EvidenceChunk[];
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "by", "from", "we", "you", "your", "our", "they", "their",
  "i", "me", "my", "but", "so", "if", "then", "than", "into", "out", "up",
  "down", "very", "just", "also", "can", "will", "has", "have", "had", "do",
  "does", "did", "about", "there", "here", "all", "any", "some", "more", "most",
]);

/** Lowercase, strip punctuation, drop stopwords and 1-char tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/** Split prose into ~maxWords chunks at sentence boundaries. */
function chunkText(text: string, maxWords = 24): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (count + words.length > maxWords && current.length > 0) {
      chunks.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += words.length;
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

function pushSource(
  out: EvidenceChunk[],
  stay: { id: string; name: string },
  source: EvidenceSource,
  text: string | undefined
): void {
  if (!text || !text.trim()) return;
  chunkText(text).forEach((chunkBody, index) => {
    out.push({
      id: `${stay.id}:${source}:${index}`,
      stayId: stay.id,
      stayName: stay.name,
      source,
      text: chunkBody,
      tokens: tokenize(chunkBody),
    });
  });
}

/** Build the full evidence document set for one scored stay. */
export function buildStayEvidence(entry: ScoredStay): StayEvidence {
  const { stay } = entry;
  const ref = { id: stay.id, name: stay.name };
  const chunks: EvidenceChunk[] = [];

  // Free-text sources.
  pushSource(
    chunks,
    ref,
    "description",
    [stay.listingDescription, stay.notes].filter(Boolean).join(". ")
  );
  pushSource(chunks, ref, "reviews", stay.reviewText);
  pushSource(chunks, ref, "house-rules", stay.houseRulesText);
  pushSource(chunks, ref, "amenities", stay.amenitiesText);

  // Structured facilities → one chunk per facility so each is retrievable.
  if (stay.facilities && stay.facilities.length > 0) {
    for (const id of stay.facilities) {
      pushSource(chunks, ref, "facilities", `${facilityLabel(id)} available.`);
    }
  }

  // Specs.
  const specParts: string[] = [];
  if (typeof stay.bedrooms === "number") specParts.push(`${stay.bedrooms} bedrooms`);
  if (typeof stay.beds === "number") specParts.push(`${stay.beds} beds`);
  if (typeof stay.bathrooms === "number") specParts.push(`${stay.bathrooms} bathrooms`);
  if (typeof stay.maxGuests === "number") specParts.push(`sleeps ${stay.maxGuests} guests`);
  if (typeof stay.squareFeet === "number") specParts.push(`${stay.squareFeet} square feet`);
  pushSource(chunks, ref, "specs", specParts.join(", ") + (specParts.length ? "." : ""));

  // Ratings.
  if (typeof stay.rating === "number") {
    const reviews =
      typeof stay.reviewCount === "number"
        ? ` from ${stay.reviewCount} reviews`
        : "";
    pushSource(chunks, ref, "ratings", `Rated ${stay.rating} out of 5${reviews}.`);
  }

  // Nearby intelligence.
  if (entry.nearby) {
    const c = entry.nearby.counts;
    pushSource(
      chunks,
      ref,
      "nearby",
      `Within ${entry.nearby.radiusMeters} meters: ${c.restaurant + c.cafe} restaurants and cafes, ` +
        `${c.grocery} grocery stores, ${c.transit} public transit stops, ` +
        `${c.nightlife} nightlife venues, ${c.pharmacy + c.healthcare} healthcare options, ` +
        `${c.park + c.attraction} parks and attractions.`
    );
    if (c.transit === 0) {
      pushSource(chunks, ref, "nearby", "No public transit stops within walking distance; expect to drive.");
    }
    if (c.nightlife > 15) {
      pushSource(chunks, ref, "nearby", `${c.nightlife} nightlife venues nearby may mean evening noise.`);
    }
  }

  // Airport intelligence.
  if (entry.airport) {
    const iata = entry.airport.airport.iata ? ` (${entry.airport.airport.iata})` : "";
    pushSource(
      chunks,
      ref,
      "airport",
      `${entry.airport.airport.name}${iata} is ${entry.airport.distanceKm} km away, ` +
        `about a ${entry.airport.driveMinutes} minute transfer by car.`
    );
  }

  // Scoring explanations (reasons + positive / negative signals).
  for (const explanation of entry.explanations) {
    const positives = explanation.positives.join(". ");
    const negatives = explanation.negatives.join(". ");
    pushSource(
      chunks,
      ref,
      "scoring",
      `${explanation.label}: ${explanation.reason} ${positives} ${negatives}`.trim()
    );
  }

  return { stayId: stay.id, stayName: stay.name, chunks };
}

/** Build evidence for every stay in the comparison. */
export function buildEvidenceIndex(scoredStays: ScoredStay[]): StayEvidence[] {
  return scoredStays.map(buildStayEvidence);
}
