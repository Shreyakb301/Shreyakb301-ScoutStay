"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinOff } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGeocodedStays } from "@/hooks/use-geocoded-stays";
import { PLATFORM_OPTIONS } from "@/lib/mock-data";
import type {
  Airport,
  AirportIntelligence,
} from "@/lib/airport-intelligence";
import type { LngLat } from "@/lib/geocode";
import type { ScoredStay } from "@/lib/scoring";

/** One marker color per stay, matching the category chart palette. */
const MARKER_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface LocatedStay {
  entry: ScoredStay;
  coords: LngLat;
  color: string;
}

function platformLabel(value: string): string {
  return (
    PLATFORM_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

/**
 * Numbered, color-coded marker. Only the rank (a number) and our own
 * palette color go into the HTML string — never user input.
 */
function markerIcon(rank: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html:
      `<div style="display:flex;align-items:center;justify-content:center;` +
      `width:28px;height:28px;border-radius:9999px;background:${color};` +
      `color:white;font-size:13px;font-weight:700;border:2px solid white;` +
      `box-shadow:0 2px 6px rgba(0,0,0,0.35)">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

interface AirportMarkerData {
  airport: Airport;
  /** Stays whose nearest airport this is, with their distances. */
  stays: { name: string; distanceKm: number; driveMinutes: number }[];
}

/** Square slate marker with a plane glyph — visually distinct from the round, numbered stay markers. */
function airportIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html:
      `<div style="display:flex;align-items:center;justify-content:center;` +
      `width:30px;height:30px;border-radius:8px;background:#0f172a;` +
      `color:white;font-size:15px;border:2px solid white;` +
      `box-shadow:0 2px 6px rgba(0,0,0,0.35)">✈</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -17],
  });
}

/** Fits the viewport to the markers whenever the set of locations changes. */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), {
        padding: [48, 48],
        maxZoom: 14,
      });
    }
  }, [map, positions]);
  return null;
}

export function StayMap({
  scoredStays,
  airports,
}: {
  scoredStays: ScoredStay[];
  /** Nearest-airport data keyed by stay id, when available. */
  airports?: Record<string, AirportIntelligence | null>;
}) {
  const stays = useMemo(
    () => scoredStays.map((entry) => entry.stay),
    [scoredStays]
  );
  const { locations, errors, loading } = useGeocodedStays(stays);

  const locatedStays = useMemo<LocatedStay[]>(
    () =>
      scoredStays
        .filter((entry) => locations[entry.stay.id])
        .map((entry, index) => ({
          entry,
          coords: locations[entry.stay.id],
          color: MARKER_COLORS[index % MARKER_COLORS.length],
        })),
    [scoredStays, locations]
  );

  // Dedupe airports shared by several stays into one marker each.
  const airportMarkers = useMemo<AirportMarkerData[]>(() => {
    if (!airports) return [];
    const byId = new Map<string, AirportMarkerData>();
    for (const entry of scoredStays) {
      const info = airports[entry.stay.id];
      if (!info) continue;
      const marker = byId.get(info.airport.id) ?? {
        airport: info.airport,
        stays: [],
      };
      marker.stays.push({
        name: entry.stay.name,
        distanceKm: info.distanceKm,
        driveMinutes: info.driveMinutes,
      });
      byId.set(info.airport.id, marker);
    }
    return [...byId.values()];
  }, [airports, scoredStays]);

  const positions = useMemo<[number, number][]>(
    () => [
      ...locatedStays.map(
        (located): [number, number] => [located.coords.lat, located.coords.lng]
      ),
      ...airportMarkers.map(
        (marker): [number, number] => [
          marker.airport.latitude,
          marker.airport.longitude,
        ]
      ),
    ],
    [locatedStays, airportMarkers]
  );

  const staysWithAddress = stays.filter((stay) => stay.address?.trim());
  const failedStays = scoredStays.filter((entry) => errors[entry.stay.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location intelligence</CardTitle>
        <CardDescription>
          Your shortlist on the map — click a marker for the stay&apos;s score,
          platform, and price.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {staysWithAddress.length === 0 ? (
          <EmptyState
            title="No addresses yet"
            body="Add an address to your stays in the form to see them placed on the map."
          />
        ) : loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-muted sm:h-96" />
        ) : locatedStays.length === 0 ? (
          <EmptyState
            title="Couldn't place your stays"
            body="None of the addresses could be geocoded. Check that they're complete (street, city, country), or pick one of the autocomplete suggestions."
          />
        ) : (
          // z-0 keeps Leaflet's internal panes below the sticky site header.
          <div className="relative z-0 h-80 w-full overflow-hidden rounded-lg border sm:h-96">
            <MapContainer
              center={positions[0]}
              zoom={11}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds positions={positions} />
              {locatedStays.map((located) => (
                <Marker
                  key={located.entry.stay.id}
                  position={[located.coords.lat, located.coords.lng]}
                  icon={markerIcon(located.entry.rank, located.color)}
                >
                  <Popup offset={[0, -8]}>
                    <div className="min-w-44 text-sm">
                      <p className="mb-1 font-semibold">
                        {located.entry.stay.name}
                      </p>
                      <p className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-medium">
                          {located.entry.overallScore}/100 ·{" "}
                          {located.entry.verdict}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Platform</span>
                        <span className="font-medium">
                          {platformLabel(located.entry.stay.platform)}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">
                          ${Number(located.entry.stay.pricePerNight) || 0}
                          /night
                        </span>
                      </p>
                      {located.entry.nearby && (
                        <div className="mt-1.5 border-t pt-1.5">
                          {(
                            [
                              [
                                "Food & cafés",
                                located.entry.nearby.counts.restaurant +
                                  located.entry.nearby.counts.cafe,
                              ],
                              ["Grocery", located.entry.nearby.counts.grocery],
                              ["Transit", located.entry.nearby.counts.transit],
                              [
                                "Nightlife",
                                located.entry.nearby.counts.nightlife,
                              ],
                            ] as const
                          ).map(([label, count]) => (
                            <p
                              key={label}
                              className="flex justify-between gap-3 text-xs"
                            >
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-medium tabular-nums">
                                {count} nearby
                              </span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {airportMarkers.map((marker) => (
                <Marker
                  key={marker.airport.id}
                  position={[marker.airport.latitude, marker.airport.longitude]}
                  icon={airportIcon()}
                >
                  <Popup offset={[0, -8]}>
                    <div className="min-w-44 text-sm">
                      <p className="mb-1 font-semibold">
                        {marker.airport.name}
                        {marker.airport.iata && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({marker.airport.iata})
                          </span>
                        )}
                      </p>
                      {marker.stays.map((stay) => (
                        <p
                          key={stay.name}
                          className="flex justify-between gap-3 text-xs"
                        >
                          <span className="text-muted-foreground">
                            From {stay.name}
                          </span>
                          <span className="font-medium tabular-nums">
                            {stay.distanceKm} km · ~{stay.driveMinutes} min
                          </span>
                        </p>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {failedStays.length > 0 && locatedStays.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Not shown on the map:{" "}
            {failedStays
              .map(
                (entry) =>
                  `${entry.stay.name} (${errors[entry.stay.id].toLowerCase()})`
              )
              .join(", ")}
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 text-center sm:h-72">
      <MapPinOff className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
