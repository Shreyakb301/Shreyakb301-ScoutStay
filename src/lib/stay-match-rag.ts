/**
 * Evidence Based Stay Match — the "generation" stage of the RAG pipeline.
 * It builds the evidence index, turns the user's trip profile into a set of
 * rules (boolean needs, free-text must-haves / deal-breakers / nice-to-haves,
 * and numeric thresholds), retrieves supporting evidence for each rule against
 * each stay, and assembles a grounded recommendation. Every claim carries the
 * evidence snippet it came from; when nothing is retrieved we say so rather
 * than guessing. Deterministic and fully client-side.
 */

import {
  buildEvidenceIndex,
  EVIDENCE_SOURCE_LABEL,
  type EvidenceChunk,
  type EvidenceSource,
  type StayEvidence,
} from "@/lib/rag-index";
import {
  buildQuery,
  retrieve,
  type RetrievalQuery,
  type RetrievedChunk,
} from "@/lib/rag-retrieval";
import type { ScoredStay } from "@/lib/scoring";
import type { FacilityId, UserTripProfile } from "@/lib/types";

export type RuleKind = "must" | "deal" | "nice" | "need";
export type RuleStatus = "met" | "unmet" | "warning" | "unknown";

export interface EvidenceSnippet {
  stayId: string;
  source: EvidenceSource;
  sourceLabel: string;
  text: string;
  matchedTerms: string[];
}

export interface StayRuleOutcome {
  status: RuleStatus;
  evidence: EvidenceSnippet[];
}

export interface RagRuleEvaluation {
  id: string;
  label: string;
  kind: RuleKind;
  perStay: Record<string, StayRuleOutcome>;
}

export interface StayMatchScore {
  stayId: string;
  stayName: string;
  score: number;
  metCount: number;
  ruleCount: number;
  dealbreakerHits: number;
}

export interface WhyItWins {
  claim: string;
  evidence: EvidenceSnippet[];
}

export interface DealbreakerWarning {
  stayId: string;
  stayName: string;
  rule: string;
  evidence: EvidenceSnippet[];
}

export interface StayMatchResult {
  hasProfile: boolean;
  bestStayId: string | null;
  bestStayName: string | null;
  bestAlternativeId: string | null;
  bestAlternativeName: string | null;
  confidence: number;
  whyItWins: WhyItWins[];
  rules: RagRuleEvaluation[];
  mustHaves: RagRuleEvaluation[];
  dealbreakerWarnings: DealbreakerWarning[];
  missingInfo: string[];
  scores: StayMatchScore[];
}

const ABSENCE = /\b(no|not|without|lacks?|lacking|missing|none|never)\b/i;

const KIND_WEIGHT: Record<RuleKind, number> = {
  must: 2,
  need: 1.5,
  nice: 0.5,
  deal: 0,
};
const DEALBREAKER_PENALTY = 3;
const UNMET_MUST_PENALTY = 1;
const UNMET_NEED_PENALTY = 0.5;

function chunkToSnippet(
  chunk: EvidenceChunk,
  matchedTerms: string[]
): EvidenceSnippet {
  return {
    stayId: chunk.stayId,
    source: chunk.source,
    sourceLabel: EVIDENCE_SOURCE_LABEL[chunk.source],
    text: chunk.text,
    matchedTerms,
  };
}

function findChunk(
  evidence: StayEvidence,
  source: EvidenceSource
): EvidenceChunk | undefined {
  return evidence.chunks.find((chunk) => chunk.source === source);
}

/** A rule the engine evaluates. Either retrieval-based or structural. */
interface RagRule {
  id: string;
  label: string;
  kind: RuleKind;
  query?: RetrievalQuery;
  /** Structural check (numeric thresholds), returns an outcome per stay. */
  structural?: (entry: ScoredStay, evidence: StayEvidence) => StayRuleOutcome;
}

