import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TRAVELER_TYPES } from "@/lib/mock-data";

const STEPS = [
  {
    title: "Tell us who's traveling",
    description:
      "Solo, couple, family, friends, or business — each trip type has different priorities.",
  },
  {
    title: "Paste your shortlisted stays",
    description:
      "Add 2–5 listings from Airbnb, Vrbo, Booking.com, or a hotel site, with the nightly price.",
  },
  {
    title: "Get a side-by-side verdict",
    description:
      "We line your options up against the criteria that matter for your trip. (Coming soon!)",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Badge variant="secondary">Stop juggling browser tabs</Badge>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
          Compare your shortlisted stays, side by side
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          You&apos;ve narrowed it down to a few places. StayCompare lines them
          up against what actually matters for your kind of trip, so you can
          book with confidence.
        </p>
        <div className="flex gap-3">
          <Button size="lg" render={<Link href="/compare" />}>
            Compare stays
          </Button>
          <Button size="lg" variant="outline" render={<Link href="#how-it-works" />}>
            How it works
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <span className="font-mono text-sm text-muted-foreground">
                  Step {index + 1}
                </span>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Traveler types preview */}
      <section className="py-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Built for every kind of trip
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {TRAVELER_TYPES.map((type) => (
            <Badge
              key={type.id}
              variant="outline"
              className="px-4 py-2 text-sm"
            >
              <span aria-hidden className="mr-1">
                {type.icon}
              </span>
              {type.label}
            </Badge>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Ready to settle the debate?
        </h2>
        <Button size="lg" render={<Link href="/compare" />}>
          Start comparing
        </Button>
      </section>
    </div>
  );
}
