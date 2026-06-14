import type { Platform, StayListing, TravelerType } from "@/lib/types";

export const TRAVELER_TYPES: TravelerType[] = [
  {
    id: "solo",
    label: "Solo traveler",
    description: "Exploring on your own terms",
    code: "SOLO",
    priorities: ["Safety", "Location", "Value"],
  },
  {
    id: "couple",
    label: "Couple",
    description: "A getaway for two",
    code: "DUO",
    priorities: ["Ambiance", "Privacy", "Nearby dining"],
  },
  {
    id: "family",
    label: "Family",
    description: "Traveling with kids in tow",
    code: "FAM",
    priorities: ["Space", "Kitchen", "Kid-friendly"],
  },
  {
    id: "friends",
    label: "Friend group",
    description: "A trip with the crew",
    code: "GRP",
    priorities: ["Beds & baths", "Common areas", "Nightlife access"],
  },
  {
    id: "business",
    label: "Business",
    description: "Work travel, minimal friction",
    code: "BIZ",
    priorities: ["Wi-Fi", "Workspace", "Transit access"],
  },
];

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "airbnb", label: "Airbnb" },
  { value: "vrbo", label: "Vrbo" },
  { value: "booking", label: "Booking.com" },
  { value: "hotel", label: "Hotel (direct)" },
  { value: "other", label: "Other" },
];

/** Sample stays used by the "Fill with sample data" action on the compare form. */
export const SAMPLE_STAYS: Omit<StayListing, "id">[] = [
  {
    name: "Sunny Loft near Old Town",
    url: "https://www.airbnb.com/rooms/12345678",
    platform: "airbnb",
    pricePerNight: "142",
    address: "Rua dos Fanqueiros 77, Lisbon, Portugal",
    latitude: 38.7107,
    longitude: -9.1368,
    placeName: "Rua dos Fanqueiros 77",
    city: "Lisbon",
    region: "Lisboa",
    notes:
      "Walkable central location, lots of cafes and restaurants nearby. Reviews mention some street noise on weekends from nearby bars.",
  },
  {
    name: "Riverside Cabin Retreat",
    url: "https://www.vrbo.com/9876543",
    platform: "vrbo",
    pricePerNight: "189",
    address: "Estrada da Peninha, Sintra, Portugal",
    latitude: 38.7782,
    longitude: -9.4376,
    placeName: "Estrada da Peninha",
    city: "Sintra",
    region: "Lisboa",
    notes:
      "Quiet and secluded riverside spot with a full kitchen. Car required — about 20 minutes drive to town, no transit nearby.",
  },
  {
    name: "Hotel Meridian, King Room",
    url: "https://www.booking.com/hotel/meridian",
    platform: "booking",
    pricePerNight: "165",
    address: "Avenida da Liberdade 185, Lisbon, Portugal",
    latitude: 38.7205,
    longitude: -9.1465,
    placeName: "Avenida da Liberdade 185",
    city: "Lisbon",
    region: "Lisboa",
    notes:
      "Modern hotel with 24h front desk, gym, and fast wifi. Two blocks from the metro station, dining options in the lobby and nearby.",
  },
];