/** Classify retrieved chunks into positive vs absence-phrased mentions. */
function classify(retrieved: RetrievedChunk[]) {
  const positives = retrieved.filter((r) => !ABSENCE.test(r.chunk.text));
  const negatives = retrieved.filter((r) => ABSENCE.test(r.chunk.text));
  return { positives, negatives };
}

function evaluateRetrievalRule(
  rule: RagRule,
  entry: ScoredStay,
  evidence: StayEvidence
): StayRuleOutcome {
  const query = rule.query!;

  // Structured facility short-circuit: a selected facility is hard evidence.
  if (query.facility && entry.stay.facilities?.includes(query.facility)) {
    const facilityChunk = evidence.chunks.find(
      (chunk) =>
        chunk.source === "facilities" &&
        chunk.tokens.some((token) => query.facility && token.includes(query.facility.split("-")[0]))
    );
    return {
      status: rule.kind === "deal" ? "warning" : "met",
      evidence: facilityChunk
        ? [chunkToSnippet(facilityChunk, [query.facility])]
        : [],
    };
  }

  const retrieved = retrieve(query, evidence.chunks, 3);
  if (retrieved.length === 0) return { status: "unknown", evidence: [] };

  const { positives, negatives } = classify(retrieved);

  if (rule.kind === "deal") {
    // Present (mentioned, not negated) → warning; explicitly absent → fine.
    if (positives.length > 0) {
      return {
        status: "warning",
        evidence: positives
          .slice(0, 2)
          .map((r) => chunkToSnippet(r.chunk, r.matchedTerms)),
      };
    }
    return {
      status: "met",
      evidence: negatives
        .slice(0, 2)
        .map((r) => chunkToSnippet(r.chunk, r.matchedTerms)),
    };
  }

  // Want-present rules (must / need / nice).
  if (positives.length > 0) {
    return {
      status: "met",
      evidence: positives
        .slice(0, 2)
        .map((r) => chunkToSnippet(r.chunk, r.matchedTerms)),
    };
  }
  return {
    status: "unmet",
    evidence: negatives
      .slice(0, 2)
      .map((r) => chunkToSnippet(r.chunk, r.matchedTerms)),
  };
}

const NEED_RULES: {
  flag: keyof UserTripProfile;
  label: string;
  query: string;
  facility?: FacilityId;
}[] = [
  { flag: "needsTransit", label: "Public transit nearby", query: "public transit metro bus station nearby" },
  { flag: "needsQuiet", label: "Quiet at night", query: "quiet peaceful no street noise" },
  { flag: "needsWorkspace", label: "Dedicated workspace", query: "dedicated workspace desk office", facility: "workspace" },
  { flag: "needsPool", label: "Pool", query: "swimming pool", facility: "pool" },
  { flag: "needsGym", label: "Gym", query: "gym fitness center", facility: "gym" },
  { flag: "needsParking", label: "Free parking", query: "free parking garage", facility: "free-parking" },
  { flag: "needsPetFriendly", label: "Pet friendly", query: "pet friendly dogs allowed", facility: "pet-friendly" },
  { flag: "lateArrival", label: "Late / self check-in", query: "self check-in keypad lockbox late arrival", facility: "self-check-in" },
];

