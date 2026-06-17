"use client";

import { useMemo, useState } from "react";

import { Panel, StatusTag } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facilityLabel } from "@/lib/facilities";
import { normalizedToStayListing } from "@/lib/listing-normalizer";
import type { Confidence, NormalizedListing } from "@/lib/scrape-types";
import type { StayListing } from "@/lib/types";

const CONFIDENCE_STATUS: Record<Confidence, "go" | "caution" | "neutral"> = {
  high: "go",
  medium: "caution",
  low: "neutral",
};

function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  return <StatusTag status={CONFIDENCE_STATUS[confidence]}>{confidence}</StatusTag>;
}

function FieldRow({
  label,
  confidence,
  children,
}: {
  label: string;
  confidence: Confidence;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="eyebrow">{label}</Label>
        <ConfidenceTag confidence={confidence} />
      </div>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence: Confidence;
}) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-border pl-3">
      <span className="eyebrow flex items-center gap-1.5">
        {label}
        <ConfidenceTag confidence={confidence} />
      </span>
      <span className="data text-base font-semibold">{value}</span>
    </div>
  );
}

export function ScrapedListingReview({
  listing,
  onConfirm,
  onCancel,
}: {
  listing: NormalizedListing;
  onConfirm: (stay: StayListing) => void;
  onCancel: () => void;
}) {
  const draft = useMemo(
    () => normalizedToStayListing(listing, crypto.randomUUID()),
    [listing]
  );

  const [name, setName] = useState(draft.name);
  const [price, setPrice] = useState(draft.pricePerNight);
  const [address, setAddress] = useState(draft.address ?? "");

  const facilities = listing.facilities.value;

  const confirm = () => {
    onConfirm({
      ...draft,
      name: name.trim() || "Airbnb listing",
      pricePerNight: price.trim(),
      address: address.trim() || undefined,
    });
  };

  const numeric = (value: number | null) =>
    value === null ? "—" : String(value);

  return (
    <Panel
      title="Review imported listing"
      aside={
        <span className="eyebrow">{facilities.length} amenities mapped</span>
      }
      bodyClassName="flex flex-col gap-5"
    >
      {listing.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 border-l-2 border-caution pl-3">
          {listing.warnings.map((warning) => (
            <li key={warning} className="text-sm text-muted-foreground">
              {warning}
            </li>
          ))}
        </ul>
      )}

      {/* Editable core fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow label="Name" confidence={listing.name.confidence}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FieldRow>
        <FieldRow label="Price per night (USD)" confidence={listing.pricePerNight.confidence}>
          <Input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="optional"
          />
        </FieldRow>
        <FieldRow label="Address / area" confidence={listing.address.confidence}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </FieldRow>
        <FieldRow label="Coordinates" confidence={listing.latitude.confidence}>
          <Input
            readOnly
            value={
              listing.latitude.value !== null && listing.longitude.value !== null
                ? `${listing.latitude.value.toFixed(4)}, ${listing.longitude.value.toFixed(4)}`
                : "Not found"
            }
            className="text-muted-foreground"
          />
        </FieldRow>
      </div>

      {/* Read-only metrics */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-3">
        <Metric label="Bedrooms" value={numeric(listing.bedrooms.value)} confidence={listing.bedrooms.confidence} />
        <Metric label="Beds" value={numeric(listing.beds.value)} confidence={listing.beds.confidence} />
        <Metric label="Bathrooms" value={numeric(listing.bathrooms.value)} confidence={listing.bathrooms.confidence} />
        <Metric label="Max guests" value={numeric(listing.maxGuests.value)} confidence={listing.maxGuests.confidence} />
        <Metric
          label="Rating"
          value={listing.rating.value !== null ? listing.rating.value.toFixed(2) : "—"}
          confidence={listing.rating.confidence}
        />
        <Metric label="Reviews" value={numeric(listing.reviewCount.value)} confidence={listing.reviewCount.confidence} />
      </div>

      {/* Facilities */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="eyebrow flex items-center gap-1.5">
          Facilities <ConfidenceTag confidence={listing.facilities.confidence} />
        </span>
        {facilities.length === 0 ? (
          <span className="text-sm text-muted-foreground">None detected.</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {facilities.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 border border-go/40 px-2 py-1 text-xs"
              >
                <span className="size-1.5 bg-go" aria-hidden />
                {facilityLabel(id)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Evidence preview */}
      {listing.description.value && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <span className="eyebrow flex items-center gap-1.5">
            Description <ConfidenceTag confidence={listing.description.confidence} />
          </span>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {listing.description.value}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Discard
        </Button>
        <Button type="button" onClick={confirm}>
          Add to comparison
        </Button>
      </div>
    </Panel>
  );
}
