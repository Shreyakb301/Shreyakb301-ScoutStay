"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
          <Card
            key={type.id}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onChange(type.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange(type.id);
              }
            }}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary/50",
              selected && "border-primary ring-1 ring-primary"
            )}
          >
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-2xl">
                  {type.icon}
                </span>
                <div>
                  <p className="font-medium leading-tight">{type.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {type.priorities.map((priority) => (
                  <Badge
                    key={priority}
                    variant={selected ? "default" : "secondary"}
                    className="text-xs font-normal"
                  >
                    {priority}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
