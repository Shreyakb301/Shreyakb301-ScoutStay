"use client";

import { useEffect, useState } from "react";

import type { LngLat } from "@/lib/geocode";
import {
  calculateLocationScores,
  countNearbyPlaces,
  DEFAULT_NEARBY_RADIUS_M,
  fetchNearbyPlaces,
} from "@/lib/nearby-places";
import type { LocationIntelligence, TravelerTypeId } from "@/lib/types";

export interface NearbyPlacesState {
  /** Location intelligence keyed by stay id (only stays that resolved). */
  intelligence: Record<string, LocationIntelligence>;
  /** Failure reason keyed by stay id; other stays still resolve (partial data). */
  errors: Record<string, string>;
  /** True while any stay's nearby data is still loading. */
  loading: boolean;
}

/**
 * Fetches Overpass nearby-place data for every located stay. The lib-level
 * cache (keyed by rounded coordinates) means re-renders, resubmits, and
 * stays on the same block never trigger duplicate requests.
 */
export function useNearbyPlaces(
  locations: Record<string, LngLat>,
  travelerType: TravelerTypeId,
  radiusMeters: number = DEFAULT_NEARBY_RADIUS_M
): NearbyPlacesState {
  const [intelligence, setIntelligence] = useState<
    Record<string, LocationIntelligence>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const entries = Object.entries(locations);
    if (entries.length === 0) {
      setIntelligence({});
      setErrors({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolveAll = async () => {
      const nextIntelligence: Record<string, LocationIntelligence> = {};
      const nextErrors: Record<string, string> = {};

      await Promise.all(
        entries.map(async ([stayId, coords]) => {
          try {
            const places = await fetchNearbyPlaces(
              coords.lat,
              coords.lng,
              radiusMeters
            );
            nextIntelligence[stayId] = {
              radiusMeters,
              counts: countNearbyPlaces(places),
              scores: calculateLocationScores(places, travelerType),
              places,
            };
          } catch {
            nextErrors[stayId] = "Nearby data unavailable";
          }
        })
      );

      if (!cancelled) {
        setIntelligence(nextIntelligence);
        setErrors(nextErrors);
        setLoading(false);
      }
    };

    void resolveAll();

    return () => {
      cancelled = true;
    };
  }, [locations, travelerType, radiusMeters]);

  return { intelligence, errors, loading };
}
