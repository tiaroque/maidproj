import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { map } from 'rxjs';
import { LanguageService } from '../services/shared/language-service.service';

// Get language from url in order to setup the application
export const langResolver = (route: ActivatedRouteSnapshot) => {
  const translateService = inject(TranslateService);
  const languageService = inject(LanguageService);
  const cookieService = inject(CookieService);
  const document = inject(DOCUMENT);

  const platformId = inject(PLATFORM_ID);
  const lang = route.params['lang'];

  const resolvedLang = languageService.currentLanguages.includes(lang)
    ? lang
    : 'en';

  const apply = () => {
    languageService.setDefaultLanguage(resolvedLang);
    document.documentElement.lang = resolvedLang;

    if (isPlatformBrowser(platformId)) {
      cookieService.set('lang', resolvedLang, {
        path: '/',
      });
    }

    return resolvedLang;
  };

  // Startup already loaded this language. Calling use() again emits
  // onLangChange during hydration and the server HTML is drawn a second time.
  if (translateService.getCurrentLang() === resolvedLang) {
    return apply();
  }

  return translateService.use(resolvedLang).pipe(map(() => apply()));
};
