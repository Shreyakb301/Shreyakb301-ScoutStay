"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResultsDashboard } from "@/components/results-dashboard";
import { SavedComparisonsList } from "@/components/saved-comparisons-list";
import { StayListingFields } from "@/components/stay-listing-fields";
import { TripIntakeFlow } from "@/components/trip-intake-flow";
import { SAMPLE_STAYS } from "@/lib/mock-data";
import type { ScoreWeights } from "@/lib/scoring";
import {
  readSharedComparison,
  toComparisonRequest,
} from "@/lib/share-comparison";
import {
  createSampleTripContext,
  deriveWeightsFromContext,
  summarizeTripContext,
  tripGroupToTravelerType,
  type TripContext,
} from "@/lib/trip-intake";
import {
  MAX_STAYS,
  MIN_STAYS,
  type ComparisonRequest,
  type StayListing,
} from "@/lib/types";

function createEmptyStay(): StayListing {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    platform: "airbnb",
    pricePerNight: "",
    address: "",
    notes: "",
  };
}

export function CompareForm() {
  const [phase, setPhase] = useState<"intake" | "stays">("intake");
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [stays, setStays] = useState<StayListing[]>(() => [
    createEmptyStay(),
    createEmptyStay(),
  ]);
  const [submitted, setSubmitted] = useState<ComparisonRequest | null>(null);
  const [loadedWeights, setLoadedWeights] = useState<ScoreWeights | null>(null);
  const [restoring, setRestoring] = useState(false);

  const updateStay = (
    id: string,
    patch: Partial<Omit<StayListing, "id">>
  ) => {
    setStays((prev) =>
      prev.map((stay) => (stay.id === id ? { ...stay, ...patch } : stay))
    );
  };

  const addStay = () => {
    setStays((prev) =>
      prev.length < MAX_STAYS ? [...prev, createEmptyStay()] : prev
    );
  };

  const removeStay = (id: string) => {
    setStays((prev) =>
      prev.length > MIN_STAYS ? prev.filter((stay) => stay.id !== id) : prev
    );
  };

  // Fill every stay in the manifest with a realistic sample listing (cycling
  // the sample set by position) so users can populate it without typing.
  const generateAllStays = () => {
    setStays((prev) =>
      prev.map((stay, index) => ({
        ...SAMPLE_STAYS[index % SAMPLE_STAYS.length],
        id: stay.id,
      }))
    );
  };

  const handleLoad = (request: ComparisonRequest, weights: ScoreWeights) => {
    setStays(request.stays);
    setLoadedWeights(weights);
    setSubmitted(request);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Restore a shared comparison from ?data=… on first mount. Decoding is
  // async (gzip); malformed tokens resolve to null and leave the flow alone.
  useEffect(() => {
    if (!window.location.search.includes("data=")) return;
    let active = true;
    setRestoring(true);
    readSharedComparison(window.location.search)
      .then((shared) => {
        if (!active) return;
        if (shared) {
          setStays(shared.stays);
          setLoadedWeights(shared.weights);
          setSubmitted(toComparisonRequest(shared));
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleIntakeComplete = (context: TripContext) => {
    setTripContext(context);
    setPhase("stays");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useSampleTrip = () => {
    const context = createSampleTripContext();
    const sampleStays = SAMPLE_STAYS.map((sample) => ({
      ...sample,
      id: crypto.randomUUID(),
    }));
    setTripContext(context);
    setStays(sampleStays);
    setLoadedWeights(deriveWeightsFromContext(context));
    setSubmitted({
      travelerType: tripGroupToTravelerType(context.travelGroup),
      stays: sampleStays,
      tripContext: context,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tripContext) return;
    setLoadedWeights(deriveWeightsFromContext(tripContext));
    setSubmitted({
      travelerType: tripGroupToTravelerType(tripContext.travelGroup),
      stays,
      tripContext,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <ResultsDashboard
        request={submitted}
        initialWeights={loadedWeights ?? undefined}
        onStartOver={() => {
          setSubmitted(null);
          setLoadedWeights(null);
          setTripContext(null);
          setPhase("intake");
        }}
      />
    );
  }

  if (restoring) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-2/3 animate-pulse bg-muted" />
        <div className="h-40 w-full animate-pulse bg-muted" />
        <p className="eyebrow text-center">Loading shared briefing…</p>
      </div>
    );
  }

  if (phase === "intake") {
    return (
      <div className="flex flex-col gap-8">
        <SavedComparisonsList onLoad={handleLoad} />
        <TripIntakeFlow
          initialContext={tripContext ?? undefined}
          onComplete={handleIntakeComplete}
          onUseSample={useSampleTrip}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Captured trip context */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
          <div className="flex items-baseline gap-3">
            <span className="data text-xs font-semibold text-signal">01</span>
            <h2 className="text-lg font-bold uppercase tracking-[0.12em]">
              Trip context
            </h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPhase("intake")}
          >
            <Pencil className="size-4" />
            Edit trip context
          </Button>
        </div>
        {tripContext && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {summarizeTripContext(tripContext).map((item) => (
              <div key={item.label} className="border-l-2 border-border pl-3">
                <dt className="eyebrow">{item.label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Stay manifest */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
          <div className="flex items-baseline gap-3">
            <span className="data text-xs font-semibold text-signal">02</span>
            <h2 className="text-lg font-bold uppercase tracking-[0.12em]">
              Stay manifest
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateAllStays}
            >
              <Sparkles className="size-4" />
              Generate details
            </Button>
            <span className="eyebrow pb-0.5">
              {stays.length}/{MAX_STAYS}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Add between {MIN_STAYS} and {MAX_STAYS} listings you&apos;re deciding
          between.
        </p>

        <div className="flex flex-col gap-4">
          {stays.map((stay, index) => (
            <StayListingFields
              key={stay.id}
              index={index}
              stay={stay}
              onChange={updateStay}
              onRemove={removeStay}
              canRemove={stays.length > MIN_STAYS}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addStay}
          disabled={stays.length >= MAX_STAYS}
          className="self-start"
        >
          <Plus className="size-4" />
          Add another stay ({stays.length}/{MAX_STAYS})
        </Button>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-foreground pt-6">
        <Button type="submit" size="lg">
          Generate briefing
        </Button>
      </section>
    </form>
  );
}
