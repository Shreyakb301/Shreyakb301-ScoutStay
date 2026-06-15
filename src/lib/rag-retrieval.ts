/**
 * RAG retrieval — a lightweight, fully local retrieval engine over the
 * evidence chunks produced by rag-index.ts. No vector database and no
 * embeddings: relevance is scored deterministically from exact keyword,
 * phrase, synonym, facility, location, and negative-signal matches. Given a
 * query (a user rule or need) it returns the best-supported evidence chunks.
 */

import type { EvidenceChunk } from "@/lib/rag-index";
import { tokenize } from "@/lib/rag-index";
import { FACILITIES } from "@/lib/facilities";
import type { FacilityId } from "@/lib/types";

/** Words that flip the meaning of a nearby keyword to "absent / bad". */
const NEGATIVE_CUES = new Set([
  "no", "not", "without", "lack", "lacks", "lacking", "missing", "none",
  "never", "limited", "far", "noisy", "noise", "loud", "broken", "dirty",
  "unsafe", "dated", "cramped", "small", "stairs", "absent", "lacked",
]);

/** Synonym groups — any term expands to its group siblings during retrieval. */
const SYNONYM_GROUPS: string[][] = [
  ["quiet", "quietness", "peaceful", "calm", "silent", "noise", "noisy", "soundproof"],
  ["transit", "metro", "subway", "bus", "tram", "train", "station", "public-transport"],
  ["workspace", "desk", "office", "work", "remote", "wifi", "wi-fi", "internet"],
  ["pool", "swimming"],
  ["gym", "fitness", "exercise"],
  ["parking", "garage", "car", "park"],
  ["pet", "pets", "dog", "dogs", "cat", "cats", "pet-friendly"],
  ["kitchen", "cook", "cooking", "kitchenette", "stove", "oven"],
  ["ac", "air-conditioning", "conditioning", "cooling", "cool"],
  ["heating", "heat", "heater", "warm"],
  ["washer", "laundry", "dryer", "washing"],
  ["family", "kids", "children", "child", "kid", "crib"],
  ["walkable", "walk", "walking", "walkability", "central", "centre", "center", "downtown"],
  ["beach", "seaside", "ocean", "coast"],
  ["airport", "transfer", "flight"],
  ["balcony", "patio", "terrace", "deck"],
  ["accessible", "elevator", "lift", "wheelchair", "stairs"],
  ["check-in", "checkin", "self-check-in", "keypad", "lockbox", "keyless"],
  ["bathroom", "bath", "shower", "toilet", "ensuite"],
  ["bed", "bedroom", "beds", "bedrooms", "sleeps"],
  ["safe", "safety", "secure", "security"],
  ["clean", "cleanliness", "tidy", "spotless"],
];

const SYNONYM_INDEX = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const set = SYNONYM_INDEX.get(term) ?? new Set<string>();
    group.forEach((t) => set.add(t));
    SYNONYM_INDEX.set(term, set);
  }
}

/** Keywords that, in a query, indicate a specific structured facility. */
const FACILITY_KEYWORDS: Record<FacilityId, string[]> = {
  wifi: ["wifi", "wi-fi", "internet", "broadband"],
  "security-cameras": ["camera", "cameras", "doorbell", "surveillance"],
  "washer-dryer": ["washer", "dryer", "laundry", "washing"],
  pool: ["pool", "swimming"],
  gym: ["gym", "fitness", "exercise"],
  workspace: ["workspace", "desk", "office"],
  "air-conditioning": ["ac", "air-conditioning", "conditioning", "cooling"],
  "pet-friendly": ["pet", "pets", "dog", "cat", "pet-friendly"],
  kitchen: ["kitchen", "kitchenette", "cook", "stove", "oven"],
  "free-parking": ["parking", "garage", "park"],
  "self-check-in": ["check-in", "checkin", "keypad", "lockbox", "keyless"],
  heating: ["heating", "heat", "heater"],
  "hot-tub": ["hot-tub", "jacuzzi", "spa"],
  "balcony-patio": ["balcony", "patio", "terrace"],
  "dedicated-entrance": ["entrance", "private-entrance"],
  "smoke-alarm": ["smoke", "smoke-alarm"],
  "carbon-monoxide-alarm": ["carbon", "monoxide"],
  "first-aid-kit": ["first-aid", "aid-kit"],
  "fire-extinguisher": ["fire", "extinguisher"],
};

