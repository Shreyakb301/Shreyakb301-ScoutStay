/**
 * Travel Decision Brief, deterministic narrative built from the scoring
 * result, user weights, nearby intelligence, and airport data. No AI: same
 * inputs always produce the same text.
 */

import { TRAVELER_TYPES } from "@/lib/mock-data";
import {
  CATEGORY_LABELS,
  TRAVELER_DEFAULT_WEIGHTS,
  WEIGHT_PRESETS,
  type CategoryId,
  type ComparisonResult,
  type ScoredStay,
  type ScoreWeights,
  type Verdict,
} from "@/lib/scoring";

export interface BriefSection {
  id: "preferences" | "nearby" | "airport" | "tradeoff" | "runnerUp";
  title: string;
  body: string;
}

export interface BestForLabel {
  stayName: string;
  label: string;
}

export interface DecisionBrief {
  headline: string;
  /** Verdict + margin summary under the headline. */
  subheadline: string;
  winnerName: string;
  winnerScore: number;
  verdict: Verdict;
  sections: BriefSection[];
  bestFor: BestForLabel[];
  warnings: string[];
}

const CATEGORIES: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

const CONFIDENCE_RANK = { High: 0, Medium: 1, Low: 2 } as const;

function lower(category: CategoryId): string {
  return CATEGORY_LABELS[category].toLowerCase();
}

