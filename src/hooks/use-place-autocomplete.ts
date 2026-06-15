"use client";

import { useEffect, useState } from "react";

import { searchAddresses, type AddressSuggestion } from "@/lib/geocode";

const MIN_QUERY_LENGTH = 3;
// Generous debounce keeps us within Nominatim's 1 req/sec usage policy.
const DEBOUNCE_MS = 450;

export interface PlaceAutocompleteState {
  suggestions: AddressSuggestion[];
  /** True while waiting on the debounce or the network request. */
  loading: boolean;
  /** Set when the lookup failed. */
  error: string | null;
  /** True once the query is long enough to search. */
  active: boolean;
}

/**
 * Debounced Nominatim place search. Fires at most one request per typing
 * pause; repeat queries are served from the session cache in lib/geocode.ts
 * with no network traffic.
 */
export function usePlaceAutocomplete(query: string): PlaceAutocompleteState {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      searchAddresses(trimmed)
        .then((results) => {
          if (cancelled) return;
          setSuggestions(results);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setSuggestions([]);
          setError("Place search failed. Check your connection and retry.");
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, active]);

  return { suggestions, loading, error, active };
}
