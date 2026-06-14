import { Panel } from "@/components/briefing";
import { VerdictBadge, scoreTextClass } from "@/components/verdict-badge";
import { buildDecisionBrief } from "@/lib/decision-brief";
import type { ComparisonResult, ScoreWeights } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function TravelDecisionBrief({
  result,
  weights,
}: {
  result: ComparisonResult;
  weights: ScoreWeights;
}) {
  const brief = buildDecisionBrief(result, weights);

  return (
    <Panel title="Briefing abstract" bodyClassName="flex flex-col gap-5">
      {/* Verdict line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {brief.headline}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "data text-2xl font-bold",
              scoreTextClass(brief.winnerScore)
            )}
          >
            {brief.winnerScore}
            <span className="text-sm font-normal text-muted-foreground">
              /100
            </span>
          </span>
          <VerdictBadge verdict={brief.verdict} />
        </div>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {brief.subheadline}
      </p>

      {/* Narrative findings as a ruled definition list */}
      <dl className="grid gap-x-8 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
        {brief.sections.map((section) => (
          <div key={section.id} className="border-l-2 border-border pl-3">
            <dt className="eyebrow">{section.title}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </dd>
          </div>
        ))}
      </dl>

      {/* Best-for tags */}
      {brief.bestFor.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4">
          {brief.bestFor.map((item) => (
            <div
              key={`${item.stayName}-${item.label}`}
              className="flex flex-col"
            >
              <span className="eyebrow">{item.label}</span>
              <span className="max-w-48 truncate text-sm font-medium">
                {item.stayName}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
