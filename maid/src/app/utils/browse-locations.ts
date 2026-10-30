import {
  SERVICES,
  ServiceKey,
  currencyForCountry,
} from '../services/admin/interfaces/service-catalog';

export interface BrowseCountry {
  /** URL segment, identical in every language. */
  slug: string;
  /** ISO 3166-1 alpha-2 code, the value the list API filters on. */
  code: string;
  name: string;
}

export interface BrowseLocationService {
  service: ServiceKey;
  count: number;
  indexable: boolean;
  /** Hourly rates of the cleaners who offer this service here. */
  minRate?: number | null;
  maxRate?: number | null;
}

export interface BrowseLocation {
  country: string;
  /** Opaque lineage path the list API prefix-matches, e.g. `/295480/2897141/`. */
  location: string;
  locationName: string;
  count: number;
  /**
   * Set by the API from its own cleaner-count thresholds. A place under the bar
   * still gets a page and still gets linked to; it is only held out of the
   * index until it has enough cleaners to be worth a search result.
   */
  indexable: boolean;
  /** Hourly rates of the cleaners counted above. */
  minRate?: number | null;
  maxRate?: number | null;
  services: BrowseLocationService[];
}

export interface ResolvedBrowseLocation {
  country: BrowseCountry;
  /** Absent on a country-level page. */
  location?: BrowseLocation;
  citySlug?: string;
  /** Set only on a `/browse/:country/:city/:service` page. */
  service?: BrowseLocationService;
  serviceSlug?: string;
}

// Slugs stay in English across all seven locales so that `/pt/browse/portugal`
// and `/en/browse/portugal` describe the same page, and the hreflang set for a
// location is a straight swap of the language prefix.
export const BROWSE_COUNTRIES: readonly BrowseCountry[] = [
  { slug: 'portugal', code: 'PT', name: 'Portugal' },
  { slug: 'germany', code: 'DE', name: 'Germany' },
  { slug: 'france', code: 'FR', name: 'France' },
  { slug: 'spain', code: 'ES', name: 'Spain' },
  { slug: 'italy', code: 'IT', name: 'Italy' },
  { slug: 'switzerland', code: 'CH', name: 'Switzerland' },
  { slug: 'netherlands', code: 'NL', name: 'Netherlands' },
  { slug: 'united-kingdom', code: 'GB', name: 'United Kingdom' },
  { slug: 'united-states', code: 'US', name: 'United States' },
];

// Spelled out rather than derived from the catalog keys, because the key is a
// storage value and the slug is a search term: `deep` alone means nothing in a
// URL, `deep-cleaning` is what people type.
export const SERVICE_SLUGS: Readonly<Record<ServiceKey, string>> = {
  regular: 'regular-cleaning',
  deep: 'deep-cleaning',
  ironing: 'ironing',
  laundry: 'laundry',
  windows: 'window-cleaning',
  moveInOut: 'move-in-move-out',
  afterParty: 'after-party-cleaning',
  kitchenAppliances: 'oven-and-fridge',
  cooking: 'cooking',
  office: 'office-cleaning',
  garage: 'garage-cleaning',
  stairs: 'stair-cleaning',
  ecoProducts: 'eco-friendly-cleaning',
};

const BY_SLUG = new Map(BROWSE_COUNTRIES.map((item) => [item.slug, item]));
const BY_CODE = new Map(BROWSE_COUNTRIES.map((item) => [item.code, item]));
const SERVICE_BY_SLUG = new Map(
  SERVICES.map((key) => [SERVICE_SLUGS[key], key]),
);

export function countryBySlug(slug: string | undefined) {
  return slug ? BY_SLUG.get(slug.toLowerCase()) : undefined;
}

export function countryByCode(code: string | undefined) {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function serviceBySlug(slug: string | undefined): ServiceKey | undefined {
  return slug ? SERVICE_BY_SLUG.get(slug.toLowerCase()) : undefined;
}

/**
 * Place names arrive from the geo API already localised and accented
 * ("München", "Setúbal"). Stripping diacritics keeps the URL ASCII and stable
 * no matter which language wrote the profile.
 */
export function slugifyLocation(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Two places in one country can slugify the same way (and the geo API can hand
 * back the same name at different lineage depths). The busiest one keeps the
 * bare slug; the rest are dropped rather than given an arbitrary suffix, so a
 * slug always points at one page.
 */
export function indexLocations(locations: readonly BrowseLocation[]) {
  const byCountry = new Map<string, Map<string, BrowseLocation>>();

  const ranked = [...locations].sort((a, b) => b.count - a.count);
  for (const entry of ranked) {
    const country = countryByCode(entry.country);
    if (!country || !entry.locationName) {
      continue;
    }
    const slug = slugifyLocation(entry.locationName);
    if (!slug) {
      continue;
    }
    const cities = byCountry.get(country.slug) ?? new Map();
    if (!cities.has(slug)) {
      cities.set(slug, entry);
    }
    byCountry.set(country.slug, cities);
  }

  return byCountry;
}

const finiteRate = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * The sentence that makes a city or service page different from the others:
 * how many cleaners, the rate range they actually list, and the services
 * covered. Service names are already translated by the caller.
 */
export function browseFact(
  resolved: ResolvedBrowseLocation,
  serviceNames: readonly string[],
): { key: string; params: Record<string, string> } | null {
  const location = resolved.location;
  if (!location) {
    return null;
  }

  const place = location.locationName;
  const currency = currencyForCountry(location.country);
  const names = serviceNames.filter(Boolean);

  if (resolved.service) {
    const count = String(resolved.service.count);
    const service = names[0] ?? resolved.service.service;
    const min = finiteRate(resolved.service.minRate);
    const max = finiteRate(resolved.service.maxRate);
    if (min != null && max != null && min !== max) {
      return {
        key: 'browse.factsServiceRate',
        params: {
          count,
          service,
          location: place,
          min: String(min),
          max: String(max),
          currency,
        },
      };
    }
    if (min != null) {
      return {
        key: 'browse.factsServiceSingleRate',
        params: { count, service, location: place, rate: String(min), currency },
      };
    }
    return { key: 'browse.factsService', params: { count, service, location: place } };
  }

  const count = String(location.count);
  const services = names.join(', ');
  const min = finiteRate(location.minRate);
  const max = finiteRate(location.maxRate);
  if (services && min != null && max != null && min !== max) {
    return {
      key: 'browse.factsRate',
      params: {
        count,
        location: place,
        min: String(min),
        max: String(max),
        currency,
        services,
      },
    };
  }
  if (services && min != null) {
    return {
      key: 'browse.factsSingleRate',
      params: {
        count,
        location: place,
        rate: String(min),
        currency,
        services,
      },
    };
  }
  if (services) {
    return { key: 'browse.facts', params: { count, location: place, services } };
  }
  return { key: 'browse.factsCount', params: { count, location: place } };
}

export function countryFact(
  countryName: string,
  cities: readonly BrowseLocation[],
): { key: string; params: Record<string, string> } | null {
  if (!cities.length) {
    return null;
  }
  return {
    key: 'browse.factsCountry',
    params: {
      count: String(cities.length),
      country: countryName,
      cities: cities
        .slice(0, 3)
        .map((city) => city.locationName)
        .join(', '),
    },
  };
}
