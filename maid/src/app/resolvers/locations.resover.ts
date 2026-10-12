import { ActivatedRouteSnapshot } from '@angular/router';
import { AssetsService } from '../services/admin/assets.service';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const addLocationsResolver = (route: ActivatedRouteSnapshot) => {
  const translateService = inject(TranslateService);
  const assetsService = inject(AssetsService);

  const lang = translateService.currentLang;

  return assetsService.getCountries(lang);
};
