/**
 * Trip intake, the guided, one-question-per-card flow that gathers trip
 * context before the user enters stays. This module owns the data model, the
 * (conditionally visible) question list, and the mapping from answers to the
 * scoring engine's default preference weights. Everything is client-side.
 */

import {
  TRAVELER_DEFAULT_WEIGHTS,
  type ScoreWeights,
} from "@/lib/scoring";
import type { TravelerTypeId } from "@/lib/types";

export type AccommodationType = "airbnb" | "hotel" | "either";
export type ArrivalMethod = "airport" | "train" | "bus" | "car" | "unsure";
export type TravelGroup =
  | "solo"
  | "couple"
  | "friends"
  | "family"
  | "colleagues";
export type PreferredArea =
  | "downtown"
  | "planned"
  | "transit-hub"
  | "suburbs"
  | "quiet"
  | "none";
export type RentalCarChoice = "yes" | "no" | "unsure";
export type LocalTransport =
  | "walking"
  | "transit"
  | "rideshare"
  | "rental"
  | "mixed";
export type PetChoice = "yes" | "no" | "maybe";

export interface PlaceRef {
  id: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export type ImportanceKey =
  | "airportAccess"
  | "walkability"
  | "transit"
  | "groceries"
  | "restaurants"
  | "quietness"
  | "budget"
  | "petFriendly";

export interface TripContext {
  accommodation: AccommodationType | null;
  arrivalMethod: ArrivalMethod | null;
  arrivalLocation: PlaceRef | null;
  travelGroup: TravelGroup | null;
  withChildren: boolean | null;
  /** Trip dates (ISO YYYY-MM-DD), used for live pricing and fair comparison. */
  checkIn: string | null;
  checkOut: string | null;
  visitPlaces: PlaceRef[];
  preferredArea: PreferredArea | null;
  rentalCar: RentalCarChoice | null;
  localTransport: LocalTransport | null;
  importance: Record<ImportanceKey, number>;
  pets: PetChoice | null;
}

export interface IntakeOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const ACCOMMODATION_OPTIONS: IntakeOption<AccommodationType>[] = [
  { value: "airbnb", label: "Airbnb", description: "Short-term rental" },
  { value: "hotel", label: "Hotel", description: "Serviced stay" },
  { value: "either", label: "Either", description: "Open to both" },
];

export const ARRIVAL_OPTIONS: IntakeOption<ArrivalMethod>[] = [
  { value: "airport", label: "Airport", description: "Arriving by air" },
  { value: "train", label: "Train", description: "Rail terminal" },
  { value: "bus", label: "Bus", description: "Coach terminal" },
  { value: "car", label: "Car", description: "Driving in" },
  { value: "unsure", label: "Not sure", description: "Decide later" },
];

export const TRAVEL_GROUP_OPTIONS: IntakeOption<TravelGroup>[] = [
  { value: "solo", label: "Solo", description: "Just you" },
  { value: "couple", label: "Couple", description: "Two travelers" },
  { value: "friends", label: "Friends", description: "A group trip" },
  { value: "family", label: "Family", description: "With relatives" },
  { value: "colleagues", label: "Colleagues", description: "Work travel" },
];

export const PREFERRED_AREA_OPTIONS: IntakeOption<PreferredArea>[] = [
  { value: "downtown", label: "Near downtown", description: "Central & dense" },
  { value: "planned", label: "Near planned places", description: "Close to your itinerary" },
  { value: "transit-hub", label: "Near airport or station", description: "Fast transfers" },
  { value: "suburbs", label: "Suburbs", description: "Outside the core" },
  { value: "quiet", label: "Quiet residential", description: "Calm streets" },
  { value: "none", label: "No preference", description: "Surprise me" },
];

export const RENTAL_CAR_OPTIONS: IntakeOption<RentalCarChoice>[] = [
  { value: "yes", label: "Yes", description: "Renting a car" },
  { value: "no", label: "No", description: "No car" },
  { value: "unsure", label: "Not sure", description: "Undecided" },
];

export const LOCAL_TRANSPORT_OPTIONS: IntakeOption<LocalTransport>[] = [
  { value: "walking", label: "Walking", description: "On foot" },
  { value: "transit", label: "Public transit", description: "Metro & bus" },
  { value: "rideshare", label: "Rideshare", description: "Taxi & apps" },
  { value: "rental", label: "Rental car", description: "Own wheels" },
  { value: "mixed", label: "Mixed", description: "A bit of everything" },
];

export const PET_OPTIONS: IntakeOption<PetChoice>[] = [
  { value: "yes", label: "Yes", description: "Bringing a pet" },
  { value: "no", label: "No", description: "No pets" },
  { value: "maybe", label: "Maybe", description: "Possibly" },
];

export const YES_NO_OPTIONS: IntakeOption<"yes" | "no">[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const IMPORTANCE_FIELDS: { key: ImportanceKey; label: string }[] = [
  { key: "airportAccess", label: "Airport / station access" },
  { key: "walkability", label: "Walkability" },
  { key: "transit", label: "Public transit" },
  { key: "groceries", label: "Groceries" },
  { key: "restaurants", label: "Restaurants" },
  { key: "quietness", label: "Quietness" },
  { key: "budget", label: "Budget" },
  { key: "petFriendly", label: "Pet friendly" },
];

export function createDefaultTripContext(): TripContext {
  return {
    accommodation: null,
    arrivalMethod: null,
    arrivalLocation: null,
    travelGroup: null,
    withChildren: null,
    checkIn: null,
    checkOut: null,
    visitPlaces: [],
    preferredArea: null,
    rentalCar: null,
    localTransport: null,
    importance: {
      airportAccess: 50,
      walkability: 50,
      transit: 50,
      groceries: 40,
      restaurants: 50,
      quietness: 50,
      budget: 55,
      petFriendly: 20,
    },
    pets: null,
  };
}

/** A ready-to-score sample context, for the "Use sample trip" shortcut. */
export function createSampleTripContext(): TripContext {
  return {
    ...createDefaultTripContext(),
    accommodation: "either",
    arrivalMethod: "airport",
    travelGroup: "couple",
    withChildren: null,
    preferredArea: "downtown",
    rentalCar: "no",
    localTransport: "walking",
    pets: "no",
  };
}

export type QuestionKind = "single" | "place" | "places" | "sliders" | "dates";

export type QuestionId =
  | "accommodation"
  | "arrival"
  | "arrivalLocation"
  | "travelGroup"
  | "children"
  | "dates"
  | "visitPlaces"
  | "preferredArea"
  | "rentalCar"
  | "localTransport"
  | "importance"
  | "pets";

export interface IntakeQuestion {
  id: QuestionId;
  section: string;
  title: string;
  helper?: string;
  kind: QuestionKind;
  required: boolean;
  /** Whether to show this question given the current answers. */
  visible: (context: TripContext) => boolean;
  /** Whether the question currently holds a valid answer. */
  answered: (context: TripContext) => boolean;
}

const ARRIVAL_NEEDS_LOCATION: ArrivalMethod[] = ["airport", "train", "bus"];

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "accommodation",
    section: "Trip context",
    title: "What kind of place are you after?",
    helper: "Sets the baseline for how we read each listing.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.accommodation !== null,
  },
  {
    id: "arrival",
    section: "Trip context",
    title: "How will you arrive?",
    helper: "Drives the transfer and airport-access analysis.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.arrivalMethod !== null,
  },
  {
    id: "arrivalLocation",
    section: "Trip context",
    title: "Where do you land?",
    helper: "Search the airport, station, or terminal. Optional.",
    kind: "place",
    required: false,
    visible: (c) =>
      c.arrivalMethod !== null &&
      ARRIVAL_NEEDS_LOCATION.includes(c.arrivalMethod),
    answered: () => true,
  },
  {
    id: "travelGroup",
    section: "Trip context",
    title: "Who's traveling?",
    helper: "We weight the assessment toward this group's priorities.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.travelGroup !== null,
  },
  {
    id: "children",
    section: "Trip context",
    title: "Traveling with children?",
    helper: "Raises safety, groceries, and quietness in the scoring.",
    kind: "single",
    required: true,
    visible: (c) => c.travelGroup === "family",
    answered: (c) => c.withChildren !== null,
  },
  {
    id: "dates",
    section: "Trip context",
    title: "When are you traveling?",
    helper:
      "Optional, but it pulls live nightly prices and keeps every stay priced for the same dates.",
    kind: "dates",
    required: false,
    visible: () => true,
    answered: () => true,
  },
  {
    id: "visitPlaces",
    section: "Itinerary",
    title: "Anywhere you plan to visit?",
    helper: "Add places on your itinerary. Optional, add as many as you like.",
    kind: "places",
    required: false,
    visible: () => true,
    answered: () => true,
  },
  {
    id: "preferredArea",
    section: "Logistics",
    title: "Where would you rather stay?",
    helper: "Shapes which neighborhoods score best.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.preferredArea !== null,
  },
  {
    id: "rentalCar",
    section: "Logistics",
    title: "Renting a car?",
    helper: "No car raises walkability and transit weighting.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.rentalCar !== null,
  },
  {
    id: "localTransport",
    section: "Logistics",
    title: "How will you get around?",
    helper: "Your day-to-day mobility preference.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.localTransport !== null,
  },
  {
    id: "importance",
    section: "Priorities",
    title: "What matters most?",
    helper: "Fine-tune the weighting. You can adjust these later too.",
    kind: "sliders",
    required: false,
    visible: () => true,
    answered: () => true,
  },
  {
    id: "pets",
    section: "Priorities",
    title: "Bringing any pets?",
    helper: "Flags pet-friendly requirements.",
    kind: "single",
    required: true,
    visible: () => true,
    answered: (c) => c.pets !== null,
  },
];