function buildRules(profile: UserTripProfile): RagRule[] {
  const rules: RagRule[] = [];

  for (const need of NEED_RULES) {
    if (profile[need.flag] === true) {
      rules.push({
        id: `need:${need.flag}`,
        label: need.label,
        kind: "need",
        query: buildQuery(need.query, "need", need.facility),
      });
    }
  }

  profile.mustHaves.filter((t) => t.trim()).forEach((text, i) =>
    rules.push({ id: `must:${i}`, label: text.trim(), kind: "must", query: buildQuery(text, "must") })
  );
  profile.dealBreakers.filter((t) => t.trim()).forEach((text, i) =>
    rules.push({ id: `deal:${i}`, label: text.trim(), kind: "deal", query: buildQuery(text, "deal") })
  );
  profile.niceToHaves.filter((t) => t.trim()).forEach((text, i) =>
    rules.push({ id: `nice:${i}`, label: text.trim(), kind: "nice", query: buildQuery(text, "nice") })
  );
  profile.plannedDestinations.filter((t) => t.trim()).forEach((text, i) =>
    rules.push({
      id: `dest:${i}`,
      label: `Close to ${text.trim()}`,
      kind: "nice",
      query: buildQuery(text, "location"),
    })
  );

  // Numeric / structural thresholds.
  if (profile.minimumBeds > 0) {
    rules.push({
      id: "num:beds",
      label: `At least ${profile.minimumBeds} beds`,
      kind: "need",
      structural: (entry, evidence) =>
        numericOutcome(entry.stay.beds, profile.minimumBeds, evidence, "specs"),
    });
  }
  if (profile.minimumBathrooms > 0) {
    rules.push({
      id: "num:baths",
      label: `At least ${profile.minimumBathrooms} bathrooms`,
      kind: "need",
      structural: (entry, evidence) =>
        numericOutcome(entry.stay.bathrooms, profile.minimumBathrooms, evidence, "specs"),
    });
  }
  if (profile.minimumRating > 0) {
    rules.push({
      id: "num:rating",
      label: `Rated ${profile.minimumRating}+ stars`,
      kind: "need",
      structural: (entry, evidence) =>
        numericOutcome(entry.stay.rating, profile.minimumRating, evidence, "ratings"),
    });
  }
  if (profile.maxAirportTransferMinutes > 0) {
    rules.push({
      id: "num:transfer",
      label: `Airport transfer under ${profile.maxAirportTransferMinutes} min`,
      kind: "need",
      structural: (entry, evidence) => {
        if (!entry.airport) return { status: "unknown", evidence: [] };
        const chunk = findChunk(evidence, "airport");
        const ok = entry.airport.driveMinutes <= profile.maxAirportTransferMinutes;
        return {
          status: ok ? "met" : "unmet",
          evidence: chunk ? [chunkToSnippet(chunk, ["transfer"])] : [],
        };
      },
    });
  }

  return rules;
}

function numericOutcome(
  value: number | undefined,
  minimum: number,
  evidence: StayEvidence,
  source: EvidenceSource
): StayRuleOutcome {
  if (typeof value !== "number") return { status: "unknown", evidence: [] };
  const chunk = findChunk(evidence, source);
  return {
    status: value >= minimum ? "met" : "unmet",
    evidence: chunk ? [chunkToSnippet(chunk, [])] : [],
  };
}

