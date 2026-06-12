import { Minus, Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerdictBadge } from "@/components/verdict-badge";
import type { ScoredStay } from "@/lib/scoring";

export function ProsConsCard({ entry }: { entry: ScoredStay }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-base" title={entry.stay.name}>
            {entry.stay.name}
          </CardTitle>
          <VerdictBadge verdict={entry.verdict} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ul className="flex flex-col gap-2">
          {entry.pros.map((pro) => (
            <li key={pro} className="flex items-start gap-2 text-sm">
              <Plus className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {pro}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2">
          {entry.cons.map((con) => (
            <li key={con} className="flex items-start gap-2 text-sm">
              <Minus className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
              {con}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
