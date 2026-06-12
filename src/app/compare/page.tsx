import type { Metadata } from "next";

import { CompareForm } from "@/components/compare-form";

export const metadata: Metadata = {
  title: "Compare stays",
};

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Set up your comparison
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your trip, then add the stays you&apos;re torn
          between.
        </p>
      </div>
      <CompareForm />
    </div>
  );
}
