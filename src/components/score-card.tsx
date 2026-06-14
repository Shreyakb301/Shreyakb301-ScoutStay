import { scoreTextClass } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  stayName: string;
  score: number;
  detail: string;
}

/**
 * A single key-metric readout in the executive summary strip — flat, ruled,
 * monospace figure. No icon chrome: the number and its status color carry it.
 */
export function ScoreCard({ label, stayName, score, detail }: ScoreCardProps) {
  return (
    <div className="flex flex-col gap-2 border-l-2 border-border bg-card py-1 pl-3">
      <span className="eyebrow">{label}</span>
      <p
        className={cn(
          "data text-3xl font-bold leading-none",
          scoreTextClass(score)
        )}
      >
        {score}
        <span className="text-sm font-normal text-muted-foreground">/100</span>
      </p>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" title={stayName}>
          {stayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
