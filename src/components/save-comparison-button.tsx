"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveComparison } from "@/lib/saved-comparisons";
import type { ScoreWeights } from "@/lib/scoring";
import type { ComparisonRequest } from "@/lib/types";

type SaveState = "idle" | "saved";

export function SaveComparisonButton({
  request,
  weights,
  winnerName,
}: {
  request: ComparisonRequest;
  weights: ScoreWeights;
  winnerName: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  // Reset badge whenever the active comparison changes
  useEffect(() => {
    setSaveState("idle");
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, [request, weights]);

  const handleSave = () => {
    saveComparison(request, weights, winnerName);
    setSaveState("saved");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSaveState("idle"), 2000);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleSave}>
      {saveState === "saved" ? (
        <>
          <BookmarkCheck className="size-4 text-emerald-600" />
          Saved!
        </>
      ) : (
        <>
          <Bookmark className="size-4" />
          Save comparison
        </>
      )}
    </Button>
  );
}
