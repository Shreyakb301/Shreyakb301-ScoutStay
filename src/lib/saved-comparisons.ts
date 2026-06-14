import { TRAVELER_TYPES } from "@/lib/mock-data";
import type { ScoreWeights } from "@/lib/scoring";
import type { ComparisonRequest } from "@/lib/types";

export interface SavedComparison {
  id: string;
  title: string;
  createdAt: string;
  request: ComparisonRequest;
  weights: ScoreWeights;
}

const STORAGE_KEY = "scoutstay-saved-comparisons";
const MAX_SAVED = 20;

function isValidSavedComparison(item: unknown): item is SavedComparison {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.request === "object" &&
    obj.request !== null &&
    typeof obj.weights === "object" &&
    obj.weights !== null
  );
}

export function loadSavedComparisons(): SavedComparison[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSavedComparison);
  } catch {
    return [];
  }
}

function persist(comparisons: SavedComparison[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisons));
  } catch {
    // localStorage full or unavailable (e.g. private browsing quota)
  }
}

function generateTitle(request: ComparisonRequest, winnerName: string): string {
  const others = request.stays.length - 1;
  const travelerLabel =
    TRAVELER_TYPES.find((t) => t.id === request.travelerType)?.label ??
    request.travelerType;
  return others === 1
    ? `${winnerName} vs 1 other — ${travelerLabel}`
    : `${winnerName} vs ${others} others — ${travelerLabel}`;
}

export function saveComparison(
  request: ComparisonRequest,
  weights: ScoreWeights,
  winnerName: string
): SavedComparison {
  const saved: SavedComparison = {
    id: crypto.randomUUID(),
    title: generateTitle(request, winnerName),
    createdAt: new Date().toISOString(),
    request,
    weights,
  };
  const existing = loadSavedComparisons();
  persist([saved, ...existing].slice(0, MAX_SAVED));
  return saved;
}

export function deleteSavedComparison(id: string): void {
  persist(loadSavedComparisons().filter((c) => c.id !== id));
}
