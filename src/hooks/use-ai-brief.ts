"use client";

import { useEffect, useMemo, useState } from "react";

import { buildBriefInput } from "@/lib/ai-brief";
import type { ComparisonResult, ScoreWeights } from "@/lib/scoring";
import type { UserTripProfile } from "@/lib/types";

export type AiBriefSource = "openai" | "gated";

export interface AiBriefState {
  text: string | null;
  source: AiBriefSource | null;
  loading: boolean;
  /** True when the API failed — the caller should fall back to the deterministic brief. */
  error: boolean;
}

// Module-level cache so identical comparisons don't re-hit the model.
const cache = new Map<string, { text: string; source: AiBriefSource }>();

/**
 * Generates the AI decision brief for a comparison. Builds the structured
 * input client-side, posts it to /api/ai-brief, and returns loading / text /
 * error so the UI can show a spinner, the brief, or a deterministic fallback.
 */
export function useAiBrief(
  result: ComparisonResult,
  weights: ScoreWeights,
  profile?: UserTripProfile
): AiBriefState {
  const signature = useMemo(
    () => JSON.stringify(buildBriefInput(result, weights, profile)),
    [result, weights, profile]
  );

  const [state, setState] = useState<AiBriefState>(() => {
    const hit = cache.get(signature);
    return hit
      ? { text: hit.text, source: hit.source, loading: false, error: false }
      : { text: null, source: null, loading: true, error: false };
  });

  useEffect(() => {
    const hit = cache.get(signature);
    if (hit) {
      setState({ text: hit.text, source: hit.source, loading: false, error: false });
      return;
    }

    let active = true;
    setState({ text: null, source: null, loading: true, error: false });

    fetch("/api/ai-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: JSON.parse(signature) }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (data && data.ok && typeof data.text === "string") {
          const entry = { text: data.text, source: data.source as AiBriefSource };
          cache.set(signature, entry);
          setState({ ...entry, loading: false, error: false });
        } else {
          setState({ text: null, source: null, loading: false, error: true });
        }
      })
      .catch(() => {
        if (active) {
          setState({ text: null, source: null, loading: false, error: true });
        }
      });

    return () => {
      active = false;
    };
  }, [signature]);

  return state;
}
