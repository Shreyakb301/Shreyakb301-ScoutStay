"use client";

import { Panel } from "@/components/briefing";
import { TravelDecisionBrief } from "@/components/travel-decision-brief";
import { useAiBrief } from "@/hooks/use-ai-brief";
import type { ComparisonResult, ScoreWeights } from "@/lib/scoring";
import type { UserTripProfile } from "@/lib/types";

export function AiDecisionBrief({
  result,
  weights,
  profile,
}: {
  result: ComparisonResult;
  weights: ScoreWeights;
  profile?: UserTripProfile;
}) {
  const { text, source, loading, error } = useAiBrief(result, weights, profile);

  // API failed (or no key) → deterministic brief so the section never breaks.
  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="eyebrow text-muted-foreground">
          AI brief unavailable — showing the standard briefing.
        </p>
        <TravelDecisionBrief result={result} weights={weights} />
      </div>
    );
  }

  return (
    <Panel
      title="Briefing abstract"
      aside={
        <span className="eyebrow">
          {loading
            ? "Generating…"
            : source === "openai"
              ? "AI generated"
              : "Needs more info"}
        </span>
      }
      bodyClassName="flex flex-col gap-3"
    >
      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-3 w-3/4 animate-pulse bg-muted" />
          <div className="h-3 w-full animate-pulse bg-muted" />
          <div className="h-3 w-5/6 animate-pulse bg-muted" />
          <p className="eyebrow mt-1 text-muted-foreground">
            Generating briefing…
          </p>
        </div>
      ) : (
        <>
          {!result.reliable && (
            <p className="eyebrow text-signal">
              Low-confidence — add listing data for a real recommendation
            </p>
          )}
          {(text ?? "")
            .split(/\n{2,}/)
            .filter((para) => para.trim())
            .map((para, index) => (
              <p key={index} className="text-sm leading-relaxed">
                {para.trim()}
              </p>
            ))}
        </>
      )}
    </Panel>
  );
}
