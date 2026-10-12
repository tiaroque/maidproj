import { inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import {
  entityConfig,
  SelectEntityId,
  withEntities,
  setAllEntities,
} from '@ngrx/signals/entities';
import { ChatState } from './store';
import { ItemValue } from '../interfaces/common';
import { AssetsService } from '../assets.service';
import { firstValueFrom } from 'rxjs';
import { MeUser } from './user.feature';

export const selectNationalityId: SelectEntityId<ItemValue> = (nationality) =>
  nationality.value;

const nationalityConfig = entityConfig({
  entity: type<ItemValue>(),
  collection: 'nationality',
  selectId: selectNationalityId,
});

export function withAssetsFeature<_>() {
  return signalStoreFeature(
    {
      state: type<ChatState & MeUser>(),
    },
    withEntities(nationalityConfig),
    withMethods((store, assetsService = inject(AssetsService)) => ({
      async loadCountries(lang: string) {
        try {
          const countries = await firstValueFrom(
            assetsService.getCountries(lang),
          );

          patchState(
            store,
            setAllEntities(countries, {
              collection: 'nationality',
              selectId: selectNationalityId,
            }),
          );
        } catch (error) {
          console.error('Failed to load countries', error);
        }
      },
    })),
  );
}
