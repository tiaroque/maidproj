import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import compression from 'compression';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const apiProxyTarget =
  process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:3000';
const meridianApiUpstream =
  process.env['MERIDIAN_API_UPSTREAM'] ?? 'http://127.0.0.1:3000';

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  if (req.hostname === 'linpura.com') {
    res.redirect(308, `https://www.linpura.com${req.originalUrl}`);
    return;
  }
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
});
app.use(compression({ level: 8 }));
app.use(cors());

const allowedHosts = [
  'localhost',
  '127.0.0.1',
  'linpura.com',
  'www.linpura.com',
  ...(process.env['NG_ALLOWED_HOSTS'] ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean),
];

const angularApp = new AngularNodeAppEngine({
  allowedHosts,
});

const apiProxy = createProxyMiddleware({
  pathFilter: '/api',
  target: apiProxyTarget,
  changeOrigin: true,
  ws: true,
});

// Browser calls same-origin /meridian/api/...; meridian-be serves /locations/search.
const meridianProxy = createProxyMiddleware({
  pathFilter: '/meridian/api',
  target: meridianApiUpstream,
  changeOrigin: true,
  pathRewrite: { '^/meridian/api': '' },
});

app.use(meridianProxy);
app.use(apiProxy);

const locales = new Set(['en', 'pt', 'fr', 'de', 'it', 'es', 'nl']);

export const ssrLocaleStorage = new AsyncLocalStorage<string>();
(globalThis as any).__SSR_LOCALE_STORAGE__ = ssrLocaleStorage;

const publicPages = ['', 'browse', 'register', 'terms-conditions', 'privacy'];

interface SitemapLocationService {
  service: string;
  count: number;
  indexable: boolean;
}

interface SitemapLocation {
  country: string;
  location: string;
  locationName: string;
  count: number;
  indexable: boolean;
  services: SitemapLocationService[];
}

// Mirrors BROWSE_COUNTRIES and SERVICE_SLUGS in
// src/app/utils/browse-locations.ts. The sitemap is built in Express, outside
// the Angular injector, so the slugs are repeated here rather than imported
// through the browser bundle.
const COUNTRY_SLUGS: Record<string, string> = {
  PT: 'portugal',
  DE: 'germany',
  FR: 'france',
  ES: 'spain',
  IT: 'italy',
  CH: 'switzerland',
  NL: 'netherlands',
  GB: 'united-kingdom',
};

const SERVICE_SLUGS: Record<string, string> = {
  regular: 'regular-cleaning',
  deep: 'deep-cleaning',
  ironing: 'ironing',
  laundry: 'laundry',
  windows: 'window-cleaning',
  moveInOut: 'move-in-move-out',
  afterParty: 'after-party-cleaning',
  kitchenAppliances: 'oven-and-fridge',
  cooking: 'cooking',
  office: 'office-cleaning',
  ecoProducts: 'eco-friendly-cleaning',
};

