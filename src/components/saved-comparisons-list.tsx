"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteSavedComparison,
  loadSavedComparisons,
  type SavedComparison,
} from "@/lib/saved-comparisons";
import type { ScoreWeights } from "@/lib/scoring";
import type { ComparisonRequest } from "@/lib/types";

export function SavedComparisonsList({
  onLoad,
}: {
  onLoad: (request: ComparisonRequest, weights: ScoreWeights) => void;
}) {
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);

  useEffect(() => {
    setComparisons(loadSavedComparisons());
  }, []);

  if (comparisons.length === 0) return null;

  const handleDelete = (id: string) => {
    deleteSavedComparison(id);
    setComparisons((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="eyebrow text-foreground">Saved briefings</span>
        <span className="data text-xs text-muted-foreground">
          {String(comparisons.length).padStart(2, "0")}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {comparisons.map((saved) => (
          <li key={saved.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{saved.title}</p>
              <p className="data text-xs text-muted-foreground">
                {new Date(saved.createdAt)
                  .toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })
                  .toUpperCase()}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLoad(saved.request, saved.weights)}
              >
                Load
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(saved.id)}
                className="text-muted-foreground hover:text-nogo"
                aria-label="Delete saved briefing"
              >
                <X className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
