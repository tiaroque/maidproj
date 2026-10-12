import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ChatState } from './store';
import {
  FilterGroupsType,
  FilterListState,
  FilterType,
  ItemFilter,
} from '../interfaces/common';
import { produce } from 'immer';
import { inject, PLATFORM_ID } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { CookiesSSRDecoderService } from '../../shared/cookies-ssr-decode.service';
import { isPlatformBrowser } from '@angular/common';

export const initListFiltersState: FilterListState = {
  changingFiltersList: [],
  appliedFiltersList: [],
  synced: true,
  filtersExpansion: {
    location: true,
    services: false,
    availability: false,
    adicional: false,
  },
};

export function withListFiltersFeature<_>() {
  return signalStoreFeature(
    {
      state: type<ChatState>(),
    },
    withState<FilterListState>(initListFiltersState),
    withMethods(
      (
        store,
        cookieService = inject(CookieService),
        cookiesSSRDecoderService = inject(CookiesSSRDecoderService),
        platformId = inject(PLATFORM_ID),
      ) => ({
        storeFilter() {
          cookieService.set(
            'appliedFilters',
            JSON.stringify(store.appliedFiltersList()),
            {
              path: '/',
            },
          );
        },
        storeExpansionPanelFilters() {
          cookieService.set(
            'expansionPanels',
            JSON.stringify(store.filtersExpansion()),
            {
              path: '/',
            },
          );
        },
        loadFromStorage() {
          let storedFilters: ItemFilter[] = [];
          const isBrowser = isPlatformBrowser(platformId);
          // const appliedFiltersJson = cookieService.get('appliedFilters');

          const appliedFiltersJson = isBrowser
            ? cookieService.get('appliedFilters')
            : cookiesSSRDecoderService.getCookie('appliedFilters');

          if (appliedFiltersJson) {
            storedFilters = JSON.parse(appliedFiltersJson) as ItemFilter[];
            patchState(store, { appliedFiltersList: storedFilters });
            patchState(store, { changingFiltersList: storedFilters });
          }

          const appliedExpansionPanelsJson = isBrowser
            ? cookieService.get('expansionPanels')
            : cookiesSSRDecoderService.getCookie('expansionPanels');

          if (appliedExpansionPanelsJson) {
            const expansionPanels = JSON.parse(
              appliedExpansionPanelsJson,
            ) as Record<FilterGroupsType, boolean>;
            patchState(store, { filtersExpansion: expansionPanels });
          }
        },
      }),
    ),
    withMethods((store) => ({
      // Remove filter that can only have one set at a time
      removeFilters(type: FilterType, storeType: 'applied' | 'changing') {
        patchState(store, (state) =>
          produce(state, (draft) => {
            if (storeType === 'changing') {
              draft.changingFiltersList = draft.changingFiltersList.filter(
                (item) => item.type !== type,
              );
            }
            if (storeType === 'applied') {
              draft.appliedFiltersList = draft.appliedFiltersList.filter(
                (item) => item.type !== type,
              );
            }
          }),
        );
      },
      // Used in filters that hold several values (services, days, slots, languages).
      removeFilterByValue(
        value: string,
        storeType: 'applied' | 'changing',
        type?: FilterType,
      ) {
        const keep = (item: ItemFilter) =>
          item.value !== value || (!!type && item.type !== type);
        patchState(store, (state) =>
          produce(state, (draft) => {
            if (storeType === 'changing') {
              draft.changingFiltersList = draft.changingFiltersList.filter(keep);
            }
            if (storeType === 'applied') {
              draft.appliedFiltersList = draft.appliedFiltersList.filter(keep);
            }
          }),
        );
      },
      // Swaps every pending value of a multi-value filter for a new set.
      replaceFiltersOfType(type: FilterType, options: ItemFilter[]) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.changingFiltersList = [
              ...draft.changingFiltersList.filter((item) => item.type !== type),
              ...options,
            ];
          }),
        );
      },
      // Used in filters that can only have one option set
      replaceFilter(option: ItemFilter) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            // removes the previous type of this new option to replace by the new option
            draft.changingFiltersList = draft.changingFiltersList.filter(
              (item) => item.type != option.type,
            );
            draft.changingFiltersList.push(option);
          }),
        );
      },
      // Writes to both lists so a later applyFilters() keeps it.
      addAppliedFilter(option: ItemFilter) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.changingFiltersList = [
              ...draft.changingFiltersList.filter(
                (item) => item.type !== option.type,
              ),
              option,
            ];
            draft.appliedFiltersList = [
              ...draft.appliedFiltersList.filter(
                (item) => item.type !== option.type,
              ),
              option,
            ];
          }),
        );
      },
      addFilter(item: ItemFilter) {
        if (
          store
            .changingFiltersList()
            .map((item) => item.value)
            .every((val) => val !== item.value)
        ) {
          patchState(store, (state) =>
            produce(state, (draft) => {
              draft.changingFiltersList.push(item);
            }),
          );
        }
      },
      applyFilters() {
        patchState(store, (state) =>
          produce(state, (draft) => {
            // Copy 'changingFiltersList' to the current 'appliedFiltersList'
            draft.appliedFiltersList = [...draft.changingFiltersList];
          }),
        );

        store.storeFilter();
      },
      clearAllFilters() {
        patchState(store, {
          appliedFiltersList: [],
          changingFiltersList: [],
        });
        store.storeFilter();
      },
      toggleFiltersSynced(synced: boolean) {
        // patchState(store, (state) => ({ synced: !state.synced }));
        patchState(store, { synced });
      },
      // Saves
      toggleFiltersExpansionPanel(type: FilterGroupsType, value: boolean) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.filtersExpansion[type] = value;
          }),
        );

        store.storeExpansionPanelFilters();
      },
    })),
  );
}
