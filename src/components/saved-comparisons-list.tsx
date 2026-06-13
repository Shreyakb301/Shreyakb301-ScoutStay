"use client";

import { useEffect, useState } from "react";
import { BookmarkX, Clock, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderOpen className="size-4" />
          <span className="text-sm font-medium text-foreground">
            Saved comparisons
          </span>
          <span className="text-xs">({comparisons.length})</span>
        </div>
        <div className="flex flex-col gap-2">
          {comparisons.map((saved) => (
            <Card key={saved.id} className="border-border/60">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{saved.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(saved.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
                    size="sm"
                    onClick={() => handleDelete(saved.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete saved comparison"
                  >
                    <BookmarkX className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Separator />
    </>
  );
}