export function buildStayMatch(
  scoredStays: ScoredStay[],
  profile: UserTripProfile
): StayMatchResult {
  const index = buildEvidenceIndex(scoredStays);
  const evidenceById = new Map(index.map((e) => [e.stayId, e]));
  const rules = buildRules(profile);

  const empty: StayMatchResult = {
    hasProfile: false,
    bestStayId: null,
    bestStayName: null,
    bestAlternativeId: null,
    bestAlternativeName: null,
    confidence: 0,
    whyItWins: [],
    rules: [],
    mustHaves: [],
    dealbreakerWarnings: [],
    missingInfo: [],
    scores: [],
  };
  if (rules.length === 0) return empty;

  // Evaluate every rule against every stay.
  const evaluations: RagRuleEvaluation[] = rules.map((rule) => {
    const perStay: Record<string, StayRuleOutcome> = {};
    for (const entry of scoredStays) {
      const evidence = evidenceById.get(entry.stay.id)!;
      perStay[entry.stay.id] = rule.structural
        ? rule.structural(entry, evidence)
        : evaluateRetrievalRule(rule, entry, evidence);
    }
    return { id: rule.id, label: rule.label, kind: rule.kind, perStay };
  });

  // Score each stay from the outcomes.
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  let maxPossible = 0;
  for (const rule of rules) maxPossible += KIND_WEIGHT[rule.kind];

  const scores: StayMatchScore[] = scoredStays.map((entry) => {
    let raw = 0;
    let metCount = 0;
    let dealbreakerHits = 0;
    for (const evaluation of evaluations) {
      const outcome = evaluation.perStay[entry.stay.id];
      const kind = ruleById.get(evaluation.id)!.kind;
      if (outcome.status === "met") {
        raw += KIND_WEIGHT[kind];
        metCount += 1;
      } else if (outcome.status === "warning") {
        raw -= DEALBREAKER_PENALTY;
        dealbreakerHits += 1;
      } else if (outcome.status === "unmet") {
        raw -= kind === "must" ? UNMET_MUST_PENALTY : UNMET_NEED_PENALTY;
      }
    }
    const score = maxPossible > 0
      ? Math.max(0, Math.min(100, Math.round((raw / maxPossible) * 100)))
      : 0;
    return {
      stayId: entry.stay.id,
      stayName: entry.stay.name,
      score,
      metCount,
      ruleCount: rules.length,
      dealbreakerHits,
    };
  });

  const ranked = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break on the scoring engine's overall score.
    const aOverall = scoredStays.find((s) => s.stay.id === a.stayId)?.overallScore ?? 0;
    const bOverall = scoredStays.find((s) => s.stay.id === b.stayId)?.overallScore ?? 0;
    return bOverall - aOverall;
  });

  const best = ranked[0] ?? null;
  const alternative = ranked[1] ?? null;

  // Why it wins — best stay's met rules, highest-weight first, with evidence.
  const whyItWins: WhyItWins[] = [];
  if (best) {
    const metRules = evaluations
      .filter((e) => e.perStay[best.stayId]?.status === "met")
      .sort((a, b) => KIND_WEIGHT[ruleById.get(b.id)!.kind] - KIND_WEIGHT[ruleById.get(a.id)!.kind]);
    for (const evaluation of metRules.slice(0, 4)) {
      const outcome = evaluation.perStay[best.stayId];
      whyItWins.push({
        claim: `Meets "${evaluation.label}"`,
        evidence: outcome.evidence,
      });
    }
  }

  // Dealbreaker warnings across all stays.
  const dealbreakerWarnings: DealbreakerWarning[] = [];
  for (const evaluation of evaluations) {
    if (ruleById.get(evaluation.id)!.kind !== "deal") continue;
    for (const entry of scoredStays) {
      const outcome = evaluation.perStay[entry.stay.id];
      if (outcome.status === "warning") {
        dealbreakerWarnings.push({
          stayId: entry.stay.id,
          stayName: entry.stay.name,
          rule: evaluation.label,
          evidence: outcome.evidence,
        });
      }
    }
  }

  // Missing info — rules where the best stay had no evidence either way.
  const missingInfo: string[] = [];
  if (best) {
    for (const evaluation of evaluations) {
      if (evaluation.perStay[best.stayId]?.status === "unknown") {
        missingInfo.push(`Not enough evidence found for "${evaluation.label}".`);
      }
    }
  }

  // Confidence — evidence coverage across all cells, plus the winning margin.
  const totalCells = evaluations.length * scoredStays.length;
  let knownCells = 0;
  for (const evaluation of evaluations) {
    for (const entry of scoredStays) {
      if (evaluation.perStay[entry.stay.id]?.status !== "unknown") knownCells += 1;
    }
  }
  const coverage = totalCells > 0 ? knownCells / totalCells : 0;
  const margin = best && alternative ? (best.score - alternative.score) / 100 : best ? 0.5 : 0;
  const confidence = Math.round(coverage * 70 + Math.min(30, margin * 60));

  return {
    hasProfile: true,
    bestStayId: best?.stayId ?? null,
    bestStayName: best?.stayName ?? null,
    bestAlternativeId: alternative?.stayId ?? null,
    bestAlternativeName: alternative?.stayName ?? null,
    confidence,
    whyItWins,
    rules: evaluations,
    mustHaves: evaluations.filter((e) => ruleById.get(e.id)!.kind === "must"),
    dealbreakerWarnings,
    missingInfo,
    scores,
  };
}
