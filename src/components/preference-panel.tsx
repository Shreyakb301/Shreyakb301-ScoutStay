"use client";

import { RotateCcw } from "lucide-react";

import { Panel } from "@/components/briefing";
import { Button } from "@/components/ui/button";
import { PreferenceSlider } from "@/components/preference-slider";
import {
  CATEGORY_LABELS,
  WEIGHT_PRESETS,
  type CategoryId,
  type ScoreWeights,
} from "@/lib/scoring";

const SLIDER_ORDER: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

function sameWeights(a: ScoreWeights, b: ScoreWeights): boolean {
  return SLIDER_ORDER.every((category) => a[category] === b[category]);
}

interface PreferencePanelProps {
  weights: ScoreWeights;
  onWeightsChange: (weights: ScoreWeights) => void;
  onReset: () => void;
}

export function PreferencePanel({
  weights,
  onWeightsChange,
  onReset,
}: PreferencePanelProps) {
  return (
    <Panel
      title="Priority weighting"
      aside={
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      }
      bodyClassName="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Presets</span>
        <div className="flex flex-wrap gap-2">
          {WEIGHT_PRESETS.map((preset) => {
            const active = sameWeights(weights, preset.weights);
            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => onWeightsChange({ ...preset.weights })}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
        {SLIDER_ORDER.map((category) => (
          <PreferenceSlider
            key={category}
            id={`weight-${category}`}
            label={CATEGORY_LABELS[category]}
            value={weights[category]}
            onChange={(value) =>
              onWeightsChange({ ...weights, [category]: value })
            }
          />
        ))}
      </div>
    </Panel>
  );
}
