import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  InMemoryScrollingFeature,
  InMemoryScrollingOptions,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { DOCUMENT, LocationStrategy } from '@angular/common';
import {
  BrowserModule,
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import {
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { CookieService } from 'ngx-cookie-service';
import { provideTranslateLoader, provideTranslateService, TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from 'rxjs';
import { CompiledLocaleLocationStrategy } from '../locale/compiled-locale-location-strategy';
import { CompiledTranslateLoader } from '../locale/compiled-translate-loader';
import { PublicPreloadStrategy } from './public-preload.strategy';
import { SeoService } from './services/seo.service';
import { LanguageService } from './services/shared/language-service.service';
import { activeLocale } from './utils/lang-url-matcher';


const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const inMemoryScrollingFeature: InMemoryScrollingFeature =
  withInMemoryScrolling(scrollConfig);

// Only these public endpoints may have their SSR response embedded in the page
// for the browser to reuse while hydrating. Everything else is excluded, so no
// per-user response can reach the HTML even if a call omits `withCredentials`.
const transferCachePaths = new Set([
  '/api/list/browse',
  '/api/list/latestOffers',
]);

const isTransferCacheable = (req: HttpRequest<unknown>) =>
  transferCachePaths.has(
    new URL(req.url, 'http://transfer-cache.invalid').pathname,
  );

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    { provide: LocationStrategy, useClass: CompiledLocaleLocationStrategy },
    provideRouter(
      appRoutes,
      inMemoryScrollingFeature,
      withPreloading(PublicPreloadStrategy),
      // withDebugTracing(),
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
      }),
    ),
    importProvidersFrom(BrowserModule),
    CookieService,

    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      loader: provideTranslateLoader(CompiledTranslateLoader),
      fallbackLang: 'en',
    }),
    // provideStore(),
    // isDevMode() ? provideStoreDevtools() : [],
    // provideAppInitializer(() => {
    //   inject(LanguageService).init();
    // }),
    provideClientHydration(
      withHttpTransferCacheOptions({ filter: isTransferCacheable }),
    ),
    provideAppInitializer(() => {
      const lang = activeLocale();
      const document = inject(DOCUMENT);
      const translate = inject(TranslateService);
      inject(LanguageService).setDefaultLanguage(lang);
      document.documentElement.lang = lang;
      // Translations have to be in place before hydration. Otherwise the server
      // text is replaced when the client renders the page a second time.
      return firstValueFrom(translate.use(lang)).then(
        () => undefined,
        () => undefined,
      );
    }),
    provideAppInitializer(() => {
      inject(SeoService);
    }),
  ],
};
