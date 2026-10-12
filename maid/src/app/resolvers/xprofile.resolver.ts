import { inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { AssetsService } from '../services/admin/assets.service';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

// export const xprofileResolver = (route: ActivatedRouteSnapshot) => {
//   const platformId = inject(PLATFORM_ID);
//   const isBrowser = isPlatformBrowser(platformId);

//   const assetsService = inject(AssetsService);
//   const translateService = inject(TranslateService);
//   debugger;
//   return isBrowser
//     ? assetsService.getCountries(translateService.currentLang)
//     : [];
// };
