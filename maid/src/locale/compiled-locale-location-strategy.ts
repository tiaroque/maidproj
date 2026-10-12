import { PathLocationStrategy } from '@angular/common';
import { Injectable } from '@angular/core';
import { APP_LOCALES, type AppLocale } from './compiled-locale';

/**
 * Localized builds already live under `/en`, `/pt`, and so on.
 * Router links still start with that language, which would produce `/pt/pt/...`.
 * Collapse that repeated prefix in the browser URL and in server-rendered hrefs.
 *
 * The locale comes from the base href because `$localize.locale` is not set
 * during server rendering.
 */
@Injectable()
export class CompiledLocaleLocationStrategy extends PathLocationStrategy {
  override prepareExternalUrl(internal: string): string {
    const external = super.prepareExternalUrl(internal);
    const locale = this.baseLocale();
    if (!locale) {
      return external;
    }

    const doubled = `/${locale}/${locale}`;
    let normalized = external;
    if (
      external === doubled ||
      external.startsWith(`${doubled}/`) ||
      external.startsWith(`${doubled}?`) ||
      external.startsWith(`${doubled}#`)
    ) {
      normalized = `/${locale}${external.slice(doubled.length)}`;
    }

    // Home must stay `/pt/`. `/pt` is a different URL from the base href,
    // and the client would load the page a second time to add the slash.
    const root = `/${locale}`;
    if (
      normalized === root ||
      normalized.startsWith(`${root}?`) ||
      normalized.startsWith(`${root}#`)
    ) {
      return `${root}/${normalized.slice(root.length)}`;
    }

    return normalized;
  }

  private baseLocale(): AppLocale | undefined {
    const first = this.getBaseHref().split('/').filter(Boolean)[0];
    return (APP_LOCALES as readonly string[]).includes(first)
      ? (first as AppLocale)
      : undefined;
  }
}
