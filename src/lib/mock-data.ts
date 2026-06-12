import type { Platform, StayListing, TravelerType } from "@/lib/types";

export const TRAVELER_TYPES: TravelerType[] = [
  {
    id: "solo",
    label: "Solo traveler",
    description: "Exploring on your own terms",
    icon: "🎒",
    priorities: ["Safety", "Location", "Value"],
  },
  {
    id: "couple",
    label: "Couple",
    description: "A getaway for two",
    icon: "💑",
    priorities: ["Ambiance", "Privacy", "Nearby dining"],
  },
  {
    id: "family",
    label: "Family",
    description: "Traveling with kids in tow",
    icon: "👨‍👩‍👧‍👦",
    priorities: ["Space", "Kitchen", "Kid-friendly"],
  },
  {
    id: "friends",
    label: "Friend group",
    description: "A trip with the crew",
    icon: "🎉",
    priorities: ["Beds & baths", "Common areas", "Nightlife access"],
  },
  {
    id: "business",
    label: "Business",
    description: "Work travel, minimal friction",
    icon: "💼",
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
  },
  {
    name: "Riverside Cabin Retreat",
    url: "https://www.vrbo.com/9876543",
    platform: "vrbo",
    pricePerNight: "189",
  },
  {
    name: "Hotel Meridian, King Room",
    url: "https://www.booking.com/hotel/meridian",
    platform: "booking",
    pricePerNight: "165",
  },
];
