import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/scoring";

const VERDICT_STYLES: Record<Verdict, string> = {
  Book: "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
  Maybe: "border-transparent bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
  Avoid: "border-transparent bg-red-600 text-white dark:bg-red-500",
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  return (
    <Badge className={cn(VERDICT_STYLES[verdict], className)}>{verdict}</Badge>
  );
}

/** Text color for a 0–100 score, matching the verdict thresholds. */
export function scoreTextClass(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/** Indicator color for progress bars on a 0–100 score. */
export function scoreBarClass(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}