export type QueryKind = "must" | "deal" | "nice" | "need" | "location" | "question";

export interface RetrievalQuery {
  /** Original phrase, shown to the user. */
  text: string;
  kind: QueryKind;
  keywords: string[];
  /** Synonym-expanded terms (excludes the raw keywords). */
  expanded: string[];
  facility: FacilityId | null;
  /** Lowercased phrase for phrase matching (only meaningful if multi-word). */
  phrase: string;
}

/** Detect which structured facility (if any) a set of tokens refers to. */
function detectFacility(tokens: string[]): FacilityId | null {
  const set = new Set(tokens);
  for (const facility of FACILITIES) {
    const keywords = FACILITY_KEYWORDS[facility.id];
    if (keywords.some((keyword) => set.has(keyword))) return facility.id;
  }
  return null;
}

/** Build a retrieval query from a free-text rule or need. */
export function buildQuery(
  text: string,
  kind: QueryKind,
  facilityHint?: FacilityId
): RetrievalQuery {
  const keywords = tokenize(text);
  const expandedSet = new Set<string>();
  for (const keyword of keywords) {
    const syns = SYNONYM_INDEX.get(keyword);
    if (syns) syns.forEach((s) => expandedSet.add(s));
  }
  keywords.forEach((keyword) => expandedSet.delete(keyword));

  return {
    text,
    kind,
    keywords,
    expanded: [...expandedSet],
    facility: facilityHint ?? detectFacility(keywords),
    phrase: text.trim().toLowerCase(),
  };
}

export interface RetrievedChunk {
  chunk: EvidenceChunk;
  score: number;
  matchedTerms: string[];
  /** A negation cue co-occurs with a matched term — evidence of absence/risk. */
  negative: boolean;
}

const LOCATION_SOURCES = new Set(["nearby", "airport"]);

/** Score a single chunk against a query. Higher is more relevant. */
export function scoreChunk(
  query: RetrievalQuery,
  chunk: EvidenceChunk
): RetrievedChunk {
  const tokenSet = new Set(chunk.tokens);
  const matched: string[] = [];
  let score = 0;

  // Exact keyword match.
  for (const keyword of query.keywords) {
    if (tokenSet.has(keyword)) {
      score += 3;
      matched.push(keyword);
    }
  }

  // Synonym match.
  for (const term of query.expanded) {
    if (tokenSet.has(term)) {
      score += 1.5;
      matched.push(term);
    }
  }

  // Phrase match (multi-word phrases only).
  if (query.phrase.includes(" ") && chunk.text.toLowerCase().includes(query.phrase)) {
    score += 6;
  }

  // Facility match — strongest signal when the structured facility is present.
  if (query.facility && chunk.source === "facilities") {
    const keywords = FACILITY_KEYWORDS[query.facility];
    if (keywords.some((keyword) => tokenSet.has(keyword))) {
      score += 5;
      matched.push(query.facility);
    }
  }

  // Location-need match — boost nearby/airport sources for location queries.
  if (
    (query.kind === "location" || query.facility === "free-parking") &&
    LOCATION_SOURCES.has(chunk.source) &&
    matched.length > 0
  ) {
    score += 2;
  }

  // Negative-signal detection: a negation cue near a matched term.
  let negative = false;
  if (matched.length > 0) {
    negative = chunk.tokens.some((token) => NEGATIVE_CUES.has(token));
  }

  return { chunk, score, matchedTerms: [...new Set(matched)], negative };
}

/** Minimum score for a chunk to count as real supporting evidence. */
export const MIN_EVIDENCE_SCORE = 3;

/** Retrieve the top-k evidence chunks for a query from a chunk pool. */
export function retrieve(
  query: RetrievalQuery,
  chunks: EvidenceChunk[],
  k = 3
): RetrievedChunk[] {
  return chunks
    .map((chunk) => scoreChunk(query, chunk))
    .filter((result) => result.score >= MIN_EVIDENCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
