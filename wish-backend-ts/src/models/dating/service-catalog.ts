// Values a profile can hold for the cleaning marketplace. The frontend keeps
// the same lists in maid/src/app/services/admin/interfaces/service-catalog.ts.

export const USER_TYPES = ["Cleaner", "Client"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const SERVICES = [
  "regular",
  "deep",
  "ironing",
  "laundry",
  "windows",
  "moveInOut",
  "afterParty",
  "kitchenAppliances",
  "cooking",
  "office",
  "garage",
  "stairs",
  "ecoProducts",
] as const;

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const SLOTS = ["morning", "afternoon", "evening"] as const;

export interface DayAvailability {
  day: string;
  slots: string[];
}

// One entry per day with at least one slot, days and slots in catalog order.
export const normalizeAvailability = (
  availability: DayAvailability[]
): DayAvailability[] =>
  DAYS.flatMap((day) => {
    const picked = availability
      .filter((entry) => entry.day === day)
      .flatMap((entry) => entry.slots);
    const slots = SLOTS.filter((slot) => picked.includes(slot));
    return slots.length ? [{ day, slots }] : [];
  });

export const MAX_AREAS = 10;
export const MIN_RATE = 5;
export const MAX_RATE = 200;

const CURRENCY_BY_COUNTRY: Record<string, string> = { CH: "CHF", GB: "GBP", US: "USD" };

export const currencyForCountry = (country?: string) =>
  CURRENCY_BY_COUNTRY[country ?? ""] ?? "EUR";

export const isUserType = (value: unknown): value is UserType =>
  USER_TYPES.includes(value as UserType);
