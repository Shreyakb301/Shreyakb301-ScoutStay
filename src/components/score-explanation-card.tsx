import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  VerdictBadge,
  scoreBarClass,
  scoreTextClass,
} from "@/components/verdict-badge";
import type { ConfidenceLevel, ScoredStay, ScoreExplanation } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  High: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Medium:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Low: "border-border bg-muted text-muted-foreground",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", CONFIDENCE_STYLES[level])}
      title={`${level} confidence: ${
        level === "High"
          ? "based on real data"
          : level === "Medium"
            ? "based on your notes"
            : "rough estimate only"
      }`}
    >
      {level}
    </Badge>
  );
}

function ExplanationRow({ explanation }: { explanation: ScoreExplanation }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{explanation.label}</span>
        <ConfidenceBadge level={explanation.confidence} />
        <span
          className={cn(
            "ml-auto text-sm font-semibold tabular-nums",
            scoreTextClass(explanation.score)
          )}
        >
          {explanation.score}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${explanation.label} score`}
        aria-valuenow={explanation.score}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", scoreBarClass(explanation.score))}
          style={{ width: `${explanation.score}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{explanation.reason}</p>

      {(explanation.positives.length > 0 ||
        explanation.negatives.length > 0) && (
        <ul className="mt-2 flex flex-col gap-1">
          {explanation.positives.map((signal) => (
            <li key={signal} className="flex items-start gap-1.5 text-xs">
              <Plus className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {signal}
            </li>
          ))}
          {explanation.negatives.map((signal) => (
            <li key={signal} className="flex items-start gap-1.5 text-xs">
              <Minus className="mt-0.5 size-3 shrink-0 text-red-600 dark:text-red-400" />
              {signal}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Full per-category reasoning for one stay. */
export function ScoreExplanationCard({ entry }: { entry: ScoredStay }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-base" title={entry.stay.name}>
            <span className="mr-2 font-mono text-sm text-muted-foreground">
              #{entry.rank}
            </span>
            {entry.stay.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                scoreTextClass(entry.overallScore)
              )}
            >
              {entry.overallScore}
            </span>
            <VerdictBadge verdict={entry.verdict} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {entry.explanations.map((explanation) => (
          <ExplanationRow key={explanation.id} explanation={explanation} />
        ))}
      </CardContent>
    </Card>
  );
}
