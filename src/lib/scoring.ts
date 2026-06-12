import type {
  ComparisonRequest,
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

export type Verdict = "Book" | "Maybe" | "Avoid";

export interface ScoredStay {
  stay: StayListing;
  rank: number;
  overallScore: number;
  scores: CategoryScores;
  verdict: Verdict;
  pros: string[];
  cons: string[];
}

export interface ComparisonResult {
  travelerType: TravelerTypeId;
  /** Sorted by overallScore, best first. */
  scoredStays: ScoredStay[];
  bestOverall: ScoredStay;
  safest: ScoredStay;
  bestValue: ScoredStay;
  biggestRisk: ScoredStay;
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

function keywordAdjustment(text: string, category: CategoryId): number {
  const rules = KEYWORD_RULES[category];
  if (!rules) return 0;
  let total = 0;
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) total += rule.delta;
    }
  }
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
  walkabilityScore: "Limited walkability — expect to drive",
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
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

function scoreCategory(stay: StayListing, category: CategoryId, text: string): number {
  const platformDelta = PLATFORM_ADJUSTMENTS[stay.platform][category] ?? 0;
  return clamp(baseScore(stay, category) + keywordAdjustment(text, category) + platformDelta);
}

export function scoreComparison(request: ComparisonRequest): ComparisonResult {
  const { travelerType, stays } = request;

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

    const weights = TRAVELER_WEIGHTS[travelerType];
    const weightedFit = (Object.entries(weights) as [CategoryId, number][]).reduce(
      (sum, [category, weight]) => sum + scores[category] * weight,
      0
    );
    const platformBonus = PLATFORM_FIT[travelerType][stay.platform] ?? 0;
    scores.travelerFitScore = clamp(weightedFit + platformBonus);

    // Overall: traveler fit leads, value and safety follow.
    const rawOverall =
      scores.travelerFitScore * 0.3 +
      scores.valueScore * 0.2 +
      scores.safetyScore * 0.15 +
      scores.walkabilityScore * 0.1 +
      scores.transitScore * 0.1 +
      scores.foodAccessScore * 0.1 +
      scores.noiseRiskScore * 0.05;
    // Weighted averages compress toward the middle; stretch around 75 so
    // strong picks can clear the "Book" bar and weak ones land in "Avoid".
    const overallScore = clamp(75 + (rawOverall - 75) * 1.4);

    const price = Number(stay.pricePerNight) || 0;
    const { pros, cons } = buildProsAndCons(
      scores,
      stay,
      validPrices.length > 1 && price === minPrice,
      validPrices.length > 1 && price === maxPrice
    );

    return {
      stay,
      rank: 0, // assigned after sorting
      overallScore,
      scores,
      verdict: getVerdict(overallScore),
      pros,
      cons,
    } satisfies ScoredStay;
  });

  const ranked = [...scored].sort((a, b) => b.overallScore - a.overallScore);
  ranked.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const byScore = (category: CategoryId) =>
    [...ranked].sort((a, b) => b.scores[category] - a.scores[category])[0];

  return {
    travelerType,
    scoredStays: ranked,
    bestOverall: ranked[0],
    safest: byScore("safetyScore"),
    bestValue: byScore("valueScore"),
    biggestRisk: ranked[ranked.length - 1],
  };
}
