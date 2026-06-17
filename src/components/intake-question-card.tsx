"use client";

import { X } from "lucide-react";

import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { PreferenceSlider } from "@/components/preference-slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCOMMODATION_OPTIONS,
  ARRIVAL_OPTIONS,
  IMPORTANCE_FIELDS,
  LOCAL_TRANSPORT_OPTIONS,
  PET_OPTIONS,
  PREFERRED_AREA_OPTIONS,
  RENTAL_CAR_OPTIONS,
  TRAVEL_GROUP_OPTIONS,
  YES_NO_OPTIONS,
  type IntakeOption,
  type IntakeQuestion,
  type PlaceRef,
  type TripContext,
} from "@/lib/trip-intake";
import { cn } from "@/lib/utils";

function OptionGrid<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: IntakeOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex min-h-[4.5rem] items-center gap-3 border bg-card px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-foreground ring-1 ring-foreground"
                : "border-border hover:border-foreground/40"
            )}
          >
            <span
              className={cn(
                "size-2.5 shrink-0 border-2 border-foreground",
                selected ? "bg-signal" : "bg-transparent"
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">
                {option.label}
              </span>
              {option.description && (
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlaceChip({
  place,
  onRemove,
}: {
  place: PlaceRef;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border border-border bg-card px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{place.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {place.formattedAddress}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Remove ${place.name}`}
        onClick={onRemove}
        className="shrink-0 text-muted-foreground transition-colors hover:text-nogo"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function IntakeQuestionCard({
  question,
  context,
  onChange,
}: {
  question: IntakeQuestion;
  context: TripContext;
  onChange: (patch: Partial<TripContext>) => void;
}) {
  const childrenValue =
    context.withChildren === null
      ? null
      : context.withChildren
        ? "yes"
        : "no";

  const renderInput = () => {
    switch (question.id) {
      case "accommodation":
        return (
          <OptionGrid
            options={ACCOMMODATION_OPTIONS}
            value={context.accommodation}
            onSelect={(value) => onChange({ accommodation: value })}
          />
        );
      case "arrival":
        return (
          <OptionGrid
            options={ARRIVAL_OPTIONS}
            value={context.arrivalMethod}
            onSelect={(value) =>
              onChange({
                arrivalMethod: value,
                arrivalLocation: ["airport", "train", "bus"].includes(value)
                  ? context.arrivalLocation
                  : null,
              })
            }
          />
        );
      case "arrivalLocation":
        return (
          <div data-keep-keys className="flex flex-col gap-3">
            <PlaceAutocomplete
              id="arrival-location"
              placeholder="Search airport, station, or terminal…"
              autoFocus
              onSelect={(place) => onChange({ arrivalLocation: place })}
            />
            {context.arrivalLocation && (
              <PlaceChip
                place={context.arrivalLocation}
                onRemove={() => onChange({ arrivalLocation: null })}
              />
            )}
          </div>
        );
      case "travelGroup":
        return (
          <OptionGrid
            options={TRAVEL_GROUP_OPTIONS}
            value={context.travelGroup}
            onSelect={(value) =>
              onChange({
                travelGroup: value,
                withChildren:
                  value === "family" ? context.withChildren : null,
              })
            }
          />
        );
      case "children":
        return (
          <OptionGrid
            options={YES_NO_OPTIONS}
            value={childrenValue}
            onSelect={(value) => onChange({ withChildren: value === "yes" })}
          />
        );
      case "dates":
        return (
          <div data-keep-keys className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-check-in" className="eyebrow">
                Check-in
              </Label>
              <Input
                id="trip-check-in"
                type="date"
                value={context.checkIn ?? ""}
                max={context.checkOut ?? undefined}
                onChange={(event) =>
                  onChange({ checkIn: event.target.value || null })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-check-out" className="eyebrow">
                Check-out
              </Label>
              <Input
                id="trip-check-out"
                type="date"
                value={context.checkOut ?? ""}
                min={context.checkIn ?? undefined}
                onChange={(event) =>
                  onChange({ checkOut: event.target.value || null })
                }
              />
            </div>
          </div>
        );
      case "visitPlaces":
        return (
          <div data-keep-keys className="flex flex-col gap-3">
            <PlaceAutocomplete
              id="visit-places"
              placeholder="Add a place to visit…"
              clearOnSelect
              onSelect={(place) => {
                if (context.visitPlaces.some((p) => p.id === place.id)) return;
                onChange({ visitPlaces: [...context.visitPlaces, place] });
              }}
            />
            {context.visitPlaces.length > 0 && (
              <div className="flex flex-col gap-2">
                {context.visitPlaces.map((place) => (
                  <PlaceChip
                    key={place.id}
                    place={place}
                    onRemove={() =>
                      onChange({
                        visitPlaces: context.visitPlaces.filter(
                          (p) => p.id !== place.id
                        ),
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "preferredArea":
        return (
          <OptionGrid
            options={PREFERRED_AREA_OPTIONS}
            value={context.preferredArea}
            onSelect={(value) => onChange({ preferredArea: value })}
          />
        );
      case "rentalCar":
        return (
          <OptionGrid
            options={RENTAL_CAR_OPTIONS}
            value={context.rentalCar}
            onSelect={(value) => onChange({ rentalCar: value })}
          />
        );
      case "localTransport":
        return (
          <OptionGrid
            options={LOCAL_TRANSPORT_OPTIONS}
            value={context.localTransport}
            onSelect={(value) => onChange({ localTransport: value })}
          />
        );
      case "importance":
        return (
          <div
            data-keep-keys
            className="grid gap-x-8 gap-y-4 sm:grid-cols-2"
          >
            {IMPORTANCE_FIELDS.map((field) => (
              <PreferenceSlider
                key={field.key}
                id={`importance-${field.key}`}
                label={field.label}
                value={context.importance[field.key]}
                onChange={(value) =>
                  onChange({
                    importance: {
                      ...context.importance,
                      [field.key]: value,
                    },
                  })
                }
              />
            ))}
          </div>
        );
      case "pets":
        return (
          <OptionGrid
            options={PET_OPTIONS}
            value={context.pets}
            onSelect={(value) => onChange({ pets: value })}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-signal">{question.section}</span>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {question.title}
        </h2>
        {question.helper && (
          <p className="text-sm text-muted-foreground">{question.helper}</p>
        )}
      </div>
      {renderInput()}
    </div>
  );
}
