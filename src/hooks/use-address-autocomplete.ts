"use client";

import { useEffect, useState } from "react";

import { searchAddresses, type AddressSuggestion } from "@/lib/geocode";

const MIN_QUERY_LENGTH = 3;
// Generous debounce keeps us well within Nominatim's 1 req/sec policy.
const DEBOUNCE_MS = 500;

export interface AddressAutocompleteState {
  suggestions: AddressSuggestion[];
  /** True while waiting for the debounce or the API response. */
  loading: boolean;
  /** Set when the search request failed. */
  error: string | null;
  /** True when the query is long enough for a search to run. */
  active: boolean;
}

/**
 * Debounced Nominatim address search. Fires at most one request per pause
 * in typing; results for previously seen queries come from the session
 * cache in lib/geocode.ts without any network traffic.
 */
export function useAddressAutocomplete(
  query: string
): AddressAutocompleteState {
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
          setError(
            "Address search failed. Check your connection and try again."
          );
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
