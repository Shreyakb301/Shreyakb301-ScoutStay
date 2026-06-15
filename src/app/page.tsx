import Link from "next/link";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    code: "01",
    title: "Declare the mission",
    description:
      "Set the passenger profile: solo, couple, family, friends, or business. Each profile reweights the assessment.",
  },
  {
    code: "02",
    title: "File the manifest",
    description:
      "Add 2–5 shortlisted stays from Airbnb, Vrbo, Booking.com, or a hotel, with the nightly rate and address.",
  },
  {
    code: "03",
    title: "Receive the briefing",
    description:
      "Get a structured dossier: executive summary, location, airport access, neighborhood, and risk, scored and ranked.",
  },
];

const CAPABILITIES = [
  ["Location analysis", "Geospatial plot of every stay on a live map"],
  ["Airport access", "Nearest IATA, distance, and transfer-time estimates"],
  ["Neighborhood", "Live OpenStreetMap counts within 800 m of each stay"],
  ["Risk assessment", "Noise, transfer, and data-confidence flags per stay"],
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="border-b-4 border-foreground py-16 md:py-24">
        <span className="eyebrow text-foreground">
          Operational travel briefings
        </span>
        <h1 className="mt-5 max-w-4xl text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
          Brief your shortlist like a flight plan
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          You&apos;ve narrowed it to a few stays. ScoutStay assesses each one
          against the criteria that matter for your trip and returns a single,
          structured decision dossier: location, airport access, neighborhood,
          and risk.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" render={<Link href="/compare" />}>
            Start a briefing
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="#procedure" />}
          >
            Procedure
          </Button>
        </div>
      </section>

      {/* Procedure */}
      <section id="procedure" className="scroll-mt-20 py-14">
        <div className="flex items-baseline gap-3 border-b-2 border-foreground pb-2">
          <span className="data text-xs font-semibold text-signal">§</span>
          <h2 className="text-lg font-bold uppercase tracking-[0.12em]">
            Procedure
          </h2>
        </div>
        <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.code} className="flex flex-col gap-3 bg-card p-6">
              <span className="data text-3xl font-bold text-signal">
                {step.code}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-14">
        <div className="flex items-baseline gap-3 border-b-2 border-foreground pb-2">
          <span className="data text-xs font-semibold text-signal">§</span>
          <h2 className="text-lg font-bold uppercase tracking-[0.12em]">
            Intelligence sections
          </h2>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {CAPABILITIES.map(([title, body]) => (
            <div key={title} className="border-l-2 border-border pl-4">
              <dt className="eyebrow text-foreground">{title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="my-8 flex flex-col items-start gap-4 border-2 border-foreground p-8 md:p-12">
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight md:text-4xl">
          Ready to settle the debate?
        </h2>
        <p className="max-w-xl text-muted-foreground">
          No account, no setup. File your manifest and get a briefing in
          seconds.
        </p>
        <Button size="lg" render={<Link href="/compare" />}>
          Generate a briefing
        </Button>
      </section>
    </div>
  );
}
