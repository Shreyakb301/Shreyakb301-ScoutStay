import {
  FileText,
  MapPin,
  Medal,
  Plane,
  Scale,
  SlidersHorizontal,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VerdictBadge, scoreTextClass } from "@/components/verdict-badge";
import { buildDecisionBrief, type BriefSection } from "@/lib/decision-brief";
import type { ComparisonResult, ScoreWeights } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<BriefSection["id"], LucideIcon> = {
  preferences: SlidersHorizontal,
  nearby: MapPin,
  airport: Plane,
  tradeoff: Scale,
  runnerUp: Medal,
};

export function TravelDecisionBrief({
  result,
  weights,
}: {
  result: ComparisonResult;
  weights: ScoreWeights;
}) {
  const brief = buildDecisionBrief(result, weights);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div>
            <CardTitle>Travel decision brief</CardTitle>
            <CardDescription>
              Generated from your scores, priorities, and real location data.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Verdict */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight">
              {brief.headline}
            </h3>
            <span
              className={cn(
                "text-xl font-bold tabular-nums",
                scoreTextClass(brief.winnerScore)
              )}
            >
              {brief.winnerScore}
            </span>
            <VerdictBadge verdict={brief.verdict} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {brief.subheadline}
          </p>
        </div>

        <Separator />

        {/* Narrative sections */}
        <div className="grid gap-4 sm:grid-cols-2">
          {brief.sections.map((section) => {
            const Icon = SECTION_ICONS[section.id];
            return (
              <div key={section.id} className="flex gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{section.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Best-for labels */}
        {brief.bestFor.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brief.bestFor.map((item) => (
              <Badge
                key={`${item.stayName}-${item.label}`}
                variant="outline"
                className="gap-1.5 py-1 font-normal"
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">·</span>
                <span className="max-w-40 truncate text-muted-foreground">
                  {item.stayName}
                </span>
              </Badge>
            ))}
          </div>
        )}

        {/* Warnings */}
        {brief.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
              <TriangleAlert className="size-4" />
              Watch out for
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {brief.warnings.map((warning) => (
                <li
                  key={warning}
                  className="text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
