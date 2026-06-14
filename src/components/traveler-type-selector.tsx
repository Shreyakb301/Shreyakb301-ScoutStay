"use client";

import { cn } from "@/lib/utils";
import { TRAVELER_TYPES } from "@/lib/mock-data";
import type { TravelerTypeId } from "@/lib/types";

interface TravelerTypeSelectorProps {
  value: TravelerTypeId | null;
  onChange: (value: TravelerTypeId) => void;
}

export function TravelerTypeSelector({
  value,
  onChange,
}: TravelerTypeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Traveler type"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {TRAVELER_TYPES.map((type) => {
        const selected = value === type.id;
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type.id)}
            className={cn(
              "flex flex-col gap-3 border bg-card p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-foreground ring-1 ring-foreground"
                : "border-border hover:border-foreground/40"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "data flex h-8 min-w-12 items-center justify-center border px-1.5 text-xs font-bold tracking-wider",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground"
                )}
              >
                {type.code}
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{type.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {type.priorities.map((priority) => (
                <span
                  key={priority}
                  className="eyebrow border border-border px-1.5 py-0.5"
                >
                  {priority}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
