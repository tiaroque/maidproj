import { PLATFORM_ID, inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../services/shared/language-service.service';
import { isAppApi } from '../utils/api-url';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const languageService = inject(LanguageService);
  const router = inject(Router);

  if (isPlatformBrowser(platformId)) {
    return next(req).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse) {
          const isUnauthorized = err.status === 401;
          if (!isUnauthorized) {
            console.error(
              'Client auth interceptor error',
              req.url,
              err.status,
              err.message,
            );
          }
          if (isUnauthorized && isAppApi(req.url)) {
            router.navigate([languageService.defaultLang(), 'login']);
          }
        }

        return throwError(() => err);
      }),
    );
  }

  return next(req).pipe(
    catchError((err) => {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      const message =
        err instanceof HttpErrorResponse
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);

      // 401 is expected when SSR renders /admin without a session cookie.
      if (status !== 401) {
        console.error('Server auth interceptor error', req.url, status, message);
      }

      return throwError(() => err);
    }),
  );
};
