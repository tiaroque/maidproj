import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDetailsObject } from './admin/interfaces/user.interface';
import { LanguageService } from './shared/language-service.service';

const SITE_ORIGIN = 'https://www.sugrit.com';

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

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        switchMap(() =>
          this.translate.get([
            'landing.heroTitle',
            'landing.heroSubtitle',
            'landing.peopleLookingHint',
            'browse.pageTitle',
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
    const indexable =
      environment.production &&
      (page !== 'profile-view'
        ? INDEXABLE.has(page)
        : segments.length >= 2);
    const copy = this.copyFor(page, snapshot);

    this.document.documentElement.lang = lang;
    this.title.setTitle(copy.title);
    this.meta.updateTag({ name: 'description', content: copy.description });
    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index, follow' : 'noindex, nofollow',
    });

    const path = segments.length ? `/${lang}/${segments.join('/')}` : `/${lang}/`;
    const canonical = `${SITE_ORIGIN}${path}`;
    this.upsertLink('canonical', canonical);
    this.setAlternates(segments);

    this.meta.updateTag({ property: 'og:title', content: copy.title });
    this.meta.updateTag({ property: 'og:description', content: copy.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({
      property: 'og:locale',
      content: OG_LOCALE[lang] ?? 'en_GB',
    });
    this.meta.updateTag({ property: 'og:site_name', content: 'Clara' });
    const image = `${SITE_ORIGIN}/assets/images/og/og-${OG_LOCALE[lang] ? lang : 'en'}.jpg`;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: copy.title });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: copy.title });
    this.meta.updateTag({ name: 'twitter:description', content: copy.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.meta.updateTag({ name: 'twitter:image:alt', content: copy.title });

    if (page === '' || page === 'browse') {
      this.setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            name: 'Clara',
            url: SITE_ORIGIN,
            logo: `${SITE_ORIGIN}/assets/images/logo4-cropped.svg`,
          },
          {
            '@type': 'WebSite',
            '@id': `${SITE_ORIGIN}/#website`,
            name: 'Clara',
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

  private copyFor(page: string, snapshot: ActivatedRouteSnapshot) {
    if (page === 'profile-view') {
      const details = this.profileDetails(snapshot);
      const user = details?.user;
      const name = user?.name?.trim();
      const place = user?.locationName || user?.country;
      const title = name
        ? `${name} — Clara`
        : 'Clara';
      const description = this.clip(
        user?.description ||
          (name
            ? `${name}${place ? ` · ${place}` : ''}. ${this.text('landing.heroSubtitle')}`
            : this.text('landing.heroSubtitle')),
      );
      return { title, description };
    }

    const pages: Record<string, { title: string; description: string }> = {
      '': {
        title: `Clara — ${this.text('landing.heroTitle')}`,
        description: this.text('landing.heroSubtitle'),
      },
      browse: {
        title: `${this.text('browse.pageTitle')} — Clara`,
        description: this.text('landing.peopleLookingHint'),
      },
      register: {
        title: `${this.text('auth.createAccountTitle')} — Clara`,
        description: this.text('auth.heroLine'),
      },
      login: {
        title: `${this.text('auth.welcomeBack')} — Clara`,
        description: this.text('auth.heroLine'),
      },
      recover: {
        title: `${this.text('auth.resetTitle')} — Clara`,
        description: this.text('auth.resetHint'),
      },
      'terms-conditions': {
        title: `${this.text('termsConditions')} — Clara`,
        description: this.text('seo.termsDescription'),
      },
      privacy: {
        title: `${this.text('privacyPolicy')} — Clara`,
        description: this.text('seo.privacyDescription'),
      },
      'not-found': {
        title: `${this.text('notFound.title')} — Clara`,
        description: this.text('notFound.text'),
      },
    };

    return (
      pages[page] ?? {
        title: 'Clara',
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

  private clip(value: string) {
    const plain = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}...` : plain;
  }

  private setAlternates(segments: string[]) {
    const head = this.document.head;
    head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((node) => node.remove());

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
