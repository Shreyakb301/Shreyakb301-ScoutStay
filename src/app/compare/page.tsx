import type { Metadata } from "next";

import { CompareForm } from "@/components/compare-form";

export const metadata: Metadata = {
  title: "New briefing",
};

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 border-b-4 border-foreground pb-5">
        <h1 className="text-4xl font-bold uppercase tracking-tight">
          New briefing
        </h1>
        <p className="mt-2 text-muted-foreground">
          Declare the mission profile, then file the stays you&apos;re deciding
          between.
        </p>
      </div>
      <CompareForm />
    </div>
  );
}
