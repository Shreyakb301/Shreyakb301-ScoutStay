import type { AirportIntelligence } from "@/lib/airport-intelligence";
import type {
  ComparisonRequest,
  LocationIntelligence,
  Platform,
  StayListing,
  TravelerTypeId,
} from "@/lib/types";

export type CategoryId =
  | "safetyScore"
  | "walkabilityScore"
  | "transitScore"
  | "foodAccessScore"
  | "noiseRiskScore"
  | "valueScore"
  | "travelerFitScore";

/**
 * All scores are 0–100 where higher is better.
 * noiseRiskScore measures protection from noise: 100 = very quiet, 0 = very noisy.
 */
export type CategoryScores = Record<CategoryId, number>;

export type Verdict =
  | "Book"
  | "Maybe"
  | "Avoid"
  | "NeedsInfo"
  | "Insufficient";

/**
 * High = built from real data (OpenStreetMap counts, airport distance,
 * entered prices). Medium = informed by user-provided notes keywords.
 * Low = mock estimate from platform type and a stable baseline only.
 */
export type ConfidenceLevel = "High" | "Medium" | "Low";

export type ExplainedCategoryId = CategoryId | "airportAccessScore";

export interface ScoreExplanation {
  id: ExplainedCategoryId;
  label: string;
  score: number;
  /** One-sentence summary of where this score came from. */
  reason: string;
  positives: string[];
  negatives: string[];
  confidence: ConfidenceLevel;
}

export interface ScoredStay {
  stay: StayListing;
  rank: number;
  overallScore: number;
  scores: CategoryScores;
  verdict: Verdict;
  pros: string[];
  cons: string[];
  /** Per-category reasoning behind the scores, in display order. */
  explanations: ScoreExplanation[];
  /** Real OpenStreetMap signals, when available for this stay's location. */
  nearby?: LocationIntelligence;
  /** Nearest-airport data, when available for this stay's location. */
  airport?: AirportIntelligence | null;
  /** How complete this stay's data is, 0–100. */
  dataCompletenessScore: number;
  /** Overall trust in this stay's scores, derived from completeness. */
  dataConfidence: ConfidenceLevel;
  /** Human-readable list of fields still missing. */
  missingFields: string[];
  /** True when scores rest only on platform-type estimates (no real data). */
  estimated: boolean;
}

export interface ComparisonResult {
  travelerType: TravelerTypeId;
  /** Sorted by overallScore, best first. */
  scoredStays: ScoredStay[];
  bestOverall: ScoredStay;
  safest: ScoredStay;
  bestValue: ScoredStay;
  biggestRisk: ScoredStay;
  /** True only when the top pick has enough data to trust a recommendation. */
  reliable: boolean;
}

/**
 * Relative importance per category on a 0–100 slider scale. Only the
 * proportions matter, weights are normalized before scoring.
 */
export type ScoreWeights = Record<CategoryId, number>;

/** Starting weights per traveler type (overall-score blend, slider scale). */
export const TRAVELER_DEFAULT_WEIGHTS: Record<TravelerTypeId, ScoreWeights> = {
  solo: { safetyScore: 45, walkabilityScore: 25, transitScore: 25, foodAccessScore: 15, noiseRiskScore: 10, valueScore: 40, travelerFitScore: 60 },
  couple: { safetyScore: 30, walkabilityScore: 25, transitScore: 15, foodAccessScore: 30, noiseRiskScore: 35, valueScore: 35, travelerFitScore: 60 },
  family: { safetyScore: 50, walkabilityScore: 15, transitScore: 15, foodAccessScore: 25, noiseRiskScore: 35, valueScore: 40, travelerFitScore: 60 },
  friends: { safetyScore: 20, walkabilityScore: 35, transitScore: 25, foodAccessScore: 30, noiseRiskScore: 5, valueScore: 55, travelerFitScore: 60 },
  business: { safetyScore: 35, walkabilityScore: 30, transitScore: 55, foodAccessScore: 15, noiseRiskScore: 20, valueScore: 25, travelerFitScore: 60 },
};

