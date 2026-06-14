import { Panel } from "@/components/briefing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictBadge, scoreTextClass } from "@/components/verdict-badge";
import { PLATFORM_OPTIONS } from "@/lib/mock-data";
import type { ScoredStay } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function platformLabel(value: string): string {
  return PLATFORM_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

const HEAD = "eyebrow h-9 px-3 text-left align-middle";

export function RankingTable({ scoredStays }: { scoredStays: ScoredStay[] }) {
  return (
    <Panel title="Ranked manifest" bodyClassName="p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(HEAD, "w-12")}>Pos</TableHead>
            <TableHead className={HEAD}>Stay</TableHead>
            <TableHead className={cn(HEAD, "hidden sm:table-cell")}>
              Platform
            </TableHead>
            <TableHead className={cn(HEAD, "hidden text-right sm:table-cell")}>
              Rate/nt
            </TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Score</TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scoredStays.map((entry) => (
            <TableRow key={entry.stay.id} className="border-border">
              <TableCell className="px-3 data text-sm font-semibold text-signal">
                {String(entry.rank).padStart(2, "0")}
              </TableCell>
              <TableCell
                className="max-w-48 truncate px-3 font-medium"
                title={entry.stay.name}
              >
                {entry.stay.name}
              </TableCell>
              <TableCell className="hidden px-3 text-muted-foreground sm:table-cell">
                {platformLabel(entry.stay.platform)}
              </TableCell>
              <TableCell className="hidden px-3 text-right data text-muted-foreground sm:table-cell">
                ${Number(entry.stay.pricePerNight) || 0}
              </TableCell>
              <TableCell
                className={cn(
                  "px-3 text-right data font-bold",
                  scoreTextClass(entry.overallScore)
                )}
              >
                {entry.overallScore}
              </TableCell>
              <TableCell className="px-3 text-right">
                <div className="flex justify-end">
                  <VerdictBadge verdict={entry.verdict} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
