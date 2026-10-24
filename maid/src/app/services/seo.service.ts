import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  UserDetailsObject,
  UserModel,
} from './admin/interfaces/user.interface';
import { LanguageService } from './shared/language-service.service';
import { currencyForCountry } from '../services/admin/interfaces/service-catalog';
import { BrowseLocationsService } from './shared/browse-locations.service';
import {
  browseFact,
  countryFact,
  ResolvedBrowseLocation,
  SERVICE_SLUGS,
} from '../utils/browse-locations';

const SITE_ORIGIN = 'https://www.linpura.com';

const OG_LOCALE: Record<string, string> = {
  en: 'en_GB',
  pt: 'pt_PT',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  es: 'es_ES',
  nl: 'nl_NL',
};

const INDEXABLE = new Set([
  '',
  'browse',
  'register',
  'terms-conditions',
  'privacy',
  'profile-view',
]);

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly browseLocations = inject(BrowseLocationsService);

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        switchMap(() =>
          this.translate.get([
            'landing.heroTitle',
            'landing.heroSubtitle',
            'landing.peopleLookingHint',
            'browse.pageTitle',
            'browse.titleInLocation',
            'browse.seoDescription',
            'browse.titleInLocationService',
            'browse.seoDescriptionService',
            'browse.factsRate',
            'browse.factsSingleRate',
            'browse.facts',
            'browse.factsCount',
            'browse.factsServiceRate',
            'browse.factsServiceSingleRate',
            'browse.factsService',
            'browse.factsCountry',
            'auth.createAccountTitle',
            'auth.heroLine',
            'auth.welcomeBack',
            'auth.resetTitle',
            'auth.resetHint',
            'termsConditions',
            'privacyPolicy',
            'seo.termsDescription',
            'seo.privacyDescription',
            'notFound.title',
            'notFound.text',
          ]),
        ),
      )
      .subscribe(() => this.apply());
  }

  private apply() {
    const lang = this.languageService.defaultLang();
    const snapshot = this.leaf(this.router.routerState.snapshot.root);
    const segments = snapshot.pathFromRoot
      .flatMap((route) => route.url)
      .map((segment) => segment.path)
      .filter((segment) => segment && segment !== lang);
    const notFound = snapshot.data['notFound'] === true;
    const page = notFound ? 'not-found' : (segments[0] ?? '');
    const browseLocation = this.browseLocation(snapshot);
    // A thin listing keeps its page and its internal links, but stays out of
    // the index until enough cleaners make it worth a result. A service page
    // is judged on its own supply, not the city's. A country page is thin only
    // when no city in it has a cleaner, since it would render "No results".
    const thinLocation = !browseLocation
      ? false
      : browseLocation.service
        ? browseLocation.service.indexable === false
        : browseLocation.location
          ? browseLocation.location.indexable === false
          : !this.browseLocations.countryHasCleaners(
              browseLocation.country.slug,
            );
    const indexable =
      environment.production &&
      (page !== 'profile-view' ? INDEXABLE.has(page) : segments.length >= 2) &&
      !thinLocation;
    const copy = this.copyFor(page, snapshot);

    this.document.documentElement.lang = lang;
    this.title.setTitle(copy.title);
    this.meta.updateTag({ name: 'description', content: copy.description });
    // A thin listing is kept precisely so crawlers reach the places, services
    // and profiles it links to, so it drops out of the index without dropping
    // the links. Everything else non-indexable is private and gets nofollow.
    this.meta.updateTag({
      name: 'robots',
      content: indexable
        ? 'index, follow'
        : thinLocation
          ? 'noindex, follow'
          : 'noindex, nofollow',
    });

    const path = segments.length
      ? `/${lang}/${segments.join('/')}`
      : `/${lang}/`;
    const canonical = `${SITE_ORIGIN}${path}`;
    // hreflang is ignored between noindexed pages, and a private or missing
    // page has no preferred URL to declare.
    if (indexable || thinLocation) {
      this.upsertLink('canonical', canonical);
    } else {
      this.removeLinks('link[rel="canonical"]');
    }
    this.setAlternates(indexable ? segments : null);

    this.meta.updateTag({ property: 'og:title', content: copy.title });
    this.meta.updateTag({
      property: 'og:description',
      content: copy.description,
    });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({
      property: 'og:locale',
      content: OG_LOCALE[lang] ?? 'en_GB',
    });
    this.meta.updateTag({ property: 'og:site_name', content: 'Linpura' });
    const image = `${SITE_ORIGIN}/assets/images/og/og-${OG_LOCALE[lang] ? lang : 'en'}.jpg`;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: copy.title });
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({ name: 'twitter:title', content: copy.title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: copy.description,
    });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.meta.updateTag({ name: 'twitter:image:alt', content: copy.title });

    if (page === 'browse' && browseLocation) {
      const place =
        browseLocation.location?.locationName ?? browseLocation.country.name;
      this.setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            '@id': `${canonical}#page`,
            url: canonical,
            name: copy.title,
            description: copy.description,
            inLanguage: lang,
            isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
            about: {
              '@type': 'Service',
              serviceType: browseLocation.service
                ? this.text(`services.${browseLocation.service.service}`)
                : this.text('browse.pageTitle'),
              provider: { '@id': `${SITE_ORIGIN}/#organization` },
              areaServed: {
                '@type': 'Place',
                name: place,
                address: {
                  '@type': 'PostalAddress',
                  addressCountry: browseLocation.country.code,
                  ...(browseLocation.location
                    ? { addressLocality: browseLocation.location.locationName }
                    : {}),
                },
              },
            },
          },
          this.breadcrumbs(lang, browseLocation),
        ],
      });
    } else if (page === 'profile-view') {
      const details = this.profileDetails(snapshot);
      this.setJsonLd(
        details?.user?.name?.trim()
          ? this.profileJsonLd(details.user, canonical, lang, copy)
          : null,
      );
    } else if (page === '' || page === 'browse') {
      this.setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            name: 'Linpura',
            url: SITE_ORIGIN,
            logo: `${SITE_ORIGIN}/assets/images/logo-mop.png`,
          },
          {
            '@type': 'WebSite',
            '@id': `${SITE_ORIGIN}/#website`,
            name: 'Linpura',
            url: `${SITE_ORIGIN}/${lang}/`,
            description: this.text('landing.heroSubtitle'),
            inLanguage: lang,
            publisher: { '@id': `${SITE_ORIGIN}/#organization` },
          },
        ],
      });
    } else {
      this.setJsonLd(null);
    }
  }

  private breadcrumbs(lang: string, resolved: ResolvedBrowseLocation) {
    const base = `/${lang}/browse`;
    const trail = [
      { name: this.text('browse.pageTitle'), path: base },
      {
        name: resolved.country.name,
        path: `${base}/${resolved.country.slug}`,
      },
    ];

    if (resolved.location && resolved.citySlug) {
      const cityPath = `${base}/${resolved.country.slug}/${resolved.citySlug}`;
      trail.push({ name: resolved.location.locationName, path: cityPath });

      if (resolved.service) {
        trail.push({
          name: this.text(`services.${resolved.service.service}`),
          path: `${cityPath}/${SERVICE_SLUGS[resolved.service.service]}`,
        });
      }
    }

    return {
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${SITE_ORIGIN}${item.path}`,
      })),
    };
  }

  private browseDescription(resolved: ResolvedBrowseLocation) {
    const names = resolved.service
      ? [this.text(`services.${resolved.service.service}`)]
      : (resolved.location?.services ?? [])
          .slice(0, 4)
          .map((entry) => this.text(`services.${entry.service}`));
    return this.translated(browseFact(resolved, names));
  }

  private translated(
    fact: { key: string; params: Record<string, string> } | null,
  ) {
    if (!fact) {
      return '';
    }
    const line = this.textWith(fact.key, fact.params);
    return line === fact.key ? '' : this.clip(line);
  }

  private profileJsonLd(
    user: UserModel,
    canonical: string,
    lang: string,
    copy: { title: string; description: string },
  ) {
    const place = user.locationName || user.country || '';
    const languages = this.languageService
      .getLanguagesMenu()
      .filter((item) => user.languages?.includes(item.value))
      .map((item) => item.name);
    const person: Record<string, unknown> = {
      '@type': 'Person',
      '@id': `${canonical}#person`,
      name: user.name,
      url: canonical,
    };
    if (user.description?.trim()) {
      person['description'] = this.clip(user.description);
    }
    if (place) {
      person['homeLocation'] = {
        '@type': 'Place',
        name: place,
        address: {
          '@type': 'PostalAddress',
          ...(user.locationName ? { addressLocality: user.locationName } : {}),
          ...(user.country ? { addressCountry: user.country } : {}),
        },
      };
    }
    if (languages.length) {
      person['knowsLanguage'] = languages;
    }

    const rate = user.hourlyRate;
    if (user.userType === 'Cleaner' && rate != null) {
      const currency = user.currency || currencyForCountry(user.country);
      const services = user.services ?? [];
      const offers = (services.length ? services : [undefined]).map(
        (service) => ({
          '@type': 'Offer',
          price: rate,
          priceCurrency: currency,
          ...(service
            ? {
                itemOffered: {
                  '@type': 'Service',
                  serviceType: this.text(`services.${service}`),
                  ...(place ? { areaServed: place } : {}),
                },
              }
            : {}),
        }),
      );
      person['makesOffer'] = offers;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': `${canonical}#page`,
      url: canonical,
      name: copy.title,
      description: copy.description,
      inLanguage: lang,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      mainEntity: person,
    };
  }

  private browseLocation(
    snapshot: ActivatedRouteSnapshot,
  ): ResolvedBrowseLocation | undefined {
    let route: ActivatedRouteSnapshot | null = snapshot;
    while (route) {
      const resolved = route.data['browseLocation'] as
        | ResolvedBrowseLocation
        | undefined;
      if (resolved?.country) {
        return resolved;
      }
      route = route.parent;
    }
    return undefined;
  }

  private copyFor(page: string, snapshot: ActivatedRouteSnapshot) {
    if (page === 'browse') {
      const resolved = this.browseLocation(snapshot);
      if (resolved?.location) {
        const place = resolved.location.locationName;
        const fact = this.browseDescription(resolved);
        if (resolved.service) {
          const service = this.text(`services.${resolved.service.service}`);
          return {
            title: `${this.textWith('browse.titleInLocationService', { service, location: place })} — Linpura`,
            description:
              fact ||
              this.clip(
                this.textWith('browse.seoDescriptionService', {
                  service,
                  location: place,
                }),
              ),
          };
        }
        return {
          title: `${this.textWith('browse.titleInLocation', { location: place })} — Linpura`,
          description:
            fact ||
            this.clip(
              this.textWith('browse.seoDescription', { location: place }),
            ),
        };
      }

      if (resolved) {
        const countryLine = this.translated(
          countryFact(
            resolved.country.name,
            this.browseLocations.snapshotCities(resolved.country.slug),
          ),
        );
        return {
          title: `${this.textWith('browse.titleInLocation', { location: resolved.country.name })} — Linpura`,
          description:
            countryLine ||
            this.clip(
              this.textWith('browse.seoDescription', {
                location: resolved.country.name,
              }),
            ),
        };
      }
    }

    if (page === 'profile-view') {
      const details = this.profileDetails(snapshot);
      const user = details?.user;
      const name = user?.name?.trim();
      const place = user?.locationName || user?.country;
      const title = name ? `${name} — Linpura` : 'Linpura';
      // The bio is written in whatever language its author chose, so it is
      // only used on the locales the author says they speak. Elsewhere the
      // snippet is built from translated strings in the page's language.
      const lang = this.languageService.defaultLang();
      const ownText =
        user?.description?.trim() && user.languages?.includes(lang)
          ? user.description
          : '';
      const services = (user?.services ?? [])
        .slice(0, 4)
        .map((service) => this.text(`services.${service}`))
        .join(', ');
      const summary = [name, place, services].filter(Boolean).join(' · ');
      const description = this.clip(
        ownText ||
          (summary
            ? `${summary}. ${this.text('landing.heroSubtitle')}`
            : this.text('landing.heroSubtitle')),
      );
      return { title, description };
    }

    const pages: Record<string, { title: string; description: string }> = {
      '': {
        title: `Linpura — ${this.text('landing.heroTitle')}`,
        description: this.text('landing.heroSubtitle'),
      },
      browse: {
        title: `${this.text('browse.pageTitle')} — Linpura`,
        description: this.text('landing.peopleLookingHint'),
      },
      register: {
        title: `${this.text('auth.createAccountTitle')} — Linpura`,
        description: this.text('auth.heroLine'),
      },
      login: {
        title: `${this.text('auth.welcomeBack')} — Linpura`,
        description: this.text('auth.heroLine'),
      },
      recover: {
        title: `${this.text('auth.resetTitle')} — Linpura`,
        description: this.text('auth.resetHint'),
      },
      'terms-conditions': {
        title: `${this.text('termsConditions')} — Linpura`,
        description: this.text('seo.termsDescription'),
      },
      privacy: {
        title: `${this.text('privacyPolicy')} — Linpura`,
        description: this.text('seo.privacyDescription'),
      },
      'not-found': {
        title: `${this.text('notFound.title')} — Linpura`,
        description: this.text('notFound.text'),
      },
    };

    return (
      pages[page] ?? {
        title: 'Linpura',
        description: this.text('landing.heroSubtitle'),
      }
    );
  }

  private profileDetails(
    snapshot: ActivatedRouteSnapshot,
  ): UserDetailsObject | undefined {
    let route: ActivatedRouteSnapshot | null = snapshot;
    while (route) {
      const details = route.data['userProfileDetails'] as
        | UserDetailsObject
        | undefined;
      if (details?.user) {
        return details;
      }
      route = route.parent;
    }
    return undefined;
  }

  private text(key: string) {
    const value = this.translate.instant(key);
    return typeof value === 'string' ? value : key;
  }

  private textWith(key: string, params: Record<string, string>) {
    const value = this.translate.instant(key, params);
    return typeof value === 'string' ? value : key;
  }

  private clip(value: string) {
    const plain = value
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}...` : plain;
  }

  private removeLinks(selector: string) {
    this.document.head
      .querySelectorAll(selector)
      .forEach((node) => node.remove());
  }

  private setAlternates(segments: string[] | null) {
    this.removeLinks('link[rel="alternate"][hreflang]');
    if (!segments) {
      return;
    }

    const suffix = segments.length ? `/${segments.join('/')}` : '/';
    for (const locale of this.languageService.currentLanguages) {
      this.upsertLink('alternate', `${SITE_ORIGIN}/${locale}${suffix}`, locale);
    }
    this.upsertLink('alternate', `${SITE_ORIGIN}/en${suffix}`, 'x-default');
  }

  private upsertLink(rel: string, href: string, hreflang?: string) {
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`;
    let link = this.document.head.querySelector(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) {
        link.setAttribute('hreflang', hreflang);
      }
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setJsonLd(data: Record<string, unknown> | null) {
    const existing = this.document.getElementById('seo-jsonld');
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.id = 'seo-jsonld';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    if (!existing) {
      this.document.head.appendChild(script);
    }
  }

  private leaf(route: ActivatedRouteSnapshot) {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