export interface WeightPreset {
  id: string;
  label: string;
  weights: ScoreWeights;
}

export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    weights: { safetyScore: 50, walkabilityScore: 50, transitScore: 50, foodAccessScore: 50, noiseRiskScore: 50, valueScore: 50, travelerFitScore: 50 },
  },
  {
    id: "quiet",
    label: "Quiet Trip",
    weights: { safetyScore: 60, walkabilityScore: 35, transitScore: 25, foodAccessScore: 35, noiseRiskScore: 90, valueScore: 45, travelerFitScore: 50 },
  },
  {
    id: "foodie",
    label: "Foodie",
    weights: { safetyScore: 35, walkabilityScore: 65, transitScore: 45, foodAccessScore: 90, noiseRiskScore: 25, valueScore: 40, travelerFitScore: 50 },
  },
  {
    id: "budget",
    label: "Budget",
    weights: { safetyScore: 35, walkabilityScore: 40, transitScore: 45, foodAccessScore: 35, noiseRiskScore: 30, valueScore: 90, travelerFitScore: 50 },
  },
  {
    id: "business",
    label: "Business",
    weights: { safetyScore: 55, walkabilityScore: 55, transitScore: 90, foodAccessScore: 30, noiseRiskScore: 45, valueScore: 25, travelerFitScore: 55 },
  },
];

/** Weights as fractions summing to 1; equal weighting if everything is 0. */
export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const entries = Object.entries(weights) as [CategoryId, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) {
    const equal = 1 / entries.length;
    return Object.fromEntries(entries.map(([id]) => [id, equal])) as ScoreWeights;
  }
  return Object.fromEntries(
    entries.map(([id, weight]) => [id, Math.max(0, weight) / total])
  ) as ScoreWeights;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  safetyScore: "Safety",
  walkabilityScore: "Walkability",
  transitScore: "Transit",
  foodAccessScore: "Food access",
  noiseRiskScore: "Quietness",
  valueScore: "Value",
  travelerFitScore: "Traveler fit",
};

export function getVerdict(overallScore: number): Verdict {
  if (overallScore >= 85) return "Book";
  if (overallScore >= 70) return "Maybe";
  return "Avoid";
}

/* ------------------------------------------------------------------ */
/* Data completeness + confidence gating                               */
/* ------------------------------------------------------------------ */

/** Weighted fields that make up the data-completeness score (sum = 100). */
const COMPLETENESS_FIELDS: {
  label: string;
  weight: number;
  has: (
    stay: StayListing,
    nearby?: LocationIntelligence,
    airport?: AirportIntelligence | null
  ) => boolean;
}[] = [
  { label: "address", weight: 10, has: (s) => !!s.address?.trim() },
  {
    label: "coordinates",
    weight: 10,
    has: (s) => typeof s.latitude === "number" && typeof s.longitude === "number",
  },
  { label: "price", weight: 12, has: (s) => (Number(s.pricePerNight) || 0) > 0 },
  { label: "beds", weight: 8, has: (s) => s.beds != null || s.bedrooms != null },
  { label: "bathrooms", weight: 8, has: (s) => s.bathrooms != null },
  { label: "rating", weight: 10, has: (s) => s.rating != null },
  { label: "review count", weight: 7, has: (s) => s.reviewCount != null },
  { label: "facilities", weight: 12, has: (s) => (s.facilities?.length ?? 0) > 0 },
  {
    label: "listing description",
    weight: 8,
    has: (s) => !!s.listingDescription?.trim(),
  },
  { label: "nearby intelligence", weight: 8, has: (_s, nearby) => !!nearby },
  { label: "airport intelligence", weight: 7, has: (_s, _n, airport) => !!airport },
];

/** Below this, a stay has too little data to recommend at all. */
export const INSUFFICIENT_DATA_THRESHOLD = 40;

export interface DataCompleteness {
  score: number;
  confidence: ConfidenceLevel;
  missingFields: string[];
  /** Scores rest only on platform-type estimates — no real signals. */
  estimated: boolean;
}