/** The ordered list of questions currently shown, given the answers so far. */
export function getVisibleQuestions(context: TripContext): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter((question) => question.visible(context));
}

function labelOf<T extends string>(
  options: IntakeOption<T>[],
  value: T | null
): string | null {
  if (value === null) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

export interface TripContextSummaryItem {
  label: string;
  value: string;
}

/** A readable label/value summary of everything the user answered. */
export function summarizeTripContext(
  context: TripContext
): TripContextSummaryItem[] {
  const items: TripContextSummaryItem[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) items.push({ label, value });
  };

  push("Travel group", labelOf(TRAVEL_GROUP_OPTIONS, context.travelGroup));
  if (context.travelGroup === "family" && context.withChildren !== null) {
    push("Children", context.withChildren ? "Yes" : "No");
  }
  push("Accommodation", labelOf(ACCOMMODATION_OPTIONS, context.accommodation));
  push("Arrival", labelOf(ARRIVAL_OPTIONS, context.arrivalMethod));
  push("Arrival point", context.arrivalLocation?.name);
  push("Preferred area", labelOf(PREFERRED_AREA_OPTIONS, context.preferredArea));
  push("Rental car", labelOf(RENTAL_CAR_OPTIONS, context.rentalCar));
  push("Getting around", labelOf(LOCAL_TRANSPORT_OPTIONS, context.localTransport));
  push("Pets", labelOf(PET_OPTIONS, context.pets));
  if (context.checkIn && context.checkOut) {
    push("Dates", `${context.checkIn} to ${context.checkOut}`);
  }
  if (context.visitPlaces.length > 0) {
    push("Planned visits", context.visitPlaces.map((p) => p.name).join(", "));
  }

  const topPriorities = [...IMPORTANCE_FIELDS]
    .sort((a, b) => context.importance[b.key] - context.importance[a.key])
    .slice(0, 3)
    .map((field) => field.label);
  push("Top priorities", topPriorities.join(", "));

  return items;
}

