"use client";

import { useEffect, useState } from "react";

import { geocodeAddress, type LngLat } from "@/lib/geocode";
import type { StayListing } from "@/lib/types";

export interface GeocodedStays {
  /** Resolved coordinates keyed by stay id. */
  locations: Record<string, LngLat>;
  /** Human-readable failure reason keyed by stay id. */
  errors: Record<string, string>;
  /** True while any address is still being geocoded. */
  loading: boolean;
}

/**
 * Resolves coordinates for every stay that has an address. Stays that
 * already carry latitude/longitude (from an autocomplete selection) are
 * used as-is with no API call; the rest are geocoded via Nominatim, with
 * lookups cached per session (see lib/geocode.ts) so the same address is
 * never re-fetched.
 */
export function useGeocodedStays(stays: StayListing[]): GeocodedStays {
  const [locations, setLocations] = useState<Record<string, LngLat>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored: Record<string, LngLat> = {};
    const needsGeocoding: StayListing[] = [];
    for (const stay of stays) {
      if (
        typeof stay.latitude === "number" &&
        typeof stay.longitude === "number"
      ) {
        stored[stay.id] = { lng: stay.longitude, lat: stay.latitude };
      } else if (stay.address?.trim()) {
        needsGeocoding.push(stay);
      }
    }

    if (needsGeocoding.length === 0) {
      setLocations(stored);
      setErrors({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolveAll = async () => {
      const nextLocations: Record<string, LngLat> = { ...stored };
      const nextErrors: Record<string, string> = {};

      await Promise.all(
        needsGeocoding.map(async (stay) => {
          try {
            const result = await geocodeAddress(stay.address ?? "");
            if (result) nextLocations[stay.id] = result;
            else nextErrors[stay.id] = "Address not found";
          } catch {
            nextErrors[stay.id] = "Geocoding request failed";
          }
        })
      );

      if (!cancelled) {
        setLocations(nextLocations);
        setErrors(nextErrors);
        setLoading(false);
      }
    };

    void resolveAll();

    return () => {
      cancelled = true;
    };
  }, [stays]);

  return { locations, errors, loading };
}
