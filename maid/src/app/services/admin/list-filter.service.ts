import { inject, Injectable, signal, effect } from '@angular/core';
import { form } from '@angular/forms/signals';
import { ChatStore } from './signals/store';
import { Sliders } from './list.service';
import { ItemFilter, MultiFilterType, ToggleFilterType } from './interfaces/common';
import { TranslateService } from '@ngx-translate/core';
import {
  MAX_RATE,
  MIN_RATE,
  SERVICES,
} from './interfaces/service-catalog';
import { Params, Router } from '@angular/router';
import { LanguageService } from '../shared/language-service.service';
import {
  defaultListFilter,
  listFilterSchema,
  RATE_SLIDER_MAX,
} from '../../forms/list-filter-form';
import { USER_TYPE_VALUES } from '../user.service';

// Translation prefix for the label of each value in a multi-value filter.
const MULTI_LABEL_PREFIX: Record<Exclude<MultiFilterType, 'languages'>, string> = {
  services: 'services.',
  days: 'days.',
  slots: 'slots.',
};

@Injectable({
  providedIn: 'root',
})
export class ListFilterService {
  languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;
  router = inject(Router);
  storeChat = inject(ChatStore);
  private translateService = inject(TranslateService);

  readonly filterModel = signal(defaultListFilter());
  readonly filterForm = form(this.filterModel, listFilterSchema);

  sliders: Sliders = {
    rate: {
      min: MIN_RATE,
      max: RATE_SLIDER_MAX,
    },
  };

  constructor() {
    effect(() => {
      this.storeChat.toggleFiltersSynced(!this.filterForm().dirty());
    });
  }

  changeSliderFilters() {
    const rateMin = this.filterForm.rateMin().value();
    const rateMax = this.filterForm.rateMax().value();

    if (rateMin === this.sliders.rate.min && rateMax === this.sliders.rate.max) {
      this.storeChat.removeFilters('rate', 'changing');
      return;
    }

    const openEnded = rateMax === this.sliders.rate.max;
    const filterItem: ItemFilter = {
      value: `${rateMin}-${openEnded ? MAX_RATE : rateMax}`,
      name: openEnded ? `${rateMin}+ / h` : `${rateMin} - ${rateMax} / h`,
      type: 'rate',
    };
    this.storeChat.replaceFilter(filterItem);
  }

  // Services, days and slots are edited as chip lists in the form and become
  // one filter per value when applied.
  syncMultiFilters() {
    (Object.keys(MULTI_LABEL_PREFIX) as Array<keyof typeof MULTI_LABEL_PREFIX>).forEach(
      (type) => {
        const values = this.filterForm[type]().value() as string[];
        this.storeChat.replaceFiltersOfType(
          type,
          values.map((value) => ({
            value,
            name: this.translateService.instant(MULTI_LABEL_PREFIX[type] + value),
            type,
          })),
        );
      },
    );
  }

  clearRemovedFilter(filter: ItemFilter) {
    switch (filter.type) {
      case 'languages':
      case 'services':
      case 'days':
      case 'slots': {
        this.storeChat.removeFilterByValue(filter.value, 'applied', filter.type);
        this.storeChat.removeFilterByValue(filter.value, 'changing', filter.type);
        const field = this.filterForm[filter.type]();
        (field.value as any).set(
          (field.value() as string[]).filter((value) => value !== filter.value),
        );
        break;
      }
      default: {
        this.storeChat.removeFilters(filter.type, 'applied');
        this.storeChat.removeFilters(filter.type, 'changing');
        if (filter.type === 'location') {
          this.filterForm.country().value.set('');
          this.filterForm.location().value.set('');
        }
        if (filter.type === 'rate') {
          const defaults = defaultListFilter();
          this.filterForm.rateMin().value.set(defaults.rateMin);
          this.filterForm.rateMax().value.set(defaults.rateMax);
        }
      }
    }

    this.storeChat.storeFilter();
  }

  isToggleFilterApplied(type: ToggleFilterType) {
    return this.storeChat
      .appliedFiltersList()
      .some((filter) => filter.type === type);
  }

