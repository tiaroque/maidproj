import { Params } from '@angular/router';
import { APP_LOCALES, type AppLocale } from '../../locale/compiled-locale';

export function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (APP_LOCALES as readonly string[]).includes(value);
}

/** Drop a leading locale segment. A direct load under `<base href="/pt/">` has already removed it. */
export function pageSegments(segments: readonly string[]): string[] {
  return isAppLocale(segments[0]) ? segments.slice(1) : [...segments];
}

/**
 * Locale root is `/pt/`, not `/pt`.
 * The compiled app lives at `<base href="/pt/">`. Opening `/pt` paints the
 * server page, then the client rewrites the address to `/pt/` and starts again.
 */
export function localeSwitchHref(
  lang: string,
  segments: readonly string[],
  queryParams?: Params,
): string {
  const page = pageSegments(segments).filter(Boolean).join('/');
  const path = page ? `/${lang}/${page}` : `/${lang}/`;
  const params = new URLSearchParams();
  for (const [key, param] of Object.entries(queryParams ?? {})) {
    if (param == null) {
      continue;
    }
    const values = Array.isArray(param) ? param : [param];
    for (const item of values) {
      params.append(key, String(item));
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
