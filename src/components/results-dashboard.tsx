"use client";

import { useMemo, useState } from "react";
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
import { AirportIntelligence } from "@/components/airport-intelligence";
import { CategoryChart } from "@/components/category-chart";
import { ExplainableScoreBreakdown } from "@/components/explainable-score-breakdown";
import { ExportReportButton } from "@/components/export-report-button";
import { SaveComparisonButton } from "@/components/save-comparison-button";
import { ShareComparisonButton } from "@/components/share-comparison-button";
import { ListingScoreCard } from "@/components/listing-score-card";
import { NearbyIntelligence } from "@/components/nearby-intelligence";
import { PreferencePanel } from "@/components/preference-panel";
import { ProsConsCard } from "@/components/pros-cons-card";
import { RankingTable } from "@/components/ranking-table";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { ScoreCard } from "@/components/score-card";
import { TravelDecisionBrief } from "@/components/travel-decision-brief";
import { useAirportIntelligence } from "@/hooks/use-airport-intelligence";
import { useGeocodedStays } from "@/hooks/use-geocoded-stays";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";

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
import {
  scoreComparison,
  TRAVELER_DEFAULT_WEIGHTS,
  type ScoreWeights,
} from "@/lib/scoring";
import type { ComparisonRequest } from "@/lib/types";

interface ResultsDashboardProps {
  request: ComparisonRequest;
  initialWeights?: ScoreWeights;
  onStartOver: () => void;
}

export function ResultsDashboard({ request, initialWeights, onStartOver }: ResultsDashboardProps) {
  // Resolve coordinates (stored or geocoded), then pull real OpenStreetMap
  // nearby-place signals for each located stay. Scores start from the mock
  // engine and refine in place once the live data lands.
  const { locations } = useGeocodedStays(request.stays);
  const {
    intelligence,
    errors: nearbyErrors,
    loading: nearbyLoading,
  } = useNearbyPlaces(locations, request.travelerType);
  const {
    airports,
    errors: airportErrors,
    loading: airportsLoading,
  } = useAirportIntelligence(locations);

  const [weights, setWeights] = useState<ScoreWeights>(
    () => initialWeights ?? TRAVELER_DEFAULT_WEIGHTS[request.travelerType]
  );

  const result = useMemo(
    () => scoreComparison(request, intelligence, airports, weights),
    [request, intelligence, airports, weights]
  );
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
        <div className="flex flex-wrap items-center gap-2">
          <SaveComparisonButton
            request={request}
            weights={weights}
            winnerName={result.bestOverall.stay.name}
          />
          <ShareComparisonButton
            state={{
              travelerType: request.travelerType,
              stays: request.stays,
              weights,
            }}
          />
          <ExportReportButton result={result} weights={weights} />
          <Button variant="outline" size="sm" onClick={onStartOver}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>

      <PreferencePanel
        weights={weights}
        onWeightsChange={setWeights}
        onReset={() =>
          setWeights(TRAVELER_DEFAULT_WEIGHTS[request.travelerType])
        }
      />

      <TravelDecisionBrief result={result} weights={weights} />

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

      <RecommendationPanel result={result} airports={airports} />

      <RankingTable scoredStays={result.scoredStays} />

      <StayMap scoredStays={result.scoredStays} airports={airports} />

      <NearbyIntelligence
        scoredStays={result.scoredStays}
        errors={nearbyErrors}
        loading={nearbyLoading}
      />

      <AirportIntelligence
        scoredStays={result.scoredStays}
        airports={airports}
        errors={airportErrors}
        loading={airportsLoading}
      />

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

      <ExplainableScoreBreakdown scoredStays={result.scoredStays} />

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