export function assessDataCompleteness(
  stay: StayListing,
  nearby?: LocationIntelligence,
  airport?: AirportIntelligence | null
): DataCompleteness {
  let score = 0;
  const missingFields: string[] = [];
  for (const field of COMPLETENESS_FIELDS) {
    if (field.has(stay, nearby, airport)) score += field.weight;
    else missingFields.push(field.label);
  }
  const confidence: ConfidenceLevel =
    score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

  // No real signal feeds the category scores → they're platform guesses.
  const estimated =
    !nearby &&
    stay.rating == null &&
    (Number(stay.pricePerNight) || 0) <= 0 &&
    (stay.facilities?.length ?? 0) === 0 &&
    !stay.listingDescription?.trim();

  return { score, confidence, missingFields, estimated };
}

/** Gate the raw score verdict behind data confidence. */
function gatedVerdict(rawScore: number, data: DataCompleteness): Verdict {
  if (data.score < INSUFFICIENT_DATA_THRESHOLD) return "Insufficient";
  if (data.estimated || data.confidence === "Low") return "NeedsInfo";
  return getVerdict(rawScore);
}

/* ------------------------------------------------------------------ */
/* Deterministic base scores                                           */
/* ------------------------------------------------------------------ */

/**
 * djb2 string hash. Gives each listing a stable per-category baseline so
 * identical inputs always produce identical scores (no randomness).
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Stable baseline in [62, 80] derived from the listing identity + category. */
function baseScore(stay: StayListing, category: CategoryId): number {
  const seed = hashString(`${stay.name}|${stay.url}|${category}`);
  return 62 + (seed % 19);
}

function clamp(value: number): number {
  return Math.round(Math.min(100, Math.max(5, value)));
}

/* ------------------------------------------------------------------ */
/* Keyword signals from listing name + notes                           */
/* ------------------------------------------------------------------ */

interface KeywordRule {
  keywords: string[];
  /** Score delta applied once per matching keyword. */
  delta: number;
}

const KEYWORD_RULES: Partial<Record<CategoryId, KeywordRule[]>> = {
  safetyScore: [
    { keywords: ["gated", "secure", "doorman", "24h", "front desk", "safe"], delta: 6 },
    { keywords: ["well-lit", "family-friendly", "residential"], delta: 4 },
    { keywords: ["sketchy", "unsafe", "rough area"], delta: -12 },
  ],
  walkabilityScore: [
    { keywords: ["walkable", "central", "downtown", "old town", "heart of", "steps from", "blocks from"], delta: 7 },
    { keywords: ["near", "nearby", "close to"], delta: 3 },
    { keywords: ["secluded", "remote", "countryside", "cabin", "car required", "drive"], delta: -8 },
  ],
  transitScore: [
    { keywords: ["metro", "subway", "station", "transit", "bus", "train", "tram", "airport"], delta: 8 },
    { keywords: ["car required", "no transit", "drive", "remote", "secluded"], delta: -10 },
  ],
  foodAccessScore: [
    { keywords: ["restaurants", "dining", "cafes", "cafe", "food", "market", "bakery", "lobby"], delta: 6 },
    { keywords: ["kitchen", "kitchenette"], delta: 4 },
    { keywords: ["remote", "secluded", "drive to town"], delta: -7 },
  ],
  noiseRiskScore: [
    { keywords: ["quiet", "peaceful", "secluded", "tranquil", "residential", "riverside"], delta: 8 },
    { keywords: ["nightlife", "bars", "bar", "club", "street noise", "noisy", "busy street", "party"], delta: -9 },
    { keywords: ["downtown", "central"], delta: -4 },
  ],
};

interface KeywordMatch {
  keyword: string;
  delta: number;
}

/** Which keywords from the listing text influenced this category, and how. */
function keywordMatches(text: string, category: CategoryId): KeywordMatch[] {
  const rules = KEYWORD_RULES[category];
  if (!rules) return [];
  const matches: KeywordMatch[] = [];
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) matches.push({ keyword, delta: rule.delta });
    }
  }
  return matches;
}

