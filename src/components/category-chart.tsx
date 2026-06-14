"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Panel } from "@/components/briefing";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type ScoredStay,
} from "@/lib/scoring";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const CHART_CATEGORIES: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

export function CategoryChart({ scoredStays }: { scoredStays: ScoredStay[] }) {
  // One row per category; one bar (keyed by stay id) per listing.
  const data = CHART_CATEGORIES.map((category) => {
    const row: Record<string, string | number> = {
      category: CATEGORY_LABELS[category],
    };
    for (const entry of scoredStays) {
      row[entry.stay.id] = entry.scores[category];
    }
    return row;
  });

  return (
    <Panel title="Category profile">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" stroke="currentColor" opacity={0.3} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "2px",
                  fontSize: "0.8rem",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              {scoredStays.map((entry, index) => (
                <Bar
                  key={entry.stay.id}
                  dataKey={entry.stay.id}
                  name={entry.stay.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
    </Panel>
  );
}
