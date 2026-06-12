"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_OPTIONS } from "@/lib/mock-data";
import type { Platform, StayListing } from "@/lib/types";

interface StayListingFieldsProps {
  index: number;
  stay: StayListing;
  onChange: (id: string, patch: Partial<Omit<StayListing, "id">>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function StayListingFields({
  index,
  stay,
  onChange,
  onRemove,
  canRemove,
}: StayListingFieldsProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Stay {index + 1}</CardTitle>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove stay ${index + 1}`}
            onClick={() => onRemove(stay.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-name`}>Nickname</Label>
          <Input
            id={`stay-${stay.id}-name`}
            placeholder="e.g. Sunny loft near Old Town"
            value={stay.name}
            onChange={(event) =>
              onChange(stay.id, { name: event.target.value })
            }
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-url`}>Listing URL</Label>
          <Input
            id={`stay-${stay.id}-url`}
            type="url"
            placeholder="https://..."
            value={stay.url}
            onChange={(event) => onChange(stay.id, { url: event.target.value })}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-platform`}>Platform</Label>
          <Select
            value={stay.platform}
            onValueChange={(value) =>
              onChange(stay.id, { platform: value as Platform })
            }
          >
            <SelectTrigger id={`stay-${stay.id}-platform`} className="w-full">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`stay-${stay.id}-price`}>Price per night (USD)</Label>
          <Input
            id={`stay-${stay.id}-price`}
            type="number"
            min="0"
            step="1"
            placeholder="150"
            value={stay.pricePerNight}
            onChange={(event) =>
              onChange(stay.id, { pricePerNight: event.target.value })
            }
            required
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`stay-${stay.id}-notes`}>
            Notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional — location details, review snippets, amenities)
            </span>
          </Label>
          <Textarea
            id={`stay-${stay.id}-notes`}
            placeholder="e.g. Two blocks from the metro, reviews mention street noise on weekends..."
            value={stay.notes ?? ""}
            onChange={(event) =>
              onChange(stay.id, { notes: event.target.value })
            }
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
