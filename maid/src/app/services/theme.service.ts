import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookiesSSRDecoderService } from './shared/cookies-ssr-decode.service';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  private darkTheme = new BehaviorSubject<boolean>(false);
  private cookiesSSRDecoderService = inject(CookiesSSRDecoderService);
  private cookieService = inject(CookieService);
  isDarkTheme = this.darkTheme.asObservable();

  setDarkTheme(isDarkTheme: boolean): void {
    this.darkTheme.next(isDarkTheme);

    this.cookieService.set('isDarkTheme', isDarkTheme.toString(), {
      path: '/',
    });
  }

  constructor() {
    const theme = this.isBrowser
      ? this.cookieService.get('isDarkTheme')
      : this.cookiesSSRDecoderService.getCookie('isDarkTheme');
    const isTrueSet = theme === 'true';
    this.darkTheme.next(isTrueSet);
  }
}
