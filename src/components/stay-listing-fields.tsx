"use client";

import { Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StayListing } from "@/lib/types";
import { cn } from "@/lib/utils";

type UrlStatus = "empty" | "valid" | "invalid";

/**
 * Validates that a string is a well-formed Airbnb listing link. A true
 * "does this page exist" check isn't possible from the browser — Airbnb
 * blocks cross-origin requests — so we validate the URL shape instead.
 */
function airbnbUrlStatus(value: string): UrlStatus {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "invalid";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "invalid";
  const host = url.hostname.toLowerCase();
  if (host === "abnb.me") return "valid"; // official short links
  const isAirbnb = /(^|\.)airbnb\.[a-z.]+$/.test(host);
  if (!isAirbnb) return "invalid";
  if (!/\/rooms\/\d+/.test(url.pathname)) return "invalid";
  return "valid";
}

/** Derive a readable stay name from a valid Airbnb listing link. */
function deriveNameFromUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    const match = url.pathname.match(/\/rooms\/(\d+)/);
    if (match) return `Airbnb listing ${match[1]}`;
  } catch {
    // ignore
  }
  return "";
}

interface StayListingFieldsProps {
  index: number;
  stay: StayListing;
  onChange: (id: string, patch: Partial<Omit<StayListing, "id">>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function StayListingFields({
  index,
  stay,
  onChange,
  onRemove,
  canRemove,
}: StayListingFieldsProps) {
  const urlStatus = airbnbUrlStatus(stay.url);

  const handleUrlChange = (value: string) => {
    const patch: Partial<Omit<StayListing, "id">> = {
      url: value,
      platform: "airbnb",
    };
    const name = deriveNameFromUrl(value);
    if (name) patch.name = name;
    onChange(stay.id, patch);
  };

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
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`stay-${stay.id}-url`}>Airbnb listing link</Label>
          <div className="relative">
            <Input
              id={`stay-${stay.id}-url`}
              type="url"
              inputMode="url"
              placeholder="https://www.airbnb.com/rooms/12345678"
              value={stay.url}
              onChange={(event) => handleUrlChange(event.target.value)}
              aria-invalid={urlStatus === "invalid"}
              className={cn(
                "pr-9",
                urlStatus === "valid" &&
                  "border-go focus-visible:border-go focus-visible:ring-go/30"
              )}
              required
            />
            {urlStatus === "valid" && (
              <Check className="pointer-events-none absolute inset-y-0 right-2 my-auto size-4 text-go" />
            )}
          </div>
          {urlStatus === "invalid" && (
            <p className="text-xs text-destructive">
              That doesn&apos;t look like a valid Airbnb listing link (e.g.
              airbnb.com/rooms/12345678).
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-price`}>
            Price per night (USD){" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
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
          />
        </div>
      </CardContent>
    </Card>
  );
}
