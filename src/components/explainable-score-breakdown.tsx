import { ScoreExplanationCard } from "@/components/score-explanation-card";
import type { ScoredStay } from "@/lib/scoring";

/** "Why these scores?" — per-category reasoning for every stay. */
export function ExplainableScoreBreakdown({
  scoredStays,
}: {
  scoredStays: ScoredStay[];
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold">Why these scores?</h3>
      <p className="text-sm text-muted-foreground">
        Every score with its reasoning and signals. <strong>High</strong>{" "}
        confidence means real OpenStreetMap or price data;{" "}
        <strong>Medium</strong> means it leans on your notes;{" "}
        <strong>Low</strong> is a rough estimate.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {scoredStays.map((entry) => (
          <ScoreExplanationCard key={entry.stay.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
