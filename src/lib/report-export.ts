/**
 * Shareable report export, builds a markdown report from the scored
 * comparison, entirely client-side. The narrative parts reuse the
 * decision-brief generator so the export always matches the dashboard.
 */

import { buildDecisionBrief } from "@/lib/decision-brief";
import {
  facilityLabel,
  getFacilitiesComparisonSummary,
  getFacilitiesForStay,
} from "@/lib/facilities";
import { PLATFORM_OPTIONS, TRAVELER_TYPES } from "@/lib/mock-data";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type ComparisonResult,
  type ScoredStay,
  type ScoreWeights,
  type Verdict,
} from "@/lib/scoring";
import { buildStayMatch } from "@/lib/stay-match-rag";
import type { UserTripProfile } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  Book: "Recommended",
  Maybe: "Consider",
  Avoid: "Not advised",
  NeedsInfo: "Needs more info",
  Insufficient: "Insufficient data",
};

const CATEGORY_ORDER: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

function platformLabel(value: string): string {
  return (
    PLATFORM_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function stayDetail(entry: ScoredStay): string[] {
  const lines: string[] = [];
  lines.push(
    `### ${entry.rank}. ${entry.stay.name}, ${entry.overallScore}/100 (${VERDICT_LABEL[entry.verdict]})`
  );
  lines.push("");
  const rate = Number(entry.stay.pricePerNight) || 0;
  lines.push(
    `${platformLabel(entry.stay.platform)}, ${rate > 0 ? `$${rate}/night` : "price not set"}` +
      (entry.stay.address ? `, ${entry.stay.address}` : "")
  );
  lines.push("");
  lines.push(
    `_Data completeness ${entry.dataCompletenessScore}% (${entry.dataConfidence} confidence)._`
  );
  if (entry.estimated) {
    lines.push(
      "_The category scores below are platform estimates, not based on real listing data. Add the listing details to make them meaningful._"
    );
  }
  if (entry.missingFields.length > 0) {
    lines.push(`_Missing: ${entry.missingFields.join(", ")}._`);
  }
  lines.push("");
  for (const category of CATEGORY_ORDER) {
    const suffix = entry.estimated ? " (estimated)" : "";
    lines.push(`- ${CATEGORY_LABELS[category]}: ${entry.scores[category]}${suffix}`);
  }
  if (entry.nearby) {
    const { counts, scores, radiusMeters } = entry.nearby;
    lines.push(
      `- Nearby (within ${radiusMeters} m): ${counts.restaurant + counts.cafe} restaurants & cafés, ` +
        `${counts.grocery} groceries, ${counts.transit} transit stops, ` +
        `${counts.nightlife} nightlife venues, ${counts.park + counts.attraction} parks & sights ` +
        `(convenience ${scores.convenienceScore}/100)`
    );
  }
  if (entry.airport) {
    const iata = entry.airport.airport.iata
      ? ` (${entry.airport.airport.iata})`
      : "";
    lines.push(
      `- Airport: ${entry.airport.distanceKm} km (~${entry.airport.driveMinutes} min) to ` +
        `${entry.airport.airport.name}${iata}, access score ${entry.airport.accessibilityScore}/100`
    );
  }
  lines.push("");
  return lines;
}

/** The full shareable report as markdown. */
/** The Evidence Based Stay Match section, when a trip profile is supplied. */
function evidenceMatchLines(
  result: ComparisonResult,
  profile: UserTripProfile
): string[] {
  const match = buildStayMatch(result.scoredStays, profile);
  if (!match.hasProfile) return [];

  const bestScore =
    match.scores.find((s) => s.stayId === match.bestStayId)?.score ?? 0;
  const lines: string[] = [];

  lines.push("## Evidence based stay match");
  lines.push("");
  lines.push(
    `**Best match:** ${match.bestStayName ?? "—"} (${bestScore}/100, confidence ${match.confidence}%)`
  );
  lines.push("");

  if (match.whyItWins.length > 0) {
    lines.push("### Why it wins");
    lines.push("");
    for (const reason of match.whyItWins) {
      const quote = reason.evidence[0];
      lines.push(
        `- ${reason.claim}` +
          (quote ? ` — _${quote.sourceLabel}: "${quote.text}"_` : "")
      );
    }
    lines.push("");
  }

  if (match.dealbreakerWarnings.length > 0) {
    lines.push("### Deal-breaker warnings");
    lines.push("");
    for (const warning of match.dealbreakerWarnings) {
      lines.push(`- ${warning.stayName}: ${warning.rule}`);
    }
    lines.push("");
  }

  if (match.missingInfo.length > 0) {
    lines.push("### Missing information");
    lines.push("");
    for (const item of match.missingInfo) lines.push(`- ${item}`);
    lines.push("");
  }

  if (match.bestAlternativeName) {
    const altScore =
      match.scores.find((s) => s.stayId === match.bestAlternativeId)?.score ?? 0;
    lines.push(`**Best alternative:** ${match.bestAlternativeName} (${altScore}/100)`);
    lines.push("");
  }

  return lines;
}

export function buildMarkdownReport(
  result: ComparisonResult,
  weights: ScoreWeights,
  profile?: UserTripProfile
): string {
  const brief = buildDecisionBrief(result, weights);
  const travelerLabel =
    TRAVELER_TYPES.find((type) => type.id === result.travelerType)?.label ??
    result.travelerType;
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push("# ScoutStay travel report");
  lines.push("");
  lines.push(
    `_Generated ${date}, ${travelerLabel} trip, ${result.scoredStays.length} stays compared_`
  );
  lines.push("");

  lines.push("## Decision brief");
  lines.push("");
  const gated = brief.verdict === "NeedsInfo" || brief.verdict === "Insufficient";
  lines.push(
    gated
      ? `**${brief.headline}** (${VERDICT_LABEL[brief.verdict]})`
      : `**${brief.headline}**, ${brief.winnerScore}/100 (${VERDICT_LABEL[brief.verdict]})`
  );
  lines.push("");
  lines.push(brief.subheadline);
  lines.push("");
  for (const section of brief.sections) {
    lines.push(`- **${section.title}:** ${section.body}`);
  }
  lines.push("");

  if (brief.bestFor.length > 0) {
    lines.push("### Best for");
    lines.push("");
    for (const item of brief.bestFor) {
      lines.push(`- ${item.label}, ${item.stayName}`);
    }
    lines.push("");
  }

  if (brief.warnings.length > 0) {
    lines.push("### Watch out for");
    lines.push("");
    for (const warning of brief.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Ranked comparison");
  lines.push("");
  lines.push("| # | Stay | Rate/night | Score | Data | Confidence | Status |");
  lines.push("| - | ---- | ---------- | ----- | ---- | ---------- | ------ |");
  for (const entry of result.scoredStays) {
    const rate = Number(entry.stay.pricePerNight) || 0;
    lines.push(
      `| ${entry.rank} | ${entry.stay.name} | ${rate > 0 ? `$${rate}` : "—"} | ` +
        `${entry.overallScore}${entry.estimated ? " est" : ""} | ${entry.dataCompletenessScore}% | ` +
        `${entry.dataConfidence} | ${VERDICT_LABEL[entry.verdict]} |`
    );
  }
  lines.push("");

  lines.push("## Stay details");
  lines.push("");
  for (const entry of result.scoredStays) {
    lines.push(...stayDetail(entry));
  }

  const stays = result.scoredStays.map((entry) => entry.stay);
  const facilities = getFacilitiesComparisonSummary(stays);
  if (facilities.anyFacilitiesEntered) {
    lines.push("## Facilities");
    lines.push("");
    if (facilities.bestEquipped) {
      lines.push(`Best equipped: ${facilities.bestEquipped.name}`);
    }
    if (facilities.mostMissing) {
      lines.push(`Most gaps vs others: ${facilities.mostMissing.name}`);
    }
    lines.push("");
    for (const stay of stays) {
      const have = getFacilitiesForStay(stay).map(facilityLabel);
      lines.push(
        `- **${stay.name}** (${have.length}): ${have.length > 0 ? have.join(", ") : "none recorded"}`
      );
    }
    lines.push("");
  }

  // Only run the evidence match when there's enough real data to trust it;
  // otherwise it would "win" on platform estimates.
  if (profile && result.reliable) {
    lines.push(...evidenceMatchLines(result, profile));
  }

  lines.push("## Preference weights");
  lines.push("");
  lines.push("| Category | Weight |");
  lines.push("| -------- | ------ |");
  for (const category of CATEGORY_ORDER) {
    lines.push(`| ${CATEGORY_LABELS[category]} | ${weights[category]} |`);
  }
  lines.push("");
  lines.push(
    "_Scores 0–100, higher is better. Location data from OpenStreetMap, scoutstay_"
  );
  lines.push("");

  return lines.join("\n");
}

/** Copy text to the clipboard; returns false if every strategy failed. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Trigger a client-side download of the report as a markdown file. */
export function downloadMarkdown(
  content: string,
  filename = "scoutstay-report.md"
): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
