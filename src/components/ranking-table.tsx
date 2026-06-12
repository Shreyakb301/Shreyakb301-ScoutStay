import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function RankingTable({ scoredStays }: { scoredStays: ScoredStay[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranked comparison</CardTitle>
        <CardDescription>
          Your shortlist ordered by overall score for this trip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead className="hidden sm:table-cell">Platform</TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                Price/night
              </TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Verdict</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scoredStays.map((entry) => (
              <TableRow key={entry.stay.id}>
                <TableCell className="font-mono text-muted-foreground">
                  #{entry.rank}
                </TableCell>
                <TableCell className="max-w-48 truncate font-medium" title={entry.stay.name}>
                  {entry.stay.name}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {platformLabel(entry.stay.platform)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">
                  ${Number(entry.stay.pricePerNight) || 0}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    scoreTextClass(entry.overallScore)
                  )}
                >
                  {entry.overallScore}
                </TableCell>
                <TableCell className="text-right">
                  <VerdictBadge verdict={entry.verdict} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
