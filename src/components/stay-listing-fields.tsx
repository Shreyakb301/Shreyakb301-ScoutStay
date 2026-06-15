"use client";

import { Check, Trash2 } from "lucide-react";

import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACILITIES, FACILITY_GROUPS } from "@/lib/facilities";
import { PLATFORM_OPTIONS } from "@/lib/mock-data";
import type { FacilityId, Platform, StayListing } from "@/lib/types";
import { cn } from "@/lib/utils";

function FacilityPicker({
  selected,
  onToggle,
}: {
  selected: FacilityId[];
  onToggle: (id: FacilityId) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="flex flex-col gap-4">
      {FACILITY_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <span className="eyebrow">{group}</span>
          <div className="flex flex-wrap gap-2">
            {FACILITIES.filter((facility) => facility.group === group).map(
              (facility) => {
                const active = set.has(facility.id);
                return (
                  <button
                    key={facility.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(facility.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/40"
                    )}
                  >
                    {active && <Check className="size-3.5" />}
                    {facility.label}
                  </button>
                );
              }
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface StayListingFieldsProps {
  index: number;
  stay: StayListing;
  onChange: (id: string, patch: Partial<Omit<StayListing, "id">>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

type NumericField =
  | "bedrooms"
  | "beds"
  | "bathrooms"
  | "maxGuests"
  | "rating"
  | "reviewCount"
  | "squareFeet";

const NUMERIC_FIELDS: { field: NumericField; label: string; step: string }[] = [
  { field: "bedrooms", label: "Bedrooms", step: "1" },
  { field: "beds", label: "Beds", step: "1" },
  { field: "bathrooms", label: "Bathrooms", step: "1" },
  { field: "maxGuests", label: "Max guests", step: "1" },
  { field: "rating", label: "Rating (0-5)", step: "0.1" },
  { field: "reviewCount", label: "Reviews", step: "1" },
  { field: "squareFeet", label: "Sq ft", step: "1" },
];

export function StayListingFields({
  index,
  stay,
  onChange,
  onRemove,
  canRemove,
}: StayListingFieldsProps) {
  const toggleFacility = (id: FacilityId) => {
    const current = stay.facilities ?? [];
    const next = current.includes(id)
      ? current.filter((facility) => facility !== id)
      : [...current, id];
    onChange(stay.id, { facilities: next });
  };

  const setNumber = (field: NumericField, raw: string) =>
    onChange(stay.id, {
      [field]: raw === "" ? undefined : Number(raw),
    } as Partial<Omit<StayListing, "id">>);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between border-b border-border pb-3">
        <CardTitle className="data text-sm uppercase tracking-[0.12em]">
          Stay {String(index + 1).padStart(2, "0")}
        </CardTitle>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove stay ${index + 1}`}
            onClick={() => onRemove(stay.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-name`}>Nickname</Label>
          <Input
            id={`stay-${stay.id}-name`}
            placeholder="e.g. Sunny loft near Old Town"
            value={stay.name}
            onChange={(event) =>
              onChange(stay.id, { name: event.target.value })
            }
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-url`}>Listing URL</Label>
          <Input
            id={`stay-${stay.id}-url`}
            type="url"
            placeholder="https://..."
            value={stay.url}
            onChange={(event) => onChange(stay.id, { url: event.target.value })}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-platform`}>Platform</Label>
          <Select
            value={stay.platform}
            onValueChange={(value) =>
              onChange(stay.id, { platform: value as Platform })
            }
          >
            <SelectTrigger id={`stay-${stay.id}-platform`} className="w-full">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-price`}>Price per night (USD)</Label>
          <Input
            id={`stay-${stay.id}-price`}
            type="number"
            min="0"
            step="1"
            placeholder="150"
            value={stay.pricePerNight}
            onChange={(event) =>
              onChange(stay.id, { pricePerNight: event.target.value })
            }
            required
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`stay-${stay.id}-address`}>
            Address{" "}
            <span className="font-normal text-muted-foreground">
              (optional, places the stay on the map)
            </span>
          </Label>
          <AddressAutocomplete
            id={`stay-${stay.id}-address`}
            placeholder="Start typing an address…"
            value={stay.address ?? ""}
            hasSelection={
              typeof stay.latitude === "number" &&
              typeof stay.longitude === "number"
            }
            selectionCaption={[stay.city, stay.region]
              .filter(Boolean)
              .join(", ")}
            onInputChange={(text) =>
              onChange(stay.id, {
                address: text,
                latitude: undefined,
                longitude: undefined,
                placeName: undefined,
                city: undefined,
                region: undefined,
              })
            }
            onSelect={(suggestion) =>
              onChange(stay.id, {
                address: suggestion.formattedAddress,
                latitude: suggestion.latitude,
                longitude: suggestion.longitude,
                placeName: suggestion.placeName,
                city: suggestion.city,
                region: suggestion.region,
              })
            }
            onClear={() =>
              onChange(stay.id, {
                address: "",
                latitude: undefined,
                longitude: undefined,
                placeName: undefined,
                city: undefined,
                region: undefined,
              })
            }
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`stay-${stay.id}-notes`}>
            Notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional, location details, review snippets, amenities)
            </span>
          </Label>
          <Textarea
            id={`stay-${stay.id}-notes`}
            placeholder="e.g. Two blocks from the metro, reviews mention street noise on weekends..."
            value={stay.notes ?? ""}
            onChange={(event) =>
              onChange(stay.id, { notes: event.target.value })
            }
            rows={2}
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label>
            Facilities{" "}
            <span className="font-normal text-muted-foreground">
              (optional, what this stay includes)
            </span>
          </Label>
          <FacilityPicker
            selected={stay.facilities ?? []}
            onToggle={toggleFacility}
          />
        </div>

        {/* Evidence sources for the RAG stay-match engine. */}
        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:col-span-2">
          <span className="eyebrow">
            Listing evidence (optional, powers the evidence match)
          </span>

          <div className="grid gap-2">
            <Label htmlFor={`stay-${stay.id}-desc`}>Listing description</Label>
            <Textarea
              id={`stay-${stay.id}-desc`}
              placeholder="Paste the 'about this space' text…"
              value={stay.listingDescription ?? ""}
              onChange={(event) =>
                onChange(stay.id, { listingDescription: event.target.value })
              }
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`stay-${stay.id}-reviews`}>Reviews</Label>
            <Textarea
              id={`stay-${stay.id}-reviews`}
              placeholder="Paste a few guest reviews…"
              value={stay.reviewText ?? ""}
              onChange={(event) =>
                onChange(stay.id, { reviewText: event.target.value })
              }
              rows={2}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`stay-${stay.id}-rules`}>House rules</Label>
              <Textarea
                id={`stay-${stay.id}-rules`}
                placeholder="e.g. No parties, no pets, quiet hours after 10pm…"
                value={stay.houseRulesText ?? ""}
                onChange={(event) =>
                  onChange(stay.id, { houseRulesText: event.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`stay-${stay.id}-amenities`}>
                Amenities blurb
              </Label>
              <Textarea
                id={`stay-${stay.id}-amenities`}
                placeholder="Any extra amenity notes from the listing…"
                value={stay.amenitiesText ?? ""}
                onChange={(event) =>
                  onChange(stay.id, { amenitiesText: event.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NUMERIC_FIELDS.map(({ field, label, step }) => (
              <div key={field} className="grid gap-1.5">
                <Label
                  htmlFor={`stay-${stay.id}-${field}`}
                  className="text-xs"
                >
                  {label}
                </Label>
                <Input
                  id={`stay-${stay.id}-${field}`}
                  type="number"
                  min="0"
                  step={step}
                  value={stay[field] ?? ""}
                  onChange={(event) => setNumber(field, event.target.value)}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
