"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import type { AddressSuggestion } from "@/lib/geocode";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  id: string;
  /** Current address text (controlled by the parent form). */
  value: string;
  /** True when a suggestion has been picked and coordinates are stored. */
  hasSelection: boolean;
  /** Shown under the input when a suggestion is selected, e.g. "Lisbon, Lisboa". */
  selectionCaption?: string;
  onInputChange: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onClear: () => void;
  placeholder?: string;
}

export function AddressAutocomplete({
  id,
  value,
  hasSelection,
  selectionCaption,
  onInputChange,
  onSelect,
  onClear,
  placeholder,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Don't search while a selection is locked in; only when the user types.
  const { suggestions, loading, error, active } =
    useAddressAutocomplete(hasSelection || !open ? "" : value);

  // Close the dropdown on any click/tap outside the component.
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

  const showDropdown = open && !hasSelection && active;

  const select = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
        <Input
          id={id}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlighted >= 0 ? `${id}-option-${highlighted}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onInputChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn("pr-9", hasSelection && "pr-16")}
        />
        <span className="absolute inset-y-0 right-2 flex items-center gap-1">
          {loading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
          {hasSelection && <Check className="size-4 text-emerald-600" />}
          {value && (
            <button
              type="button"
              aria-label="Clear address"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </span>
      </div>

      {hasSelection && selectionCaption && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {selectionCaption}
        </p>
      )}

      {showDropdown && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {error ? (
            <li className="px-3 py-2 text-sm text-destructive">{error}</li>
          ) : loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Searching addresses…
            </li>
          ) : suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No matching addresses found.
            </li>
          ) : (
            suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === highlighted}
                // preventDefault keeps the input focused so onClick fires
                // before any blur handling.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(suggestion)}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-sm px-3 py-2 text-sm",
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
