"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Panel } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TripContext } from "@/lib/trip-intake";
import {
  createDefaultUserTripProfile,
  type TripPurpose,
  type UserTripProfile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PURPOSE_OPTIONS: { value: TripPurpose; label: string }[] = [
  { value: "leisure", label: "Leisure" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family" },
  { value: "remote-work", label: "Remote work" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const NEED_TOGGLES: { key: keyof UserTripProfile; label: string }[] = [
  { key: "needsTransit", label: "Transit" },
  { key: "needsQuiet", label: "Quiet" },
  { key: "needsWorkspace", label: "Workspace" },
  { key: "needsPool", label: "Pool" },
  { key: "needsGym", label: "Gym" },
  { key: "needsParking", label: "Parking" },
  { key: "needsPetFriendly", label: "Pet friendly" },
  { key: "lateArrival", label: "Late arrival" },
];

const NUMERIC_FIELDS: {
  key: keyof UserTripProfile;
  label: string;
  step?: string;
}[] = [
  { key: "minimumBeds", label: "Min beds" },
  { key: "minimumBathrooms", label: "Min baths" },
  { key: "minimumRating", label: "Min rating", step: "0.1" },
  { key: "maxAirportTransferMinutes", label: "Max transfer (min)" },
];

/** Seed a profile from the guided-intake context, where one exists. */
export function deriveProfileFromContext(
  context: TripContext | undefined
): UserTripProfile {
  const profile = createDefaultUserTripProfile();
  if (!context) return profile;

  if (context.travelGroup === "colleagues") profile.tripPurpose = "business";
  else if (context.travelGroup === "family") profile.tripPurpose = "family";

  const groupCount: Record<string, number> = {
    solo: 1,
    couple: 2,
    family: 4,
    friends: 4,
    colleagues: 2,
  };
  if (context.travelGroup) profile.travelerCount = groupCount[context.travelGroup] ?? 2;

  profile.needsTransit =
    context.localTransport === "transit" || context.preferredArea === "transit-hub";
  profile.needsQuiet = context.preferredArea === "quiet";
  profile.needsWorkspace = context.travelGroup === "colleagues";
  profile.needsParking = context.rentalCar === "yes";
  profile.needsPetFriendly = context.pets === "yes";
  profile.plannedDestinations = context.visitPlaces.map((place) => place.name);

  return profile;
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:border-foreground/40"
      )}
    >
      {active && <Check className="size-3.5" />}
      {label}
    </button>
  );
}

function TagInput({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="h-9"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 border border-border px-2 py-1 text-sm"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="text-muted-foreground hover:text-nogo"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserTripProfileEditor({
  profile,
  onChange,
}: {
  profile: UserTripProfile;
  onChange: (profile: UserTripProfile) => void;
}) {
  const patch = (next: Partial<UserTripProfile>) =>
    onChange({ ...profile, ...next });

  return (
    <Panel title="Trip needs" bodyClassName="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Trip purpose</span>
          <Select
            value={profile.tripPurpose}
            onValueChange={(value) =>
              patch({ tripPurpose: value as TripPurpose })
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PURPOSE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Travelers</span>
          <Input
            type="number"
            min="1"
            value={profile.travelerCount || ""}
            onChange={(event) =>
              patch({ travelerCount: Number(event.target.value) || 0 })
            }
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="eyebrow">Needs</span>
        <div className="flex flex-wrap gap-2">
          {NEED_TOGGLES.map((need) => (
            <ToggleChip
              key={need.key}
              label={need.label}
              active={profile[need.key] === true}
              onClick={() => patch({ [need.key]: !profile[need.key] })}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="eyebrow">{field.label}</span>
            <Input
              type="number"
              min="0"
              step={field.step ?? "1"}
              value={(profile[field.key] as number) || ""}
              onChange={(event) =>
                patch({ [field.key]: Number(event.target.value) || 0 })
              }
              className="h-9"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <TagInput
          label="Must-haves"
          values={profile.mustHaves}
          placeholder="e.g. blackout curtains"
          onChange={(values) => patch({ mustHaves: values })}
        />
        <TagInput
          label="Deal-breakers"
          values={profile.dealBreakers}
          placeholder="e.g. street noise"
          onChange={(values) => patch({ dealBreakers: values })}
        />
        <TagInput
          label="Nice-to-haves"
          values={profile.niceToHaves}
          placeholder="e.g. balcony view"
          onChange={(values) => patch({ niceToHaves: values })}
        />
        <TagInput
          label="Planned destinations"
          values={profile.plannedDestinations}
          placeholder="e.g. city center"
          onChange={(values) => patch({ plannedDestinations: values })}
        />
      </div>
    </Panel>
  );
}