function keywordAdjustment(text: string, category: CategoryId): number {
  const total = keywordMatches(text, category).reduce(
    (sum, match) => sum + match.delta,
    0
  );
  // Cap keyword influence so one wordy listing can't run away.
  return Math.min(15, Math.max(-20, total));
}

/* ------------------------------------------------------------------ */
/* Platform signals                                                    */
/* ------------------------------------------------------------------ */

const PLATFORM_ADJUSTMENTS: Record<Platform, Partial<Record<CategoryId, number>>> = {
  hotel: { safetyScore: 8, transitScore: 4, foodAccessScore: 3, noiseRiskScore: -2 },
  booking: { safetyScore: 6, transitScore: 3, foodAccessScore: 2 },
  airbnb: { foodAccessScore: 2, noiseRiskScore: 2 },
  vrbo: { noiseRiskScore: 4, walkabilityScore: -3 },
  other: {},
};

/* ------------------------------------------------------------------ */
/* Traveler fit                                                        */
/* ------------------------------------------------------------------ */

type FitWeights = Partial<Record<Exclude<CategoryId, "travelerFitScore">, number>>;

/** How much each traveler type cares about each category (weights sum to 1). */
const TRAVELER_WEIGHTS: Record<TravelerTypeId, FitWeights> = {
  solo: { safetyScore: 0.35, walkabilityScore: 0.2, transitScore: 0.2, valueScore: 0.15, foodAccessScore: 0.1 },
  couple: { noiseRiskScore: 0.3, foodAccessScore: 0.25, walkabilityScore: 0.2, safetyScore: 0.15, valueScore: 0.1 },
  family: { safetyScore: 0.3, noiseRiskScore: 0.25, foodAccessScore: 0.2, valueScore: 0.15, walkabilityScore: 0.1 },
  friends: { valueScore: 0.3, walkabilityScore: 0.25, foodAccessScore: 0.2, transitScore: 0.15, safetyScore: 0.1 },
  business: { transitScore: 0.35, safetyScore: 0.2, walkabilityScore: 0.2, noiseRiskScore: 0.15, foodAccessScore: 0.1 },
};

/** Platform affinity per traveler type, folded into traveler fit. */
const PLATFORM_FIT: Record<TravelerTypeId, Partial<Record<Platform, number>>> = {
  solo: { hotel: 4, booking: 3 },
  couple: { airbnb: 4, vrbo: 3 },
  family: { vrbo: 5, airbnb: 4 },
  friends: { airbnb: 5, vrbo: 4 },
  business: { hotel: 6, booking: 4 },
};

/* ------------------------------------------------------------------ */
/* Value                                                               */
/* ------------------------------------------------------------------ */

function valueScoreFor(stay: StayListing, averagePrice: number): number {
  const price = Number(stay.pricePerNight) || averagePrice;
  const base = baseScore(stay, "valueScore");
  if (averagePrice <= 0) return clamp(base);
  // Cheaper than the group average reads as better value, and vice versa.
  const deviation = (averagePrice - price) / averagePrice; // -1..1-ish
  return clamp(base + deviation * 45);
}

/* ------------------------------------------------------------------ */
/* Pros & cons                                                         */
/* ------------------------------------------------------------------ */

const PRO_TEXT: Record<CategoryId, string> = {
  safetyScore: "Strong safety profile for the area",
  walkabilityScore: "Very walkable location",
  transitScore: "Easy access to public transit",
  foodAccessScore: "Great food and dining options nearby",
  noiseRiskScore: "Quiet surroundings, low noise risk",
  valueScore: "Excellent value for the nightly rate",
  travelerFitScore: "Great match for your trip style",
};

const CON_TEXT: Record<CategoryId, string> = {
  safetyScore: "Safety profile is below your other picks",
  walkabilityScore: "Limited walkability, expect to drive",
  transitScore: "Poor public transit access",
  foodAccessScore: "Few food options close by",
  noiseRiskScore: "Higher noise risk than your other picks",
  valueScore: "Pricey for what you get vs. your other picks",
  travelerFitScore: "Weak match for your trip style",
};

