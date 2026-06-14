/**
 * Shareable report export — builds a markdown report from the scored
 * comparison, entirely client-side. The narrative parts reuse the
 * decision-brief generator so the export always matches the dashboard.
 */

import { buildDecisionBrief } from "@/lib/decision-brief";
import { PLATFORM_OPTIONS, TRAVELER_TYPES } from "@/lib/mock-data";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type ComparisonResult,
  type ScoredStay,
  type ScoreWeights,
} from "@/lib/scoring";

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
    `### ${entry.rank}. ${entry.stay.name} — ${entry.overallScore}/100 (${entry.verdict})`
  );
  lines.push("");
  lines.push(
    `${platformLabel(entry.stay.platform)} — $${Number(entry.stay.pricePerNight) || 0}/night` +
      (entry.stay.address ? ` — ${entry.stay.address}` : "")
  );
  lines.push("");
  for (const category of CATEGORY_ORDER) {
    lines.push(`- ${CATEGORY_LABELS[category]}: ${entry.scores[category]}`);
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
        `${entry.airport.airport.name}${iata} — access score ${entry.airport.accessibilityScore}/100`
    );
  }
  lines.push("");
  return lines;
}

/** The full shareable report as markdown. */
export function buildMarkdownReport(
  result: ComparisonResult,
  weights: ScoreWeights
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
    `_Generated ${date} — ${travelerLabel} trip — ${result.scoredStays.length} stays compared_`
  );
  lines.push("");

  lines.push("## Decision brief");
  lines.push("");
  lines.push(`**${brief.headline}** — ${brief.winnerScore}/100 (${brief.verdict})`);
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
      lines.push(`- ${item.label} — ${item.stayName}`);
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
  lines.push("| # | Stay | Platform | Price/night | Score | Verdict |");
  lines.push("| - | ---- | -------- | ----------- | ----- | ------- |");
  for (const entry of result.scoredStays) {
    lines.push(
      `| ${entry.rank} | ${entry.stay.name} | ${platformLabel(entry.stay.platform)} | ` +
        `$${Number(entry.stay.pricePerNight) || 0} | ${entry.overallScore} | ${entry.verdict} |`
    );
  }
  lines.push("");

  lines.push("## Stay details");
  lines.push("");
  for (const entry of result.scoredStays) {
    lines.push(...stayDetail(entry));
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
    "_Scores 0–100, higher is better. Location data from OpenStreetMap — scoutstay_"
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
