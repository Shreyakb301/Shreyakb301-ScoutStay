import { scoreStatus } from "@/components/briefing";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/scoring";

/** Plain-language label for each verdict — no box, just subtle signal text. */
const VERDICT_LABEL: Record<Verdict, string> = {
  Book: "Recommended",
  Maybe: "Consider",
  Avoid: "Not advised",
  NeedsInfo: "Needs more info",
  Insufficient: "Insufficient data",
};

const VERDICT_TEXT: Record<Verdict, string> = {
  Book: "text-go",
  Maybe: "text-caution",
  Avoid: "text-nogo",
  NeedsInfo: "text-muted-foreground",
  Insufficient: "text-muted-foreground",
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-sm font-medium normal-case tracking-normal",
        VERDICT_TEXT[verdict],
        className
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

/** Text color for a 0–100 score, matching the verdict thresholds. */
export function scoreTextClass(score: number): string {
  const status = scoreStatus(score);
  if (status === "go") return "text-go";
  if (status === "caution") return "text-caution";
  return "text-nogo";
}

/** Indicator color for progress bars on a 0–100 score. */
export function scoreBarClass(score: number): string {
  const status = scoreStatus(score);
  if (status === "go") return "bg-go";
  if (status === "caution") return "bg-caution";
  return "bg-nogo";
}
