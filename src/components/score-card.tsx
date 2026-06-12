import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { scoreTextClass } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  icon: LucideIcon;
  stayName: string;
  score: number;
  detail: string;
  /** Tint for the icon chip, e.g. "text-emerald-600 bg-emerald-500/10". */
  accentClass?: string;
}

/** Highlight stat card used in the dashboard's top row. */
export function ScoreCard({
  label,
  icon: Icon,
  stayName,
  score,
  detail,
  accentClass = "text-primary bg-primary/10",
}: ScoreCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              accentClass
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <div>
          <p className="truncate font-semibold" title={stayName}>
            {stayName}
          </p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
        <p className={cn("text-3xl font-bold tabular-nums", scoreTextClass(score))}>
          {score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
      </CardContent>
    </Card>
  );
}
