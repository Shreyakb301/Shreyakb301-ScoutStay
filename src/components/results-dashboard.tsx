"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";

import { BriefingSection, StatusTag } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import { AirportIntelligence, bestAirportStay } from "@/components/airport-intelligence";
import { CategoryChart } from "@/components/category-chart";
import { ExplainableScoreBreakdown } from "@/components/explainable-score-breakdown";
import { ExportReportButton } from "@/components/export-report-button";
import { ListingScoreCard } from "@/components/listing-score-card";
import { NearbyIntelligence } from "@/components/nearby-intelligence";
import { PreferencePanel } from "@/components/preference-panel";
import { ProsConsCard } from "@/components/pros-cons-card";
import { RankingTable } from "@/components/ranking-table";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { RiskAssessment } from "@/components/risk-assessment";
import { SaveComparisonButton } from "@/components/save-comparison-button";
import { ScoreCard } from "@/components/score-card";
import { ShareComparisonButton } from "@/components/share-comparison-button";
import { TravelDecisionBrief } from "@/components/travel-decision-brief";
import { VerdictBadge } from "@/components/verdict-badge";
import { useAirportIntelligence } from "@/hooks/use-airport-intelligence";
import { useGeocodedStays } from "@/hooks/use-geocoded-stays";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";

// Leaflet touches `window` at import time and adds weight; load it only
// once the dashboard is shown, and never on the server.
const StayMap = dynamic(
  () => import("@/components/stay-map").then((module) => module.StayMap),
  {
    ssr: false,
    loading: () => <div className="h-96 w-full animate-pulse bg-muted" />,
  }
);
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

/** A stable-ish document reference for the briefing header. */
function buildReference(request: ComparisonRequest): string {
  const date = new Date();
  const stamp =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;
  return `SCT/${stamp}/${String(request.stays.length).padStart(2, "0")}`;
}

export function ResultsDashboard({
  request,
  initialWeights,
  onStartOver,
}: ResultsDashboardProps) {
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

  const reference = useMemo(() => buildReference(request), [request]);

  const winner = result.bestOverall;
  const alternatives = result.scoredStays.filter(
    (entry) => entry.stay.id !== winner.stay.id
  );
  const bestConnected = bestAirportStay(result.scoredStays, airports);
  const bestIata = bestConnected
    ? airports[bestConnected.stay.id]?.airport.iata
    : undefined;

  return (
    <div className="flex flex-col gap-10">
      {/* ─── COVER: TRAVEL BRIEFING ─────────────────────────────── */}
      <header className="flex flex-col gap-5 border-b-4 border-foreground pb-6">
        <div className="flex items-center justify-end">
          <span className="data text-xs text-muted-foreground">
            REF {reference}
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Travel briefing
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SaveComparisonButton
              request={request}
              weights={weights}
              winnerName={winner.stay.name}
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
              New briefing
            </Button>
          </div>
        </div>
      </header>

      {/* Mission parameters (priority weighting) */}
      <PreferencePanel
        weights={weights}
        onWeightsChange={setWeights}
        onReset={() =>
          setWeights(TRAVELER_DEFAULT_WEIGHTS[request.travelerType])
        }
      />

      {/* ─── 01 EXECUTIVE SUMMARY ───────────────────────────────── */}
      <BriefingSection
        code="01"
        title="Executive summary"
        meta={<VerdictBadge verdict={winner.verdict} />}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <ScoreCard
              label="Best overall"
              stayName={result.bestOverall.stay.name}
              score={result.bestOverall.overallScore}
              detail="Top pick for this trip"
            />
            <ScoreCard
              label="Safest"
              stayName={result.safest.stay.name}
              score={result.safest.scores.safetyScore}
              detail="Highest safety score"
            />
            <ScoreCard
              label="Best value"
              stayName={result.bestValue.stay.name}
              score={result.bestValue.scores.valueScore}
              detail="Most for your money"
            />
            <ScoreCard
              label="Highest risk"
              stayName={result.biggestRisk.stay.name}
              score={result.biggestRisk.overallScore}
              detail="Lowest overall score"
            />
          </div>
          <TravelDecisionBrief result={result} weights={weights} />
          <RankingTable scoredStays={result.scoredStays} />
        </div>
      </BriefingSection>

      {/* ─── 02 LOCATION ANALYSIS ───────────────────────────────── */}
      <BriefingSection code="02" title="Location analysis">
        <div className="flex flex-col gap-4">
          <StayMap scoredStays={result.scoredStays} airports={airports} />
          <CategoryChart scoredStays={result.scoredStays} />
        </div>
      </BriefingSection>

      {/* ─── 03 AIRPORT ACCESS ──────────────────────────────────── */}
      <BriefingSection
        code="03"
        title="Airport access"
        meta={bestIata ? `Best: ${bestIata}` : undefined}
      >
        <AirportIntelligence
          scoredStays={result.scoredStays}
          airports={airports}
          errors={airportErrors}
          loading={airportsLoading}
        />
      </BriefingSection>

      {/* ─── 04 NEIGHBORHOOD ANALYSIS ───────────────────────────── */}
      <BriefingSection code="04" title="Neighborhood analysis">
        <NearbyIntelligence
          scoredStays={result.scoredStays}
          errors={nearbyErrors}
          loading={nearbyLoading}
        />
      </BriefingSection>

      {/* ─── 05 RISK ASSESSMENT ─────────────────────────────────── */}
      <BriefingSection code="05" title="Risk assessment">
        <div className="flex flex-col gap-6">
          <RiskAssessment result={result} weights={weights} />
          <ExplainableScoreBreakdown scoredStays={result.scoredStays} />
        </div>
      </BriefingSection>

      {/* ─── 06 RECOMMENDED STAY ────────────────────────────────── */}
      <BriefingSection
        code="06"
        title="Recommended stay"
        meta={<StatusTag status="go">Primary</StatusTag>}
      >
        <div className="flex flex-col gap-4">
          <RecommendationPanel result={result} airports={airports} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ListingScoreCard entry={winner} />
            <ProsConsCard entry={winner} />
          </div>
        </div>
      </BriefingSection>

      {/* ─── 07 ALTERNATIVE OPTIONS ─────────────────────────────── */}
      <BriefingSection
        code="07"
        title="Alternative options"
        meta={`${String(alternatives.length).padStart(2, "0")} on file`}
      >
        <div className="flex flex-col gap-6">
          {alternatives.map((entry) => (
            <div key={entry.stay.id} className="grid gap-4 lg:grid-cols-2">
              <ListingScoreCard entry={entry} />
              <ProsConsCard entry={entry} />
            </div>
          ))}
        </div>
      </BriefingSection>

      <div className="flex justify-center border-t border-border pt-6 pb-4">
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="size-4" />
          Start a new briefing
        </Button>
      </div>
    </div>
  );
}
