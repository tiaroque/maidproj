import { Injectable, inject, signal } from '@angular/core';
// import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { CookieService } from 'ngx-cookie-service';
import { ItemValue } from '../admin/interfaces/common';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  public defaultLang = signal('en');

  readonly cookieService = inject(CookieService);

  public setDefaultLanguage(lang: string) {
    this.defaultLang.set(lang);
  }

  getLanguagesMenu(): ItemValue[] {
    return [
      { value: 'en', name: 'English' },
      { value: 'pt', name: 'Português' },
      { value: 'fr', name: 'Français' },
      { value: 'de', name: 'Deutsch' },
      { value: 'it', name: 'Italiano' },
      { value: 'es', name: 'Español' },
      { value: 'nl', name: 'Nederlands' },
    ];
  }

  public get currentLanguages() {
    return ['en', 'pt', 'de', 'fr', 'it', 'es', 'nl'];
  }

  matchSupportedLanguage(tags: readonly string[]) {
    const supported = new Set(this.currentLanguages);
    for (const tag of tags) {
      const normalized = tag.toLowerCase().trim();
      if (!normalized) {
        continue;
      }
      if (supported.has(normalized)) {
        return normalized;
      }
      const base = normalized.split('-')[0];
      if (supported.has(base)) {
        return base;
      }
    }
    return 'en';
  }

  // init() {
  //   if (isPlatformBrowser(this.platformId)) {
  //     const browserLang = this.translateService.getBrowserLang();
  //     const selectedLanguage =
  //       this.cookieService.get('lang') || browserLang || 'en';
  //     if (!selectedLanguage) {
  //       this.cookieService.set('lang', 'en', {
  //         path: '/',
  //       });
  //     }
  //     // this.translateService.setDefaultLang(selectedLanguage);
  //     return this.translateService.use(selectedLanguage);
  //   } else {
  //     let langcookie = this.cookiesSSRDecoderService.getCookie(
  //       'lang',
  //     ) as string;
  //     if (!langcookie) {
  //       langcookie = 'en';
  //     }
  //     return this.translateService.use(langcookie);
  //   }
  // }

  // changeLang(lang: string) {
  //   this.translateService.use(lang);
  //   if (isPlatformBrowser(this.platformId)) {
  //     this.cookieService.set('lng', lang);
  //   }
  // }
}
