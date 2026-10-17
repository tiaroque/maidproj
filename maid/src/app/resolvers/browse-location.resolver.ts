import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
} from '@angular/router';
import { map } from 'rxjs';
import { BrowseLocationsService } from '../services/shared/browse-locations.service';
import { LanguageService } from '../services/shared/language-service.service';

// Resolves /browse/:country(/:city(/:service)) to the filters the list API
// matches on. An unknown place, or a service nobody covers there, has no page
// of its own, so it 404s on the requested URL rather than redirecting to an
// unfiltered list, which would leave a soft 404 in the index.
export const browseLocationResolver = (route: ActivatedRouteSnapshot) => {
  const browseLocations = inject(BrowseLocationsService);
  const router = inject(Router);
  const languageService = inject(LanguageService);

  return browseLocations
    .resolve(route.params['country'], route.params['city'], route.params['service'])
    .pipe(
      map((resolved) => {
        if (!resolved) {
          return new RedirectCommand(
            router.parseUrl(`/${languageService.defaultLang()}/not-found`),
            { skipLocationChange: true },
          );
        }
        return resolved;
      }),
    );
};
