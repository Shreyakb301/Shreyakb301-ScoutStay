"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { usePlaceAutocomplete } from "@/hooks/use-place-autocomplete";
import type { AddressSuggestion } from "@/lib/geocode";
import type { PlaceRef } from "@/lib/trip-intake";
import { cn } from "@/lib/utils";

function toPlaceRef(suggestion: AddressSuggestion): PlaceRef {
  return {
    id: suggestion.id,
    name: suggestion.placeName,
    formattedAddress: suggestion.formattedAddress,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}

interface PlaceAutocompleteProps {
  id: string;
  placeholder?: string;
  onSelect: (place: PlaceRef) => void;
  /** Clear the field after a selection (for adding several places). */
  clearOnSelect?: boolean;
  autoFocus?: boolean;
}

/**
 * A Nominatim-backed place search box. Debounced and cached via
 * usePlaceAutocomplete; surfaces loading, error, and empty states.
 */
export function PlaceAutocomplete({
  id,
  placeholder = "Search a place…",
  onSelect,
  clearOnSelect = false,
  autoFocus = false,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { suggestions, loading, error, active } = usePlaceAutocomplete(
    open ? query : ""
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setHighlighted(suggestions.length > 0 ? 0 : -1);
  }, [suggestions]);

  const showDropdown = open && active;

  const select = (suggestion: AddressSuggestion) => {
    onSelect(toPlaceRef(suggestion));
    if (clearOnSelect) {
      setQuery("");
    } else {
      setQuery(suggestion.placeName);
    }
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop the intake flow's global nav keys from firing while searching.
    if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.stopPropagation();
    }
    if (!showDropdown) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (suggestions.length > 0) {
        event.preventDefault();
        select(suggestions[Math.max(highlighted, 0)]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-10 pl-8 pr-9"
        />
        {loading && (
          <Loader2 className="absolute inset-y-0 right-2.5 my-auto size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Place suggestions"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {error ? (
            <li className="px-3 py-2 text-sm text-nogo">{error}</li>
          ) : loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Searching places…
            </li>
          ) : suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No matching places found.
            </li>
          ) : (
            suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === highlighted}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(suggestion)}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 px-3 py-2 text-sm",
                  index === highlighted && "bg-accent text-accent-foreground"
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {suggestion.placeName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.formattedAddress}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
