import { isPlatformBrowser } from '@angular/common';
import { REQUEST, inject, PLATFORM_ID } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { CookiesSSRDecoderService } from '../services/shared/cookies-ssr-decode.service';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '../services/shared/language-service.service';

const acceptLanguageTags = (header: string | null) => {
  if (!header) {
    return [];
  }

  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qualityParam = params.find((param) =>
        param.trim().startsWith('q='),
      );
      const quality = qualityParam ? Number(qualityParam.split('=')[1]) : 1;
      return {
        tag: tag.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((item) => item.tag)
    .sort((a, b) => b.quality - a.quality)
    .map((item) => item.tag);
};

const requestLanguageTags = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformBrowser(platformId)) {
    if (navigator.languages?.length) {
      return [...navigator.languages];
    }
    return navigator.language ? [navigator.language] : [];
  }

  const request = inject(REQUEST, { optional: true });
  return acceptLanguageTags(request?.headers.get('accept-language') ?? null);
};

// When the URL DOESN'T MATCH the language,
// Get Previous Default lang values to redirect to the current Lang
export const canActivateLang: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const cookiesSSRDecoderService = inject(CookiesSSRDecoderService);
  const cookieService = inject(CookieService);
  const languageService = inject(LanguageService);
  const isBrowser = isPlatformBrowser(platformId);

  const lang = isBrowser
    ? cookieService.get('lang')
    : cookiesSSRDecoderService.getCookie('lang');

  const savedLang = languageService.currentLanguages.includes(lang)
    ? lang
    : '';
  const defautlLang =
    savedLang || languageService.matchSupportedLanguage(requestLanguageTags());

  if (route.url[0]?.path === 'manage') {
    const newUrl = router.createUrlTree([defautlLang, 'manage'], {
      queryParams: route.queryParams,
    });
    return newUrl;
  }

  if (route.url[0]?.path === 'privacy') {
    const newUrl = router.createUrlTree([defautlLang, 'privacy'], {
      queryParams: route.queryParams,
    });
    return newUrl;
  }

  if (route.url[0]?.path === 'terms-conditions') {
    const newUrl = router.createUrlTree([defautlLang, 'terms-conditions'], {
      queryParams: route.queryParams,
    });
    return newUrl;
  }

  return router.navigate([defautlLang], { queryParams: route.queryParams });

  // if (isPlatformBrowser(platformId)) {
  //   return true;
  // } else {
  //   let defautlLang = 'en';
  //   const langcookie = cookiesSSRDecoderService.getCookie('lang') as string;

  //   if (langcookie) {
  //     defautlLang = langcookie;
  //   }
  //   console.log('SERVER COOKIE DEFAULT LANG: ', defautlLang);
  //   return router.navigate([defautlLang], { queryParams: route.queryParams });
  // }
};
