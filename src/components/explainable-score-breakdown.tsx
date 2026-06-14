import { ScoreExplanationCard } from "@/components/score-explanation-card";
import type { ScoredStay } from "@/lib/scoring";

/** Per-category reasoning and confidence for every stay. */
export function ExplainableScoreBreakdown({
  scoredStays,
}: {
  scoredStays: ScoredStay[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Every score with its reasoning and signals. Confidence:{" "}
        <span className="data font-semibold text-go">HI</span> = real
        OpenStreetMap or price data,{" "}
        <span className="data font-semibold text-caution">MED</span> = leans on
        your notes, <span className="data font-semibold">LO</span> = rough
        estimate.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {scoredStays.map((entry) => (
          <ScoreExplanationCard key={entry.stay.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
