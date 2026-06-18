"use client";

import { useEffect, useState } from "react";

import {
  getAirportIntelligence,
  withDrivingRoute,
  type AirportIntelligence,
} from "@/lib/airport-intelligence";
import type { LngLat } from "@/lib/geocode";

/** Ask the server for a real Google driving route; null on any failure. */
async function fetchDrivingRoute(
  origin: LngLat,
  airport: { latitude: number; longitude: number }
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
  try {
    const response = await fetch("/api/airport-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: airport.latitude,
        destLng: airport.longitude,
      }),
    });
    const data = await response.json();
    if (data && data.ok) {
      return {
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
      };
    }
  } catch {
    // fall through to estimate
  }
  return null;
}

export interface AirportIntelligenceState {
  /**
   * Result keyed by stay id. `null` means the lookup succeeded but no major
   * airport exists within the search radius; missing keys are stays that
   * failed or have no coordinates.
   */
  airports: Record<string, AirportIntelligence | null>;
  /** Failure reason keyed by stay id (partial failures). */
  errors: Record<string, string>;
  /** True while any stay's airport lookup is in flight. */
  loading: boolean;
}

/**
 * Finds the nearest major airport for every located stay. The lib-level
 * cache is keyed by coarsely rounded coordinates, so all stays in the same
 * metro area share a single Overpass request and re-renders never refetch.
 */
export function useAirportIntelligence(
  locations: Record<string, LngLat>
): AirportIntelligenceState {
  const [airports, setAirports] = useState<
    Record<string, AirportIntelligence | null>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const entries = Object.entries(locations);
    if (entries.length === 0) {
      setAirports({});
      setErrors({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolveAll = async () => {
      const nextAirports: Record<string, AirportIntelligence | null> = {};
      const nextErrors: Record<string, string> = {};

      await Promise.all(
        entries.map(async ([stayId, coords]) => {
          try {
            let intel = await getAirportIntelligence(coords.lat, coords.lng);
            // Upgrade the straight-line estimate to a real Google route.
            if (intel) {
              const route = await fetchDrivingRoute(coords, intel.airport);
              if (route) intel = withDrivingRoute(intel, route);
            }
            nextAirports[stayId] = intel;
          } catch {
            nextErrors[stayId] = "Airport lookup failed";
          }
        })
      );

      if (!cancelled) {
        setAirports(nextAirports);
        setErrors(nextErrors);
        setLoading(false);
      }
    };

    void resolveAll();

    return () => {
      cancelled = true;
    };
  }, [locations]);

  return { airports, errors, loading };
}
