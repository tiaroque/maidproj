import { maxLength, readonly, schema } from '@angular/forms/signals';
import {
  DayKey,
  MIN_RATE,
  ServiceKey,
  SlotKey,
} from '../services/admin/interfaces/service-catalog';

// The rate slider stops here; its top position means "and above".
export const RATE_SLIDER_MAX = 100;

export interface ListFilterModel {
  // Role to browse in the public quick search.
  gender: string;
  // Single service picked in the public quick search.
  service: string;
  country: string;
  location: string;
  services: ServiceKey[];
  days: DayKey[];
  slots: SlotKey[];
  rateMin: number;
  rateMax: number;
  languages: string[];
}

export function defaultListFilter(): ListFilterModel {
  return {
    gender: '',
    service: '',
    country: '',
    location: '',
    services: [],
    days: [],
    slots: [],
    rateMin: MIN_RATE,
    rateMax: RATE_SLIDER_MAX,
    languages: [],
  };
}

export const listFilterSchema = schema<ListFilterModel>((p) => {
  readonly(p.location, {
    when: ({ valueOf }) => !valueOf(p.country),
  });
  maxLength(p.location, 80);
});
