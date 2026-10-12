import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { map } from 'rxjs';
import { LanguageService } from '../services/shared/language-service.service';

// Used to load the profile-view page
export const findUserDetailResolver = (route: ActivatedRouteSnapshot) => {
  const userService = inject(UserService);
  const router = inject(Router);
  const languageService = inject(LanguageService);
  const userId = route.params['uid'];
  return userService.getDetailsOtherUser(userId).pipe(
    map((userDetails) => {
      if (!userDetails) {
        return router.navigate([languageService.defaultLang(), 'login']);
      }
      return userDetails;
    }),
  );
};

export const findUserDetailResolverHome = (route: ActivatedRouteSnapshot) => {
  const userService = inject(UserService);
  const router = inject(Router);
  const languageService = inject(LanguageService);
  const userId = route.params['uid'];
  return userService.getDetailsOtherUserHome(userId).pipe(
    map((userDetails) => {
      if (!userDetails) {
        // Keeping the requested URL lets the server answer 404 instead of a
        // redirect, so search engines drop deleted profiles.
        return new RedirectCommand(
          router.parseUrl(`/${languageService.defaultLang()}/not-found`),
          { skipLocationChange: true },
        );
      }
      return userDetails;
    }),
  );
};
