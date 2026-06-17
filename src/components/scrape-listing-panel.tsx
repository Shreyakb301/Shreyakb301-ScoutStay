"use client";

import { useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { Panel } from "@/components/briefing";
import { ScrapedListingReview } from "@/components/scraped-listing-review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyNormalizedListing,
  isValidAirbnbUrl,
} from "@/lib/listing-normalizer";
import type { NormalizedListing, ScrapeResult } from "@/lib/scrape-types";
import type { StayListing } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "error" | "review";

export function ScrapeListingPanel({
  onAdd,
  disabled,
  checkIn,
  checkOut,
  adults,
}: {
  onAdd: (stay: StayListing) => void;
  /** True when the comparison is already full. */
  disabled?: boolean;
  /** Trip dates + guests from the intake, used for live pricing. */
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<NormalizedListing | null>(null);

  const urlValid = isValidAirbnbUrl(url);

  const reset = () => {
    setStatus("idle");
    setError(null);
    setListing(null);
    setUrl("");
  };

  const runImport = async () => {
    if (!urlValid || disabled) return;
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/scrape-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, checkIn, checkOut, adults }),
      });
      const result: ScrapeResult = await response.json();
      if (result.ok) {
        setListing(result.listing);
        setStatus("review");
      } else {
        setError(result.error);
        setStatus("error");
      }
    } catch {
      setError("Couldn't reach the scraper. Check your connection.");
      setStatus("error");
    }
  };

  const enterManually = () => {
    setListing(emptyNormalizedListing(url.trim()));
    setStatus("review");
  };

  if (status === "review" && listing) {
    return (
      <ScrapedListingReview
        listing={listing}
        onConfirm={(stay) => {
          onAdd(stay);
          reset();
        }}
        onCancel={reset}
      />
    );
  }

  return (
    <Panel title="Import from Airbnb" bodyClassName="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Paste an Airbnb listing link and we&apos;ll pull the details
        automatically. Nothing is stored, and the scrape runs server-side.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scrape-url">Airbnb listing link</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              id="scrape-url"
              type="url"
              inputMode="url"
              placeholder="https://www.airbnb.com/rooms/12345678"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runImport();
                }
              }}
              aria-invalid={url.length > 0 && !urlValid}
              className={cn("pr-9", urlValid && "border-go")}
              disabled={status === "loading" || disabled}
            />
            {urlValid && (
              <Check className="pointer-events-none absolute inset-y-0 right-2 my-auto size-4 text-go" />
            )}
          </div>
          <Button
            type="button"
            onClick={runImport}
            disabled={!urlValid || status === "loading" || disabled}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing
              </>
            ) : (
              "Import listing"
            )}
          </Button>
        </div>
        {url.length > 0 && !urlValid && (
          <p className="text-xs text-destructive">
            That doesn&apos;t look like a valid Airbnb listing link.
          </p>
        )}
      </div>

      {status === "error" && (
        <div className="flex flex-col gap-2 border-l-2 border-destructive pl-3">
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <TriangleAlert className="size-4" />
            {error}
          </p>
          <p className="text-sm text-muted-foreground">
            Airbnb pages change often and scraping is best-effort. You can add
            the listing manually and fill in the details yourself.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={enterManually}
          >
            Enter details manually
          </Button>
        </div>
      )}
    </Panel>
  );
}
