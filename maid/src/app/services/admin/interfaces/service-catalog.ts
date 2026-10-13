// Values a profile can hold for the cleaning marketplace. The backend keeps
// the same lists in wish-backend-ts/src/models/dating/service-catalog.ts.
// Labels live in the i18n files under services.*, days.* and slots.*.

export const SERVICES = [
  'regular',
  'deep',
  'ironing',
  'laundry',
  'windows',
  'moveInOut',
  'afterParty',
  'kitchenAppliances',
  'cooking',
  'office',
  'ecoProducts',
] as const;
export type ServiceKey = (typeof SERVICES)[number];

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAYS)[number];

export const SLOTS = ['morning', 'afternoon', 'evening'] as const;
export type SlotKey = (typeof SLOTS)[number];

export const MAX_AREAS = 10;
export const MIN_RATE = 5;
export const MAX_RATE = 200;

const CURRENCY_BY_COUNTRY: Record<string, string> = { CH: 'CHF', GB: 'GBP' };

export const currencyForCountry = (country?: string | null) =>
  CURRENCY_BY_COUNTRY[country ?? ''] ?? 'EUR';

// Material Icons ligatures.
export const SERVICE_ICONS: Record<ServiceKey, string> = {
  regular: 'cleaning_services',
  deep: 'auto_awesome',
  ironing: 'iron',
  laundry: 'local_laundry_service',
  windows: 'window',
  moveInOut: 'local_shipping',
  afterParty: 'celebration',
  kitchenAppliances: 'kitchen',
  cooking: 'restaurant',
  office: 'business_center',
  ecoProducts: 'eco',
};

export interface Area {
  country: string;
  location: string;
  locationName: string;
}

export interface Availability {
  days: DayKey[];
  slots: SlotKey[];
}