function slugifyLocation(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface SitemapProfile {
  uid: string;
  creationDate?: string;
  updateDate?: string;
}

const SITEMAP_PROFILES_TTL_MS = 60 * 60 * 1000;
let sitemapProfilesCache: { at: number; profiles: SitemapProfile[] } | null =
  null;

// Profile ids come from the API and are cached for an hour. If the API is
// unreachable the last good list (or none) is used, so the sitemap still serves.
async function loadSitemapProfiles(): Promise<SitemapProfile[]> {
  if (
    sitemapProfilesCache &&
    Date.now() - sitemapProfilesCache.at < SITEMAP_PROFILES_TTL_MS
  ) {
    return sitemapProfilesCache.profiles;
  }
  try {
    const response = await fetch(
      `${apiProxyTarget}/api/list/sitemap-profiles`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const profiles = ((await response.json()) as SitemapProfile[]).filter(
      (profile) => /^[\w-]+$/.test(profile.uid ?? ''),
    );
    sitemapProfilesCache = { at: Date.now(), profiles };
    return profiles;
  } catch (error) {
    console.error('Sitemap: could not load profiles', error);
    return sitemapProfilesCache?.profiles ?? [];
  }
}

const SITEMAP_LOCATIONS_TTL_MS = 60 * 60 * 1000;
let sitemapLocationsCache: { at: number; locations: SitemapLocation[] } | null =
  null;

async function loadSitemapLocations(): Promise<SitemapLocation[]> {
  if (
    sitemapLocationsCache &&
    Date.now() - sitemapLocationsCache.at < SITEMAP_LOCATIONS_TTL_MS
  ) {
    return sitemapLocationsCache.locations;
  }
  try {
    const response = await fetch(
      `${apiProxyTarget}/api/list/sitemap-locations`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const locations = ((await response.json()) as SitemapLocation[]).filter(
      (entry) => COUNTRY_SLUGS[entry.country] && entry.locationName,
    );
    sitemapLocationsCache = { at: Date.now(), locations };
    return locations;
  } catch (error) {
    console.error('Sitemap: could not load locations', error);
    return sitemapLocationsCache?.locations ?? [];
  }
}

// Mirrors indexLocations(): the busiest place keeps a slug it would otherwise
// share, so the sitemap never lists a URL that resolves to a different page.
// Slug ownership is decided over every place, not just the indexable ones, so
// a quiet one can never take a slug that a busier one already renders at.
function browseLocationPaths(locations: SitemapLocation[]) {
  const taken = new Set<string>();
  const paths: string[] = [];

  // Mirrors countryHasCleaners(): a country with no cleaners renders "No
  // results" and is noindexed, so it is left out. If the API is down the list
  // is unknown and every country stays in, as the page does.
  const supplied = new Set(
    locations.filter((entry) => entry.count > 0).map((entry) => entry.country),
  );
  for (const [code, slug] of Object.entries(COUNTRY_SLUGS)) {
    if (!locations.length || supplied.has(code)) {
      paths.push(`/browse/${slug}`);
    }
  }

  for (const entry of [...locations].sort((a, b) => b.count - a.count)) {
    const countrySlug = COUNTRY_SLUGS[entry.country];
    const citySlug = slugifyLocation(entry.locationName);
    if (!countrySlug || !citySlug) {
      continue;
    }
    const cityPath = `/browse/${countrySlug}/${citySlug}`;
    if (taken.has(cityPath)) {
      continue;
    }
    taken.add(cityPath);
    // The pages exist either way; only those over the index threshold are
    // advertised here, to match the noindex the page itself carries.
    if (entry.indexable) {
      paths.push(cityPath);
    }
    for (const service of entry.services ?? []) {
      const serviceSlug = SERVICE_SLUGS[service.service];
      if (serviceSlug && service.indexable) {
        paths.push(`${cityPath}/${serviceSlug}`);
      }
    }
  }

  return paths;
}

function sitemapEntries(origin: string, suffix: string, lastmod?: string) {
  const localeList = [...locales];
  const alternates = localeList
    .map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${origin}/${locale}${suffix}"/>`,
    )
    .concat(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/en${suffix}"/>`,
    )
    .join('\n');
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return localeList.map(
    (locale) => `  <url>
    <loc>${origin}/${locale}${suffix}</loc>${lastmodTag}
${alternates}
  </url>`,
  );
}

app.get('/sitemap.xml', async (_req, res) => {
  const origin = 'https://www.linpura.com';
  const [profiles, locations] = await Promise.all([
    loadSitemapProfiles(),
    loadSitemapLocations(),
  ]);
  const urls = [
    ...publicPages.flatMap((page) =>
      sitemapEntries(origin, page ? `/${page}` : '/'),
    ),
    ...browseLocationPaths(locations).flatMap((path) =>
      sitemapEntries(origin, path),
    ),
    ...profiles.flatMap((profile) => {
      const created = profile.updateDate
        ? new Date(profile.updateDate)
        : profile.creationDate
          ? new Date(profile.creationDate)
          : undefined;
      const lastmod =
        created && !isNaN(created.getTime())
          ? created.toISOString().slice(0, 10)
          : undefined;
      return sitemapEntries(origin, `/profile-view/${profile.uid}`, lastmod);
    }),
  ];

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`);
});

app.get(['/favicon.ico', '/robots.txt', '/llms.txt'], (req, res, next) => {
  res.sendFile(resolve(browserDistFolder, 'en', req.path.slice(1)), (error) => {
    if (error) {
      next();
    }
  });
});

// Only the build's bundles and media/ carry a content hash in their name;
// /assets files keep their URL when edited, so a year-long cache would pin
// stale copies in returning browsers.
const HASHED_FILE =
  /(?:^|[\\/])(?:chunk|main|polyfills|styles)-[\w-]+\.(?:m?js|css)$|[\\/]media[\\/]/;
const isHashed = (path: string) =>
  !path.includes(`${sep}assets${sep}`) && HASHED_FILE.test(path);
const staticOptions = {
  index: false,
  redirect: false,
  cacheControl: false,
  setHeaders: (res: express.Response, path: string) => {
    res.setHeader(
      'Cache-Control',
      isHashed(path)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
    );
  },
};

// Assets are identical across locales. Serving root /assets directly avoids a
// 302 to /en/assets on the font preload, @font-face and logo requests.
app.use(
  '/assets',
  express.static(resolve(browserDistFolder, 'en', 'assets'), staticOptions),
);

/**
 * Serve static files from /browser
 */
app.use(express.static(browserDistFolder, staticOptions));

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const parts = req.path.split('/').filter(Boolean);

  // Browse slugs resolve in any case, so `/en/browse/Portugal` would render
  // the lowercase page under a canonical of its own. An uppercase locale
  // would otherwise be read as a path and prefixed again (`/en/EN/browse`).
  const lowerLocale = parts[0]?.toLowerCase();
  if (lowerLocale && locales.has(lowerLocale)) {
    const rest = parts.slice(1);
    const fixed = [
      lowerLocale,
      ...(rest[0]?.toLowerCase() === 'browse'
        ? rest.map((part) => part.toLowerCase())
        : rest),
    ];
    if (fixed.join('/') !== parts.join('/')) {
      const query = req.url.includes('?')
        ? req.url.slice(req.url.indexOf('?'))
        : '';
      const slash = fixed.length === 1 || req.path.endsWith('/') ? '/' : '';
      res.redirect(308, `/${fixed.join('/')}${slash}${query}`);
      return;
    }
  }

  // `/pt` does not match `<base href="/pt/">`. Serving it paints the page,
  // then the client rewrites the URL to `/pt/` and loads it again.
  if (parts.length === 1 && locales.has(parts[0]) && !req.path.endsWith('/')) {
    const query = req.url.includes('?')
      ? req.url.slice(req.url.indexOf('?'))
      : '';
    res.redirect(308, `/${parts[0]}/${query}`);
    return;
  }

  // `/pt/en/...` would render Portuguese text under an English canonical.
  // The second prefix is the language the visitor asked for.
  if (parts.length >= 2 && locales.has(parts[0]) && locales.has(parts[1])) {
    const query = req.url.includes('?')
      ? req.url.slice(req.url.indexOf('?'))
      : '';
    res.redirect(308, `/${parts[1]}/${parts.slice(2).join('/')}${query}`);
    return;
  }

  const first = parts[0];
  if (locales.has(first) || first?.includes('.')) {
    next();
    return;
  }

  const cookie = req.headers.cookie ?? '';
  const cookieLang = /(?:^|;\s*)lang=([^;]+)/.exec(cookie)?.[1];
  const requested = decodeURIComponent(cookieLang ?? '');
  const header = req.headers['accept-language'] ?? '';
  const headerLang = header
    .split(',')
    .map((part) => part.trim().slice(0, 2).toLowerCase())
    .find((tag) => locales.has(tag));
  const lang = locales.has(requested) ? requested : (headerLang ?? 'en');
  const targetPath = req.path === '/' ? '/' : req.path;
  const query = req.url.includes('?')
    ? req.url.slice(req.url.indexOf('?'))
    : '';
  res.vary('Accept-Language');
  res.vary('Cookie');
  res.redirect(302, `/${lang}${targetPath}${query}`);
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  console.log('ANGULAR SERVER - originalUrl: ', req.originalUrl);
  const pathLocale = req.path.split('/').filter(Boolean)[0];
  const activeLocale = locales.has(pathLocale) ? pathLocale : '';

  ssrLocaleStorage.run(activeLocale, () => {
    angularApp
      .handle(req)
      .then((response) =>
        response ? writeResponseToNodeResponse(response, res) : next(),
      )
      .catch(next);
  });
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] ?? 4000);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
    console.log(`Proxying /api to ${apiProxyTarget}`);
  });

  server.on('upgrade', apiProxy.upgrade);
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
export default reqHandler;
