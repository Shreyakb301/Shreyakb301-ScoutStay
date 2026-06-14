import { Panel } from "@/components/briefing";
import { VerdictBadge } from "@/components/verdict-badge";
import type { ScoredStay } from "@/lib/scoring";

export function ProsConsCard({ entry }: { entry: ScoredStay }) {
  return (
    <Panel
      title={<span className="block truncate">{entry.stay.name}</span>}
      titleClassName="text-sm font-semibold"
      aside={<VerdictBadge verdict={entry.verdict} />}
      bodyClassName="grid gap-5 sm:grid-cols-2"
    >
      <div>
        <p className="eyebrow text-go">Strengths</p>
        <ul className="mt-2 flex flex-col gap-2">
          {entry.pros.map((pro) => (
            <li key={pro} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 bg-go" aria-hidden />
              {pro}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow text-nogo">Limitations</p>
        <ul className="mt-2 flex flex-col gap-2">
          {entry.cons.map((con) => (
            <li key={con} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 bg-nogo" aria-hidden />
              {con}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
