import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  CanActivateFn,
  Router,
} from '@angular/router';
import { LanguageService } from '../services/shared/language-service.service';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const canActivateUser2: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const languageService = inject(LanguageService);
  return authService.checkAuth().pipe(
    map((value) => {
      console.log('auth Guard checkAuth ', value);
      if (!value.emailVerified) {
        return router.createUrlTree([languageService.defaultLang(), 'login']);
      }

      if (!value.hasUserType) {
        return router.createUrlTree([
          languageService.defaultLang(),
          'admin',
          'signup',
        ]);
      }

      return true;
    }),
    catchError(() => {
      return of(router.createUrlTree([languageService.defaultLang(), 'login']));
    }),
  );
};