  // Applied immediately, without waiting for the Apply button, and without
  // committing other pending changes in the filter form.
  toggleFilter(type: ToggleFilterType) {
    if (this.isToggleFilterApplied(type)) {
      this.storeChat.removeFilters(type, 'applied');
      this.storeChat.removeFilters(type, 'changing');
    } else {
      this.storeChat.addAppliedFilter({ value: type, name: type, type });
    }
    this.storeChat.storeFilter();
  }

  // Fill the Filtering Fields FORM on Load page
  setFormFromStorage(filters: ItemFilter[]) {
    filters.forEach((filter) => {
      switch (filter.type) {
        case 'location': {
          const separatorIndex = filter.value.indexOf('-');
          const location = filter.value.slice(separatorIndex + 1);
          this.filterForm
            .country()
            .value.set(filter.value.slice(0, separatorIndex));
          // 'null' means the filter is country-only, so there is no location.
          this.filterForm
            .location()
            .value.set(location === 'null' ? '' : filter.value);
          break;
        }

        case 'languages':
        case 'services':
        case 'days':
        case 'slots': {
          const field = this.filterForm[filter.type]();
          (field.value as any).set([...(field.value() as string[]), filter.value]);
          break;
        }
        case 'rate': {
          const [min, max] = filter.value.split('-').map(Number);
          this.filterForm.rateMin().value.set(min);
          this.filterForm.rateMax().value.set(Math.min(max, RATE_SLIDER_MAX));
          break;
        }
        case 'online':
        case 'verified':
        case 'openToRelocate':
          break;
      }
    });
    this.filterForm().reset();
  }

  generateGlobalFiltersMap(globalFilters: ItemFilter[]) {
    const mapOfFilters = new Map<string, string[]>();
    globalFilters.forEach((filter) => {
      switch (filter.type) {
        case 'location': {
          const separatorIndex = filter.value.indexOf('-');
          const country = filter.value.slice(0, separatorIndex);
          const location = filter.value.slice(separatorIndex + 1);
          if (location !== 'null') {
            mapOfFilters.set(filter.type, [location]);
          }
          mapOfFilters.set('country', [country]);
          break;
        }

        case 'languages':
        case 'services':
        case 'days':
        case 'slots': {
          const values = mapOfFilters.get(filter.type);
          mapOfFilters.set(filter.type, [...(values || []), filter.value]);
          break;
        }

        case 'online':
        case 'verified':
        case 'openToRelocate': {
          mapOfFilters.set(filter.type, ['true']);
          break;
        }
        // Range filters
        default: {
          const filterValues = filter.value.split('-');
          mapOfFilters.set(filter.type, filterValues);
        }
      }
    });

    return mapOfFilters;
  }

  navigateQuickSearchParams() {
    const location = this.filterForm.location().value();
    const separatorIndex = location.indexOf('-');
    const locationName = this.storeChat
      .changingFiltersList()
      .find((filter) => filter.type === 'location' && filter.value === location)
      ?.name;

    const params: Params = {
      type: this.filterForm.gender().value() || null,
      service: this.filterForm.service().value() || null,
      country: this.filterForm.country().value() || null,
      location: separatorIndex < 0 ? null : location.slice(separatorIndex + 1),
      locationName: separatorIndex < 0 ? null : (locationName ?? null),
    };

    return params;
  }

  public validateQuickSearchParams(params: Params) {
    const type = params['type'];
    const service = params['service'];
    const country = params['country'];
    const location = params['location'];

    if (type && !USER_TYPE_VALUES.includes(type)) {
      return false;
    }

    if (service && !SERVICES.includes(service)) {
      return false;
    }

    if (location && !location.startsWith('/')) {
      return false;
    }

    const locationValue = country && location ? `${country}-${location}` : '';
    // The location input's displayWith resolves the name from the store, so
    // the filter must be in place before the form value is written.
    if (locationValue) {
      this.storeChat.replaceFilter({
        type: 'location',
        value: locationValue,
        name: params['locationName'] ?? '',
      });
    }

    this.filterForm.gender().value.set(type ?? '');
    this.filterForm.service().value.set(service ?? '');
    this.filterForm.country().value.set(country ?? '');
    this.filterForm.location().value.set(locationValue);
    this.filterForm().reset();

    return true;
  }

  resetFilters() {
    this.filterModel.set(defaultListFilter());
    this.filterForm().reset();
    this.storeChat.clearAllFilters();
  }
}
