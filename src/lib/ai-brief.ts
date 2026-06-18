/**
 * AI decision brief — builds the compact, structured payload the LLM is
 * allowed to use and the strict prompt around it. Isomorphic and free of any
 * key/network code: the client builds the input, the API route does the
 * OpenAI call. The model only ever sees ScoutStay's own structured data.
 */

import { buildDecisionBrief } from "@/lib/decision-brief";
import { facilityLabel } from "@/lib/facilities";
import { TRAVELER_TYPES } from "@/lib/mock-data";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type ComparisonResult,
  type ScoreWeights,
} from "@/lib/scoring";
import type { UserTripProfile } from "@/lib/types";

const CATEGORY_ORDER: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

export interface AiBriefStay {
  name: string;
  overallScore: number;
  verdict: string;
  dataCompletenessScore: number;
  dataConfidence: string;
  estimated: boolean;
  scores: Record<string, number>;
  rating: number | null;
  reviewCount: number | null;
  facilities: string[];
  airport: {
    name: string;
    iata: string | null;
    distanceKm: number;
    driveMinutes: number;
    source: string;
  } | null;
  nearby: {
    foodAndCafes: number;
    grocery: number;
    transit: number;
    nightlife: number;
  } | null;
  missingFields: string[];
}

export interface AiBriefNeeds {
  tripPurpose: string;
  travelerCount: number;
  mustHaves: string[];
  dealBreakers: string[];
  niceToHaves: string[];
}

export interface AiBriefInput {
  reliable: boolean;
  travelerType: string;
  topPriorities: string[];
  needs: AiBriefNeeds | null;
  stays: AiBriefStay[];
  warnings: string[];
}

function joinProse(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Compact, fully-structured payload the model is allowed to reason over. */
export function buildBriefInput(
  result: ComparisonResult,
  weights: ScoreWeights,
  profile?: UserTripProfile
): AiBriefInput {
  const travelerType =
    TRAVELER_TYPES.find((t) => t.id === result.travelerType)?.label ??
    result.travelerType;

  const topPriorities = (Object.entries(weights) as [CategoryId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => CATEGORY_LABELS[category]);

  const brief = buildDecisionBrief(result, weights);

  const stays: AiBriefStay[] = result.scoredStays.map((entry) => ({
    name: entry.stay.name,
    overallScore: entry.overallScore,
    verdict: entry.verdict,
    dataCompletenessScore: entry.dataCompletenessScore,
    dataConfidence: entry.dataConfidence,
    estimated: entry.estimated,
    scores: Object.fromEntries(
      CATEGORY_ORDER.map((category) => [
        CATEGORY_LABELS[category],
        entry.scores[category],
      ])
    ),
    rating: entry.stay.rating ?? null,
    reviewCount: entry.stay.reviewCount ?? null,
    facilities: (entry.stay.facilities ?? []).map(facilityLabel),
    airport: entry.airport
      ? {
          name: entry.airport.airport.name,
          iata: entry.airport.airport.iata ?? null,
          distanceKm: entry.airport.distanceKm,
          driveMinutes: entry.airport.driveMinutes,
          source: entry.airport.source,
        }
      : null,
    nearby: entry.nearby
      ? {
          foodAndCafes:
            entry.nearby.counts.restaurant + entry.nearby.counts.cafe,
          grocery: entry.nearby.counts.grocery,
          transit: entry.nearby.counts.transit,
          nightlife: entry.nearby.counts.nightlife,
        }
      : null,
    missingFields: entry.missingFields,
  }));

  const needs: AiBriefNeeds | null = profile
    ? {
        tripPurpose: profile.tripPurpose,
        travelerCount: profile.travelerCount,
        mustHaves: profile.mustHaves,
        dealBreakers: profile.dealBreakers,
        niceToHaves: profile.niceToHaves,
      }
    : null;

  return {
    reliable: result.reliable,
    travelerType,
    topPriorities,
    needs,
    stays,
    warnings: brief.warnings,
  };
}

/** Deterministic message used (without calling OpenAI) when data is thin. */
export function needsMoreInfoMessage(input: AiBriefInput): string {
  const missing = [...new Set(input.stays.flatMap((s) => s.missingFields))];
  const what =
    missing.length > 0
      ? joinProse(missing)
      : "address, price, facilities, and listing details";
  return (
    `ScoutStay needs more listing data before it can make a reliable ` +
    `recommendation. Add ${what} so the scores reflect the real listings ` +
    `instead of platform estimates. Paste an Airbnb link or fill these in ` +
    `to improve this briefing.`
  );
}

/** The strict system + user messages for the LLM. */
export function buildPrompt(input: AiBriefInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are ScoutStay's travel briefing writer.",
    "Write a concise, professional decision briefing comparing short-term stays.",
    "Rules:",
    "- Use ONLY the structured data in the user message.",
    "- Never invent amenities, ratings, prices, distances, drive times, or reasons. If a value is missing, say it's unknown — do not guess.",
    "- No emojis, no marketing fluff. Plain, professional tone.",
    "- If reliable is false, do NOT recommend any stay; state that more listing data (the missing fields) is needed first.",
    "- If reliable is true, name the best-fit stay and give 2-3 concrete reasons grounded in the data (scores, facilities, airport access, nearby counts, ratings, the traveler's priorities and needs).",
    "- Keep it under 150 words, 2-3 short paragraphs, plain text.",
  ].join("\n");

  const user =
    `Structured ScoutStay data (JSON):\n${JSON.stringify(input)}\n\n` +
    "Write the briefing now.";

  return { system, user };
}
