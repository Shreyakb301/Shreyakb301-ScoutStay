"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  PiggyBank,
  RotateCcw,
  Shield,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CategoryChart } from "@/components/category-chart";
import { ListingScoreCard } from "@/components/listing-score-card";
import { ProsConsCard } from "@/components/pros-cons-card";
import { RankingTable } from "@/components/ranking-table";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { ScoreCard } from "@/components/score-card";

// Leaflet touches `window` at import time and adds weight; load it only
// once the dashboard is shown, and never on the server.
const StayMap = dynamic(
  () => import("@/components/stay-map").then((module) => module.StayMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
    ),
  }
);
import { TRAVELER_TYPES } from "@/lib/mock-data";
import { scoreComparison } from "@/lib/scoring";
import type { ComparisonRequest } from "@/lib/types";

interface ResultsDashboardProps {
  request: ComparisonRequest;
  onStartOver: () => void;
}

export function ResultsDashboard({ request, onStartOver }: ResultsDashboardProps) {
  const result = useMemo(() => scoreComparison(request), [request]);
  const traveler = TRAVELER_TYPES.find((type) => type.id === request.travelerType);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Your stay intelligence report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.scoredStays.length} stays scored for a{" "}
            {traveler ? `${traveler.icon} ${traveler.label.toLowerCase()}` : request.travelerType}{" "}
            trip.
          </p>
        </div>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="size-4" />
          Start over
        </Button>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Best overall"
          icon={Trophy}
          stayName={result.bestOverall.stay.name}
          score={result.bestOverall.overallScore}
          detail="Top pick for this trip"
          accentClass="text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
        />
        <ScoreCard
          label="Safest stay"
          icon={Shield}
          stayName={result.safest.stay.name}
          score={result.safest.scores.safetyScore}
          detail="Highest safety score"
          accentClass="text-sky-600 bg-sky-500/10 dark:text-sky-400"
        />
        <ScoreCard
          label="Best value"
          icon={PiggyBank}
          stayName={result.bestValue.stay.name}
          score={result.bestValue.scores.valueScore}
          detail="Most for your money"
          accentClass="text-amber-600 bg-amber-500/10 dark:text-amber-400"
        />
        <ScoreCard
          label="Biggest risk"
          icon={AlertTriangle}
          stayName={result.biggestRisk.stay.name}
          score={result.biggestRisk.overallScore}
          detail="Lowest overall score"
          accentClass="text-red-600 bg-red-500/10 dark:text-red-400"
        />
      </div>

      <RecommendationPanel result={result} />

      <RankingTable scoredStays={result.scoredStays} />

      <StayMap scoredStays={result.scoredStays} />

      <CategoryChart scoredStays={result.scoredStays} />

      {/* Per-listing breakdowns */}
      <div>
        <h3 className="text-lg font-semibold">Score breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Category-by-category detail for each stay.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {result.scoredStays.map((entry) => (
            <ListingScoreCard key={entry.stay.id} entry={entry} />
          ))}
        </div>
      </div>

      {/* Pros & cons */}
      <div>
        <h3 className="text-lg font-semibold">Pros & cons</h3>
        <p className="text-sm text-muted-foreground">
          The trade-offs that drove each verdict.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {result.scoredStays.map((entry) => (
            <ProsConsCard key={entry.stay.id} entry={entry} />
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex justify-center pb-4">
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="size-4" />
          Compare a different shortlist
        </Button>
      </div>
    </div>
  );
}
