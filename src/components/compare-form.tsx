"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ResultsDashboard } from "@/components/results-dashboard";
import { SavedComparisonsList } from "@/components/saved-comparisons-list";
import { StayListingFields } from "@/components/stay-listing-fields";
import { TravelerTypeSelector } from "@/components/traveler-type-selector";
import { SAMPLE_STAYS } from "@/lib/mock-data";
import type { ScoreWeights } from "@/lib/scoring";
import {
  MAX_STAYS,
  MIN_STAYS,
  type ComparisonRequest,
  type StayListing,
  type TravelerTypeId,
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
  const [travelerType, setTravelerType] = useState<TravelerTypeId | null>(
    null
  );
  const [stays, setStays] = useState<StayListing[]>(() => [
    createEmptyStay(),
    createEmptyStay(),
  ]);
  const [submitted, setSubmitted] =
    useState<ComparisonRequest | null>(null);
  const [loadedWeights, setLoadedWeights] = useState<ScoreWeights | null>(null);

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

  const handleLoad = (request: ComparisonRequest, weights: ScoreWeights) => {
    setTravelerType(request.travelerType);
    setStays(request.stays);
    setLoadedWeights(weights);
    setSubmitted(request);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fillWithSampleData = () => {
    setTravelerType("couple");
    setStays(
      SAMPLE_STAYS.map((sample) => ({ ...sample, id: crypto.randomUUID() }))
    );
    setSubmitted(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!travelerType) return;
    setSubmitted({ travelerType, stays });
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
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SavedComparisonsList onLoad={handleLoad} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              1. Who&apos;s traveling?
            </h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll weigh the comparison toward what matters for your
              trip.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillWithSampleData}
          >
            <Sparkles className="size-4" />
            Fill with sample data
          </Button>
        </div>
        <TravelerTypeSelector
          value={travelerType}
          onChange={setTravelerType}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">2. Add your stays</h2>
          <p className="text-sm text-muted-foreground">
            Add between {MIN_STAYS} and {MAX_STAYS} listings you&apos;re
            deciding between.
          </p>
        </div>

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

      <Separator />

      <section className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={!travelerType}>
          Compare these stays
        </Button>
        {!travelerType && (
          <p className="text-center text-sm text-muted-foreground">
            Select a traveler type to continue.
          </p>
        )}
      </section>
      </form>
    </div>
  );
}
