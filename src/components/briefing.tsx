import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared chrome for the briefing system. These are deliberately plain,
 * document-like building blocks — ruled headers, flat panels, monospace
 * data fields — used across every section so the whole report reads like a
 * single operations dossier rather than a deck of dashboard cards.
 */

/** A numbered, ruled section header: "SECTION 03 — AIRPORT ACCESS". */
export function BriefingSection({
  code,
  title,
  meta,
  children,
  className,
}: {
  /** Two-digit section index, e.g. "03". */
  code: string;
  title: string;
  /** Optional right-aligned status/caption line. */
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("scroll-mt-20", className)}>
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
        <div className="flex items-baseline gap-3">
          <span className="data text-xs font-semibold text-signal">
            {code}
          </span>
          <h2 className="text-lg font-bold uppercase tracking-[0.12em] sm:text-xl">
            {title}
          </h2>
        </div>
        {meta ? <div className="eyebrow shrink-0 pb-0.5">{meta}</div> : null}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

/** A flat document sheet with an optional ruled title bar. */
export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
  titleClassName = "eyebrow text-foreground",
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Override the title styling — e.g. for panels titled with a stay name. */
  titleClassName?: string;
}) {
  return (
    <div className={cn("panel", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className={cn("min-w-0", titleClassName)}>{title}</div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}

/** A label/value pair in the data-strip style. */
export function DataField({
  label,
  value,
  emphasis = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-l-2 border-border pl-3",
        className
      )}
    >
      <span className="eyebrow">{label}</span>
      <span
        className={cn(
          "data leading-none",
          emphasis ? "text-2xl font-bold" : "text-base font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

type Status = "go" | "caution" | "nogo" | "neutral";

const STATUS_CLASSES: Record<Status, string> = {
  go: "border-go/40 text-go",
  caution: "border-caution/50 text-caution",
  nogo: "border-nogo/40 text-nogo",
  neutral: "border-border text-muted-foreground",
};

const STATUS_FILL: Record<Status, string> = {
  go: "bg-go",
  caution: "bg-caution",
  nogo: "bg-nogo",
  neutral: "bg-muted-foreground",
};

/** A square-cornered status tag with a leading signal block. */
export function StatusTag({
  status,
  children,
  className,
}: {
  status: Status;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border bg-background px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em]",
        STATUS_CLASSES[status],
        className
      )}
    >
      <span className={cn("size-1.5", STATUS_FILL[status])} aria-hidden />
      {children}
    </span>
  );
}

/** Maps a 0–100 score to an operational status band. */
export function scoreStatus(score: number): Status {
  if (score >= 85) return "go";
  if (score >= 70) return "caution";
  return "nogo";
}
