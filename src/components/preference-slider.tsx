"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PreferenceSliderProps {
  id: string;
  label: string;
  /** Relative importance, 0–100. */
  value: number;
  onChange: (value: number) => void;
}

export function PreferenceSlider({
  id,
  label,
  value,
  onChange,
}: PreferenceSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        id={id}
        aria-label={`${label} importance`}
        value={value}
        min={0}
        max={100}
        step={5}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}
