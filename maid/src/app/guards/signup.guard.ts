import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';
import { LanguageService } from '../services/shared/language-service.service';

export const canActivateSignUp2: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const languageService = inject(LanguageService);

  return authService.checkAuth().pipe(
    map((value) => {
      if (!value.emailVerified) {
        return router.createUrlTree([languageService.defaultLang(), 'login']);
      }

      if (value.hasUserType) {
        return router.createUrlTree([
          languageService.defaultLang(),
          'admin',
          'list',
        ]);
      }

      return true;
    }),
    catchError(() => {
      return of(router.createUrlTree([languageService.defaultLang(), 'login']));
    }),
  );
};