function joinProse(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Strongest reasons the winner wins, preferring real-data explanations. */
function winningReasons(entry: ScoredStay): string[] {
  return entry.explanations
    .filter(
      (explanation) =>
        explanation.score >= 70 && explanation.id !== "travelerFitScore"
    )
    .sort(
      (a, b) =>
        CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
        b.score - a.score
    )
    .slice(0, 3)
    .map(
      (explanation) =>
        `${explanation.score >= 85 ? "excellent" : "strong"} ${explanation.label.toLowerCase()} (${explanation.score})`
    );
}

function headlineFor(winner: ScoredStay): string {
  switch (winner.verdict) {
    case "Book":
      return `Book ${winner.stay.name}`;
    case "Maybe":
      return `Leaning toward ${winner.stay.name}`;
    case "Avoid":
      return `No standout, ${winner.stay.name} leads a weak field`;
    case "NeedsInfo":
    case "Insufficient":
      return "ScoutStay needs more information";
  }
}

function preferencesSection(
  result: ComparisonResult,
  weights: ScoreWeights
): BriefSection {
  const winner = result.bestOverall;
  const sorted = (Object.entries(weights) as [CategoryId, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const topTwo = joinProse(sorted.slice(0, 2).map(([category]) => lower(category)));

  const preset = WEIGHT_PRESETS.find((candidate) =>
    CATEGORIES.every((category) => candidate.weights[category] === weights[category])
  );
  const defaults = TRAVELER_DEFAULT_WEIGHTS[result.travelerType];
  const isDefault = CATEGORIES.every(
    (category) => defaults[category] === weights[category]
  );
  const travelerLabel =
    TRAVELER_TYPES.find((type) => type.id === result.travelerType)?.label.toLowerCase() ??
    result.travelerType;

  const blend = preset
    ? `You're using the ${preset.label} preset, which puts ${topTwo} first.`
    : isDefault
      ? `Weights are at the ${travelerLabel} trip defaults, led by ${topTwo}.`
      : `Your custom weights put ${topTwo} first.`;

  return {
    id: "preferences",
    title: "Your priorities",
    body: `${blend} ${winner.stay.name} holds #1 under this blend.`,
  };
}

function nearbySection(winner: ScoredStay): BriefSection | null {
  const nearby = winner.nearby;
  if (!nearby) return null;
  const { counts, scores, radiusMeters } = nearby;
  return {
    id: "nearby",
    title: "On the ground",
    body:
      `Within ${radiusMeters} m of ${winner.stay.name}: ` +
      `${counts.restaurant + counts.cafe} restaurants & cafés, ${counts.grocery} grocery options, ` +
      `${counts.transit} transit stops, and ${counts.park + counts.attraction} parks & sights ` +
      `(convenience score ${scores.convenienceScore}/100, real OpenStreetMap data).`,
  };
}

function airportSection(
  winner: ScoredStay,
  scoredStays: ScoredStay[]
): BriefSection | null {
  const airport = winner.airport;
  if (!airport) return null;

  const winnerIsClosest = scoredStays.every((entry) => {
    const other = entry.airport;
    return !other || other.driveMinutes >= airport.driveMinutes;
  });
  const closer = scoredStays
    .filter(
      (entry) =>
        entry.airport && entry.airport.driveMinutes < airport.driveMinutes
    )
    .sort((a, b) => a.airport!.driveMinutes - b.airport!.driveMinutes)[0];

  const iata = airport.airport.iata ? ` (${airport.airport.iata})` : "";
  return {
    id: "airport",
    title: "Getting there",
    body:
      `${airport.distanceKm} km (~${airport.driveMinutes} min) to ${airport.airport.name}${iata}. ` +
      (winnerIsClosest
        ? "That's the shortest transfer on your shortlist."
        : `${closer?.stay.name} is closer (~${closer?.airport?.driveMinutes} min) if the flight schedule is tight.`),
  };
}

function tradeoffSection(winner: ScoredStay): BriefSection {
  const weakest = CATEGORIES.filter(
    (category) => category !== "travelerFitScore"
  ).sort((a, b) => winner.scores[a] - winner.scores[b])[0];
  const explanation = winner.explanations.find(
    (candidate) => candidate.id === weakest
  );
  const detail =
    explanation?.negatives[0] ??
    explanation?.reason ??
    "no specific signals flagged";
  return {
    id: "tradeoff",
    title: "The trade-off",
    body: `${winner.stay.name}'s weakest spot is ${lower(weakest)} at ${winner.scores[weakest]}/100, ${detail.charAt(0).toLowerCase()}${detail.slice(1)}${detail.endsWith(".") ? "" : "."}`,
  };
}

function runnerUpSection(
  winner: ScoredStay,
  runnerUp: ScoredStay
): BriefSection {
  const advantages = CATEGORIES.filter(
    (category) => runnerUp.scores[category] - winner.scores[category] >= 8
  )
    .sort(
      (a, b) =>
        runnerUp.scores[b] - winner.scores[b] - (runnerUp.scores[a] - winner.scores[a])
    )
    .slice(0, 2);

  const body =
    advantages.length > 0
      ? `${runnerUp.stay.name} (#2 at ${runnerUp.overallScore}) counters with better ${joinProse(
          advantages.map(
            (category) =>
              `${lower(category)} (${runnerUp.scores[category]} vs ${winner.scores[category]})`
          )
        )}, switch if that matters more to you.`
      : `${runnerUp.stay.name} (#2 at ${runnerUp.overallScore}) doesn't beat ${winner.stay.name} in any category that carries real weight in your blend.`;

  return { id: "runnerUp", title: "The alternative", body };
}

function buildBestFor(scoredStays: ScoredStay[]): BestForLabel[] {
  const labels: BestForLabel[] = [];

  for (const category of CATEGORIES) {
    if (category === "travelerFitScore") continue;
    const leader = [...scoredStays].sort(
      (a, b) => b.scores[category] - a.scores[category]
    )[0];
    if (leader.scores[category] >= 70) {
      labels.push({
        stayName: leader.stay.name,
        label: `Best for ${lower(category)}`,
      });
    }
  }

  const withAirport = scoredStays.filter((entry) => entry.airport);
  if (withAirport.length > 0) {
    const fastest = [...withAirport].sort(
      (a, b) => a.airport!.driveMinutes - b.airport!.driveMinutes
    )[0];
    if (fastest.airport!.accessibilityScore >= 70) {
      labels.push({
        stayName: fastest.stay.name,
        label: "Best for airport access",
      });
    }
  }

  return labels;
}

function buildWarnings(result: ComparisonResult): string[] {
  const warnings: string[] = [];
  const winner = result.bestOverall;

  for (const entry of result.scoredStays) {
    if (entry.verdict === "Insufficient") {
      warnings.push(
        `${entry.stay.name} has too little data (${entry.dataCompletenessScore}% complete) to score reliably.`
      );
    } else if (entry.estimated) {
      warnings.push(
        `${entry.stay.name}'s scores are platform estimates — add listing details to make them real.`
      );
    } else if (entry.verdict === "Avoid") {
      warnings.push(
        `${entry.stay.name} lands at ${entry.overallScore}/100, an Avoid for this trip.`
      );
    }
  }

  if (winner.nearby && winner.scores.noiseRiskScore < 40) {
    warnings.push(
      `Expect evening noise around ${winner.stay.name}: ${winner.nearby.counts.nightlife} nightlife venues within ${winner.nearby.radiusMeters} m.`
    );
  }

  if (winner.airport && winner.airport.distanceKm > 25) {
    warnings.push(
      `Airport transfer from ${winner.stay.name} runs ~${winner.airport.driveMinutes} min, plan departures accordingly.`
    );
  }

  const noData = result.scoredStays.filter((entry) => !entry.nearby);
  if (noData.length > 0) {
    warnings.push(
      `${joinProse(noData.map((entry) => entry.stay.name))} ${noData.length === 1 ? "has" : "have"} no nearby data, location scores there are estimates.`
    );
  }

  return warnings.slice(0, 4);
}

/** A reliable recommendation needs real data; this is what's still missing. */
function missingForBrief(result: ComparisonResult): string[] {
  const union = new Set<string>();
  for (const entry of result.scoredStays) {
    for (const field of entry.missingFields) union.add(field);
  }
  return [...union];
}

export function buildDecisionBrief(
  result: ComparisonResult,
  weights: ScoreWeights
): DecisionBrief {
  const winner = result.bestOverall;

  // When the data is too thin, never claim a winner or "wins on strong X".
  if (!result.reliable) {
    const missing = missingForBrief(result);
    return {
      headline: "ScoutStay needs more information",
      subheadline:
        "ScoutStay needs address, price, facilities, and listing details before making a reliable recommendation. Paste an Airbnb link or fill these in to improve the briefing.",
      winnerName: winner.stay.name,
      winnerScore: winner.overallScore,
      verdict: winner.verdict,
      sections: [
        {
          id: "preferences",
          title: "What's missing",
          body:
            missing.length > 0
              ? `Add ${joinProse(missing)} so scores reflect the real listing instead of platform estimates.`
              : "Add listing details so scores reflect the real listing instead of platform estimates.",
        },
      ],
      bestFor: [],
      warnings: buildWarnings(result),
    };
  }

  const runnerUp =
    result.scoredStays.length > 1 ? result.scoredStays[1] : null;

  const reasons = winningReasons(winner);
  const margin = runnerUp ? winner.overallScore - runnerUp.overallScore : 0;
  const subheadline =
    `${winner.stay.name} scores ${winner.overallScore}/100` +
    (runnerUp
      ? margin > 0
        ? `, ${margin} point${margin === 1 ? "" : "s"} clear of ${runnerUp.stay.name}`
        : `, tied with ${runnerUp.stay.name}`
      : "") +
    (reasons.length > 0 ? `, it wins on ${joinProse(reasons)}.` : ".");

  const sections: BriefSection[] = [preferencesSection(result, weights)];
  const nearby = nearbySection(winner);
  if (nearby) sections.push(nearby);
  const airport = airportSection(winner, result.scoredStays);
  if (airport) sections.push(airport);
  sections.push(tradeoffSection(winner));
  if (runnerUp) sections.push(runnerUpSection(winner, runnerUp));

  return {
    headline: headlineFor(winner),
    subheadline,
    winnerName: winner.stay.name,
    winnerScore: winner.overallScore,
    verdict: winner.verdict,
    sections,
    bestFor: buildBestFor(result.scoredStays),
    warnings: buildWarnings(result),
  };
}
