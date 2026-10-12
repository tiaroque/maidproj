import { UrlMatcher, UrlSegment } from '@angular/router';
import {
  APP_LOCALES,
  compiledLocale,
  type AppLocale,
} from '../../locale/compiled-locale';

// Kept apart from UtilsService so the root route does not pull date-fns,
// its locales and MatSnackBar into the initial bundle.

function localeFromPath(path: string | null | undefined): AppLocale | undefined {
  const first = path?.split(/[?#]/)[0]?.split('/').filter(Boolean)[0];
  return first && (APP_LOCALES as readonly string[]).includes(first)
    ? (first as AppLocale)
    : undefined;
}

export function activeLocale(): AppLocale {
  return getActiveLocale() ?? 'en';
}

function getActiveLocale(): AppLocale | undefined {
  // 1. Browser: check <base href> tag or window.location.pathname
  if (typeof document !== 'undefined') {
    const baseHref = document.querySelector('base')?.getAttribute('href');
    const fromBase = localeFromPath(baseHref);
    if (fromBase) {
      return fromBase;
    }

    if (typeof window !== 'undefined') {
      const fromWindow = localeFromPath(window.location?.pathname);
      if (fromWindow) {
        return fromWindow;
      }
    }
  }

  // 2. SSR (Node.js): read from AsyncLocalStorage attached to globalThis
  if (typeof globalThis !== 'undefined') {
    const storage = (globalThis as any).__SSR_LOCALE_STORAGE__;
    const storeLocale = storage?.getStore();
    if (storeLocale && (APP_LOCALES as readonly string[]).includes(storeLocale)) {
      return storeLocale as AppLocale;
    }
  }

  // 3. Fallback: compiled locale ($localize.locale)
  return compiledLocale();
}

export const langUrlMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  const first = segments[0]?.path;
  if (first && (APP_LOCALES as readonly string[]).includes(first)) {
    return { consumed: segments.slice(0, 1), posParams: { lang: segments[0] } };
  }

  // In production with localized builds (<base href="/pt/">), the locale prefix
  // is already consumed by the base href, leaving no language segment in the router.
  const locale = getActiveLocale();
  if (locale) {
    return {
      consumed: [],
      posParams: { lang: new UrlSegment(locale, {}) },
    };
  }

  return null;
};
