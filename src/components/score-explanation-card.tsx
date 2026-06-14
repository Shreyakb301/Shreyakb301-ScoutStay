import { Panel } from "@/components/briefing";
import {
  VerdictBadge,
  scoreBarClass,
  scoreTextClass,
} from "@/components/verdict-badge";
import type { ConfidenceLevel, ScoredStay, ScoreExplanation } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const CONFIDENCE_CODE: Record<ConfidenceLevel, string> = {
  High: "HI",
  Medium: "MED",
  Low: "LO",
};

const CONFIDENCE_CLASSES: Record<ConfidenceLevel, string> = {
  High: "border-go/40 text-go",
  Medium: "border-caution/50 text-caution",
  Low: "border-border text-muted-foreground",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em]",
        CONFIDENCE_CLASSES[level]
      )}
      title={`${level} confidence: ${
        level === "High"
          ? "based on real data"
          : level === "Medium"
            ? "based on your notes"
            : "rough estimate only"
      }`}
    >
      {CONFIDENCE_CODE[level]}
    </span>
  );
}

function ExplanationRow({ explanation }: { explanation: ScoreExplanation }) {
  return (
    <div className="border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{explanation.label}</span>
        <ConfidenceBadge level={explanation.confidence} />
        <span
          className={cn(
            "data ml-auto text-sm font-semibold",
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
        className="mt-2 h-1 w-full overflow-hidden bg-muted"
      >
        <div
          className={cn("h-full", scoreBarClass(explanation.score))}
          style={{ width: `${explanation.score}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{explanation.reason}</p>

      {(explanation.positives.length > 0 ||
        explanation.negatives.length > 0) && (
        <ul className="mt-2 flex flex-col gap-1">
          {explanation.positives.map((signal) => (
            <li key={signal} className="flex items-start gap-1.5 text-xs">
              <span className="mt-1 size-1 shrink-0 bg-go" aria-hidden />
              {signal}
            </li>
          ))}
          {explanation.negatives.map((signal) => (
            <li key={signal} className="flex items-start gap-1.5 text-xs">
              <span className="mt-1 size-1 shrink-0 bg-nogo" aria-hidden />
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
  const titleBar = (
    <div className="flex items-center gap-2">
      <span className="data text-foreground">
        {String(entry.rank).padStart(2, "0")}
      </span>
      <span className="truncate text-foreground" title={entry.stay.name}>
        {entry.stay.name}
      </span>
    </div>
  );

  return (
    <Panel
      title={titleBar}
      titleClassName="text-sm font-semibold"
      aside={
        <div className="flex items-center gap-2">
          <span className={cn("data text-base font-bold", scoreTextClass(entry.overallScore))}>
            {entry.overallScore}
          </span>
          <VerdictBadge verdict={entry.verdict} />
        </div>
      }
      bodyClassName="flex flex-col gap-2.5"
    >
      {entry.explanations.map((explanation) => (
        <ExplanationRow key={explanation.id} explanation={explanation} />
      ))}
    </Panel>
  );
}