const GROUP_TO_TRAVELER: Record<TravelGroup, TravelerTypeId> = {
  solo: "solo",
  couple: "couple",
  friends: "friends",
  family: "family",
  colleagues: "business",
};

/** Map the intake travel group onto the scoring engine's traveler type. */
export function tripGroupToTravelerType(
  group: TravelGroup | null
): TravelerTypeId {
  return group ? GROUP_TO_TRAVELER[group] : "solo";
}

const GROUP_GUESTS: Record<TravelGroup, number> = {
  solo: 1,
  couple: 2,
  friends: 4,
  family: 4,
  colleagues: 2,
};

/** Default adult headcount for a travel group, used for live pricing. */
export function guestsForGroup(group: TravelGroup | null): number {
  return group ? GROUP_GUESTS[group] : 2;
}

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

/**
 * Turn the gathered context into the scoring engine's slider-scale weights.
 * Importance sliders seed the categories that have a scoring equivalent;
 * contextual rules then nudge the blend. The engine normalizes internally,
 * so these stay on the familiar 0–100 scale.
 */
export function deriveWeightsFromContext(context: TripContext): ScoreWeights {
  const base = TRAVELER_DEFAULT_WEIGHTS[tripGroupToTravelerType(context.travelGroup)];
  const imp = context.importance;

  const weights: ScoreWeights = {
    safetyScore: base.safetyScore,
    walkabilityScore: imp.walkability,
    transitScore: imp.transit,
    foodAccessScore: Math.round((imp.groceries + imp.restaurants) / 2),
    noiseRiskScore: imp.quietness,
    valueScore: imp.budget,
    travelerFitScore: base.travelerFitScore,
  };

  const bump = (key: keyof ScoreWeights, amount: number) => {
    weights[key] = clamp(weights[key] + amount);
  };

  // No rental car → leans on walking and transit.
  if (context.rentalCar === "no") {
    bump("walkabilityScore", 15);
    bump("transitScore", 15);
  }

  // Traveling with children → safety, groceries, quietness.
  if (context.withChildren === true) {
    bump("safetyScore", 15);
    bump("foodAccessScore", 10);
    bump("noiseRiskScore", 10);
  }

  // Family group → safety, groceries, quietness.
  if (context.travelGroup === "family") {
    bump("safetyScore", 10);
    bump("foodAccessScore", 8);
    bump("noiseRiskScore", 8);
  }

  // Colleagues / business → transit and station access.
  if (context.travelGroup === "colleagues") {
    bump("transitScore", 15);
  }

  // Preferred-area signals.
  if (context.preferredArea === "planned") {
    bump("walkabilityScore", 12);
  } else if (context.preferredArea === "downtown") {
    bump("walkabilityScore", 8);
    bump("foodAccessScore", 6);
  } else if (context.preferredArea === "transit-hub") {
    bump("transitScore", 12);
  } else if (context.preferredArea === "quiet") {
    bump("noiseRiskScore", 12);
  }

  // Local-transport preference.
  if (context.localTransport === "walking") bump("walkabilityScore", 12);
  else if (context.localTransport === "transit") bump("transitScore", 12);

  return weights;
}