function buildProsAndCons(
  scores: CategoryScores,
  stay: StayListing,
  cheapest: boolean,
  priciest: boolean
): { pros: string[]; cons: string[] } {
  const entries = Object.entries(scores) as [CategoryId, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  const pros = sorted
    .filter(([, score]) => score >= 78)
    .slice(0, 3)
    .map(([category]) => PRO_TEXT[category]);
  const cons = sorted
    .filter(([, score]) => score <= 62)
    .slice(-3)
    .map(([category]) => CON_TEXT[category]);

  if (cheapest) pros.unshift("Lowest nightly rate of your shortlist");
  if (priciest) cons.unshift("Highest nightly rate of your shortlist");

  // Always give the user something on both sides.
  if (pros.length === 0) pros.push(`Solid ${CATEGORY_LABELS[sorted[0][0]].toLowerCase()} compared to its other categories`);
  if (cons.length === 0) {
    const weakest = sorted[sorted.length - 1][0];
    cons.push(`${CATEGORY_LABELS[weakest]} is its relatively weakest area`);
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}

/* ------------------------------------------------------------------ */
/* Score explanations                                                  */
/* ------------------------------------------------------------------ */

export const EXPLAINED_LABELS: Record<ExplainedCategoryId, string> = {
  ...CATEGORY_LABELS,
  airportAccessScore: "Airport access",
};

const PLATFORM_NAMES: Record<Platform, string> = {
  airbnb: "Airbnb",
  vrbo: "Vrbo",
  booking: "Booking.com",
  hotel: "Direct hotel",
  other: "Other-platform",
};

const TRAVELER_NAMES: Record<TravelerTypeId, string> = {
  solo: "solo",
  couple: "couple",
  family: "family",
  friends: "friend-group",
  business: "business",
};

interface ExplanationContext {
  stay: StayListing;
  scores: CategoryScores;
  text: string;
  travelerType: TravelerTypeId;
  nearby?: LocationIntelligence;
  airport?: AirportIntelligence | null;
  averagePrice: number;
  validPriceCount: number;
  cheapest: boolean;
  priciest: boolean;
}

/**
 * Explanation for a category scored from heuristics only: a stable
 * baseline, platform tendencies, and any keywords found in the notes.
 */
function heuristicExplanation(
  category: CategoryId,
  ctx: ExplanationContext
): ScoreExplanation {
  const matches = keywordMatches(ctx.text, category);
  const positives = matches
    .filter((match) => match.delta > 0)
    .map((match) => `Your notes mention “${match.keyword}”`);
  const negatives = matches
    .filter((match) => match.delta < 0)
    .map((match) => `Your notes mention “${match.keyword}”`);

  const platformDelta = PLATFORM_ADJUSTMENTS[ctx.stay.platform][category] ?? 0;
  const platformName = PLATFORM_NAMES[ctx.stay.platform];
  if (platformDelta > 0) {
    positives.push(`${platformName} listings tend to do well here`);
  } else if (platformDelta < 0) {
    negatives.push(`${platformName} listings tend to lag here`);
  }

  return {
    id: category,
    label: CATEGORY_LABELS[category],
    score: ctx.scores[category],
    reason:
      matches.length > 0
        ? "Estimated from your notes and the platform type."
        : "Rough estimate from the platform type only, add notes or an address for better signals.",
    positives,
    negatives,
    confidence: matches.length > 0 ? "Medium" : "Low",
  };
}

/** Explanation backed by real OpenStreetMap nearby-place counts. */
function nearbyExplanation(
  category: CategoryId,
  ctx: ExplanationContext,
  nearby: LocationIntelligence
): ScoreExplanation {
  const { counts, radiusMeters } = nearby;
  const positives: string[] = [];
  const negatives: string[] = [];
  let reason = "";

  if (category === "foodAccessScore") {
    const total = counts.restaurant + counts.cafe;
    reason = `${total} restaurants and cafés mapped within ${radiusMeters} m.`;
    if (total >= 20) positives.push(`Dining is abundant: ${counts.restaurant} restaurants, ${counts.cafe} cafés`);
    else if (total >= 8) positives.push(`Solid choice nearby: ${counts.restaurant} restaurants, ${counts.cafe} cafés`);
    if (total === 0) negatives.push("No restaurants or cafés within walking distance");
    else if (total < 4) negatives.push(`Only ${total} dining options nearby`);
  } else if (category === "transitScore") {
    reason = `${counts.transit} public transport stops or stations within ${radiusMeters} m.`;
    if (counts.transit >= 8) positives.push(`Excellent coverage: ${counts.transit} stops/stations nearby`);
    else if (counts.transit >= 3) positives.push(`${counts.transit} stops/stations within walking distance`);
    if (counts.transit === 0) negatives.push("No public transport within walking distance, plan on driving");
    else if (counts.transit < 3) negatives.push("Sparse transit options nearby");
  } else if (category === "noiseRiskScore") {
    reason = `${counts.nightlife} bars, pubs, or clubs mapped within ${radiusMeters} m.`;
    if (counts.nightlife <= 2) positives.push("Little to no nightlife nearby, likely quiet at night");
    else if (counts.nightlife <= 8) positives.push("Moderate nightlife presence");
    if (counts.nightlife > 25) negatives.push(`${counts.nightlife} nightlife venues nearby, expect evening noise`);
    else if (counts.nightlife > 8) negatives.push(`${counts.nightlife} nightlife venues within earshot`);
  }

  return {
    id: category,
    label: CATEGORY_LABELS[category],
    score: ctx.scores[category],
    reason,
    positives,
    negatives,
    confidence: "High",
  };
}

function valueExplanation(ctx: ExplanationContext): ScoreExplanation {
  const price = Number(ctx.stay.pricePerNight) || 0;
  const positives: string[] = [];
  const negatives: string[] = [];
  const comparable = ctx.validPriceCount > 1 && price > 0;

  if (comparable) {
    const deltaPct = Math.round(
      ((price - ctx.averagePrice) / ctx.averagePrice) * 100
    );
    if (ctx.cheapest) positives.push("Lowest nightly rate of your shortlist");
    if (deltaPct <= -10) positives.push(`$${price}/night is ${-deltaPct}% below your shortlist average`);
    if (ctx.priciest) negatives.push("Highest nightly rate of your shortlist");
    if (deltaPct >= 10) negatives.push(`$${price}/night is ${deltaPct}% above your shortlist average`);
  }

  return {
    id: "valueScore",
    label: CATEGORY_LABELS.valueScore,
    score: ctx.scores.valueScore,
    reason: comparable
      ? `Compared against your shortlist average of $${Math.round(ctx.averagePrice)}/night.`
      : "Needs at least two priced stays for a real comparison.",
    positives,
    negatives,
    confidence: comparable ? "High" : "Low",
  };
}

function travelerFitExplanation(ctx: ExplanationContext): ScoreExplanation {
  const weights = TRAVELER_WEIGHTS[ctx.travelerType];
  const weighted = (Object.entries(weights) as [CategoryId, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const travelerName = TRAVELER_NAMES[ctx.travelerType];

  const positives: string[] = [];
  const negatives: string[] = [];
  for (const [category, weight] of weighted) {
    const score = ctx.scores[category];
    const pct = Math.round(weight * 100);
    if (score >= 75) {
      positives.push(`Strong ${CATEGORY_LABELS[category].toLowerCase()} (${score}), weighted ${pct}% for ${travelerName} trips`);
    } else if (score <= 55 && weight >= 0.15) {
      negatives.push(`Weak ${CATEGORY_LABELS[category].toLowerCase()} (${score}), weighted ${pct}% for ${travelerName} trips`);
    }
  }

  const platformBonus = PLATFORM_FIT[ctx.travelerType][ctx.stay.platform] ?? 0;
  if (platformBonus > 0) {
    positives.push(`${PLATFORM_NAMES[ctx.stay.platform]} stays suit ${travelerName} trips`);
  }

  const topLabels = weighted
    .slice(0, 2)
    .map(([category]) => CATEGORY_LABELS[category].toLowerCase())
    .join(" and ");

  return {
    id: "travelerFitScore",
    label: CATEGORY_LABELS.travelerFitScore,
    score: ctx.scores.travelerFitScore,
    reason: `Blend of what ${travelerName} trips prioritize, mostly ${topLabels}.`,
    positives: positives.slice(0, 3),
    negatives: negatives.slice(0, 3),
    confidence: ctx.nearby ? "High" : "Medium",
  };
}

function airportExplanation(
  ctx: ExplanationContext,
  airport: AirportIntelligence
): ScoreExplanation {
  const positives: string[] = [];
  const negatives: string[] = [];
  const iata = airport.airport.iata ? ` (${airport.airport.iata})` : "";

  if (airport.distanceKm < 10) {
    positives.push(`Short transfer: ~${airport.driveMinutes} min drive`);
  } else if (airport.distanceKm <= 25) {
    positives.push(`Manageable transfer: ~${airport.driveMinutes} min drive`);
  }
  if (airport.distanceKm > 50) {
    negatives.push(`Long transfer: ${airport.distanceKm} km from the airport`);
  } else if (airport.distanceKm > 25) {
    negatives.push(`${airport.distanceKm} km out, budget extra transfer time`);
  }

  return {
    id: "airportAccessScore",
    label: EXPLAINED_LABELS.airportAccessScore,
    score: airport.accessibilityScore,
    reason: `${airport.distanceKm} km (~${airport.driveMinutes} min at 40 km/h) to ${airport.airport.name}${iata}.`,
    positives,
    negatives,
    confidence: "High",
  };
}

/** Display order: location facts first, then price, fit, and airport. */
function buildExplanations(ctx: ExplanationContext): ScoreExplanation[] {
  const real = (category: CategoryId) =>
    ctx.nearby
      ? nearbyExplanation(category, ctx, ctx.nearby)
      : heuristicExplanation(category, ctx);

  const explanations: ScoreExplanation[] = [
    heuristicExplanation("safetyScore", ctx),
    heuristicExplanation("walkabilityScore", ctx),
    real("transitScore"),
    real("foodAccessScore"),
    real("noiseRiskScore"),
    valueExplanation(ctx),
    travelerFitExplanation(ctx),
  ];
  if (ctx.airport) {
    explanations.push(airportExplanation(ctx, ctx.airport));
  }
  return explanations;
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

function scoreCategory(stay: StayListing, category: CategoryId, text: string): number {
  const platformDelta = PLATFORM_ADJUSTMENTS[stay.platform][category] ?? 0;
  return clamp(baseScore(stay, category) + keywordAdjustment(text, category) + platformDelta);
}

/**
 * Scores the comparison. When `nearbyByStayId` carries real OpenStreetMap
 * signals for a stay, those replace the mock estimates for food access,
 * transit, and quietness; everything else (and stays without nearby data)
 * falls back to the deterministic mock scoring. `airportsByStayId` feeds
 * the airport-access explanation but does not change category scores.
 * `weights` controls only the overall-score blend (and therefore ranking);
 * it defaults to the traveler type's preset.
 */
export function scoreComparison(
  request: ComparisonRequest,
  nearbyByStayId?: Record<string, LocationIntelligence>,
  airportsByStayId?: Record<string, AirportIntelligence | null>,
  weights?: ScoreWeights
): ComparisonResult {
  const { travelerType, stays } = request;
  const normalizedWeights = normalizeWeights(
    weights ?? TRAVELER_DEFAULT_WEIGHTS[travelerType]
  );

  const prices = stays.map((stay) => Number(stay.pricePerNight) || 0);
  const validPrices = prices.filter((price) => price > 0);
  const averagePrice =
    validPrices.length > 0
      ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
      : 0;
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  const scored = stays.map((stay) => {
    const text = `${stay.name} ${stay.notes ?? ""}`.toLowerCase();

    const scores: CategoryScores = {
      safetyScore: scoreCategory(stay, "safetyScore", text),
      walkabilityScore: scoreCategory(stay, "walkabilityScore", text),
      transitScore: scoreCategory(stay, "transitScore", text),
      foodAccessScore: scoreCategory(stay, "foodAccessScore", text),
      noiseRiskScore: scoreCategory(stay, "noiseRiskScore", text),
      valueScore: valueScoreFor(stay, averagePrice),
      travelerFitScore: 0, // filled in below
    };

    const nearby = nearbyByStayId?.[stay.id];
    if (nearby) {
      scores.foodAccessScore = clamp(nearby.scores.foodAccessScore);
      scores.transitScore = clamp(nearby.scores.transitScore);
      // Our noise score is "quietness" (higher = quieter); Overpass gives
      // us risk (higher = noisier). Invert it, damped so a lively city
      // center reads as a real trade-off rather than an automatic fail.
      scores.noiseRiskScore = clamp(100 - 0.85 * nearby.scores.quietRiskScore);
    }

    const weights = TRAVELER_WEIGHTS[travelerType];
    const weightedFit = (Object.entries(weights) as [CategoryId, number][]).reduce(
      (sum, [category, weight]) => sum + scores[category] * weight,
      0
    );
    const platformBonus = PLATFORM_FIT[travelerType][stay.platform] ?? 0;
    scores.travelerFitScore = clamp(weightedFit + platformBonus);

    // Overall: weighted blend of the category scores. Weights come from
    // the user's preference sliders (or the traveler-type default).
    const rawOverall = (
      Object.entries(normalizedWeights) as [CategoryId, number][]
    ).reduce((sum, [category, weight]) => sum + scores[category] * weight, 0);
    // Weighted averages compress toward the middle; stretch around 75 so
    // strong picks can clear the "Book" bar and weak ones land in "Avoid".
    const overallScore = clamp(75 + (rawOverall - 75) * 1.4);

    const price = Number(stay.pricePerNight) || 0;
    const cheapest = validPrices.length > 1 && price === minPrice;
    const priciest = validPrices.length > 1 && price === maxPrice;
    const { pros, cons } = buildProsAndCons(scores, stay, cheapest, priciest);

    const airport = airportsByStayId?.[stay.id];
    const explanations = buildExplanations({
      stay,
      scores,
      text,
      travelerType,
      nearby,
      airport,
      averagePrice,
      validPriceCount: validPrices.length,
      cheapest,
      priciest,
    });

    const completeness = assessDataCompleteness(stay, nearby, airport);
    // Platform-only estimates must never read as a confident pick.
    const finalScore = completeness.estimated
      ? Math.min(overallScore, 60)
      : overallScore;

    return {
      stay,
      rank: 0, // assigned after sorting
      overallScore: finalScore,
      scores,
      verdict: gatedVerdict(finalScore, completeness),
      pros,
      cons,
      explanations,
      nearby,
      airport,
      dataCompletenessScore: completeness.score,
      dataConfidence: completeness.confidence,
      missingFields: completeness.missingFields,
      estimated: completeness.estimated,
    } satisfies ScoredStay;
  });

  const ranked = [...scored].sort((a, b) => b.overallScore - a.overallScore);
  ranked.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const byScore = (category: CategoryId) =>
    [...ranked].sort((a, b) => b.scores[category] - a.scores[category])[0];

  const top = ranked[0];
  const reliable =
    top.dataCompletenessScore >= INSUFFICIENT_DATA_THRESHOLD &&
    top.dataConfidence !== "Low" &&
    !top.estimated;

  return {
    travelerType,
    scoredStays: ranked,
    bestOverall: top,
    safest: byScore("safetyScore"),
    bestValue: byScore("valueScore"),
    biggestRisk: ranked[ranked.length - 1],
    reliable,
  };
}
