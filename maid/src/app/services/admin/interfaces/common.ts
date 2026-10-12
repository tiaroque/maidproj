export interface ItemValue {
  value: string;
  name: string;
}

export interface MeridianLocationResult {
  display_name: string;
  title: string;
  subtitle: string;
  hierarchy_subtitle: string;
  region_type?: string;
  location: {
    id: number;
    name: string;
    lineage: string;
  };
}

export interface MeridianSearchResponse {
  query: string;
  language: string;
  total: number;
  results: MeridianLocationResult[];
}

export type FilterType =
  | 'location'
  | 'services'
  | 'rate'
  | 'days'
  | 'slots'
  | 'languages'
  | 'online'
  | 'verified';

// Filters that hold one ItemFilter per selected value.
export type MultiFilterType = Extract<
  FilterType,
  'services' | 'days' | 'slots' | 'languages'
>;

// Filters with no value, switched on and off straight from their chip.
export type ToggleFilterType = Extract<FilterType, 'online' | 'verified'>;

export type FilterGroupsType = 'location' | 'services' | 'availability' | 'adicional';

export interface ItemFilter {
  value: string;
  name: string;
  type: FilterType;
  isRoot?: boolean;
}

// Material Icons ligatures.
export const filtersIcon: Record<FilterType, string> = {
  location: 'place',
  services: 'cleaning_services',
  rate: 'payments',
  days: 'calendar_month',
  slots: 'schedule',
  languages: 'translate',
  online: 'circle',
  verified: 'verified',
};

// Used in the store
export type FilterListState = {
  changingFiltersList: ItemFilter[]; // Filters used is changing before being applied to 'appliedFiltersList'
  appliedFiltersList: ItemFilter[]; // Filters applied in the page
  synced: boolean;
  filtersExpansion: Record<FilterGroupsType, boolean>;
};
