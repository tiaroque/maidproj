/// <reference types="@angular/localize" />

import { environment } from '../environments/environment';

export const APP_LOCALES = ['de', 'it', 'fr', 'en', 'pt', 'es', 'nl'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/**
 * Locale id baked into a production build.
 * `@angular/localize` also reports `en` during `ng serve`, so development keeps
 * loading `/assets/i18n/{lang}.json` and can switch language in one app.
 */
export function compiledLocale(): AppLocale | undefined {
  if (!environment.production) {
    return undefined;
  }

  const locale = $localize.locale;
  return APP_LOCALES.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : undefined;
}
