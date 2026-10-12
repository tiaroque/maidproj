import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { filter, map, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ImageViewerService } from './services/admin/image-viewer.service';
import { ImageViewerComponent } from './shared/image-viewer/image-viewer.component';
import { MobileMenuComponent } from './shared/mobile-menu/mobile-menu.component';
import { MenusGlobalService } from './services/menus-global.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { GoogleAnalyticsService } from './services/shared/analytics.service';
import { APP_LOCALES } from '../locale/compiled-locale';
import { LanguageService } from './services/shared/language-service.service';

const PUBLIC_PAGES = new Set([
  'browse',
  'profile-view',
  'login',
  'register',
  'recover',
  'terms-conditions',
  'privacy',
]);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [
    RouterOutlet,
    CdkScrollable,
    ImageViewerComponent,
    MobileMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);

  readonly menuGlobalService = inject(MenusGlobalService);
  readonly router = inject(Router);
  private readonly routerUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly showPatternLayer = computed(() => {
    const raw = this.routerUrl()?.split('?')[0] || '';
    const clean = raw.replace(/^\/+|\/+$/g, '');
    const isLanding = !clean || ['en', 'pt', 'fr', 'de', 'it', 'es', 'nl'].includes(clean);
    return !isLanding && !clean.startsWith('chat');
  });

  translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  imageViewerService = inject(ImageViewerService);
  readonly document = inject(DOCUMENT);
  subscriptionList = new Subscription();

  menuOpen = this.menuGlobalService.openMenu;

  private readonly analyticsService = inject(GoogleAnalyticsService);

  constructor() {
    effect(() => {
      this.loadMaterialIcons(this.routerUrl());
    });

    afterNextRender(() => {
      this.analyticsService.start();
      this.runCoockieConsent();
    });
  }

  async runCoockieConsent() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Loaded on demand to keep the consent library out of the initial bundle.
    const { run, setLanguage } = await import('vanilla-cookieconsent');

    const sub = this.translateService.onLangChange.subscribe((lang) => {
      setLanguage(lang.lang);
    });
    this.subscriptionList.add(sub);

    // document.documentElement.classList.add('cc--light-funky');
    //eraseCookies('cc_cookie');
    // reset(true);

    // Shown as soon as the app is interactive. A delayed banner becomes the
    // largest paint on short pages and pushes LCP back by seconds.
    this.loadCookieConsentStyles();
    run({
      // autoClearCookies: true,
      // autoShow: true,
      // disablePageInteraction: false,
      // hideFromBots: true,
      manageScriptTags: false,
      // revision: 0,
      // root: null,
      // mode: 'opt-in',
      guiOptions: {
        consentModal: {
          layout: 'box wide',
          position: 'bottom center',
          equalWeightButtons: true,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          equalWeightButtons: true,
          flipButtons: false,
        },
      },
      onFirstConsent: ({ cookie }) => {
        // console.log('onFirstConsent fired');
      },
      onConsent: ({ cookie }) => {
        // console.log('onConsent fired');
      },
      onChange: ({ cookie, changedCategories, changedServices }) => {
        // console.log('onChange fired', changedCategories, changedServices);
      },
      onModalShow: ({ modalName }) => {
        // console.log(modalName, 'visible');
      },
      onModalHide: ({ modalName }) => {
        // console.log(modalName, 'hidden');
      },
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: true,
          readOnly: false,
          autoClear: {
            cookies: [{ name: /^(_ga|_gid)/ }],
          },
          services: {
            ga4: {
              label: 'Google Analytics 4',
              onAccept: () => {
                this.analyticsService.updateAnalyticsConsent(true);
              },
              onReject: () => {
                this.analyticsService.updateAnalyticsConsent(false);
              },
            },
          },
        },
        ads: {
          enabled: false,
          readOnly: false,
        },
      },
      language: {
        default: this.languageService.defaultLang(),
        // autoDetect: 'browser',
        translations: {
          en: '/assets/translations/en.json',
          fr: '/assets/translations/fr.json',
          pt: '/assets/translations/pt.json',
          es: '/assets/translations/es.json',
          de: '/assets/translations/de.json',
          it: '/assets/translations/it.json',
          nl: '/assets/translations/nl.json',
        },
      },
    });
  }

  private loadMaterialIcons(url: string) {
    // The locale prefix is ignored because with
    // <base href="/de/"> a direct load yields "/login" but in-app navigation
    // yields "/de/login".
    const segments = url
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(
        (segment) =>
          segment && !(APP_LOCALES as readonly string[]).includes(segment),
      );
    // Public pages use inline SVG icons, so the render-blocking icon font is
    // only fetched once the user reaches a page that uses <mat-icon>.
    if (!segments.length || PUBLIC_PAGES.has(segments[0])) {
      return;
    }

    const href =
      'https://fonts.googleapis.com/icon?family=Material+Icons&display=swap';
    if (this.document.head.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    this.document.head.appendChild(link);
  }

  private loadCookieConsentStyles() {
    // Built from node_modules as a non-injected bundle (angular.json), so it
    // is served from our origin next to the locale's other files.
    const href = 'cookieconsent.css';
    if (this.document.querySelector(`link[href="${href}"]`)) {
      return;
    }
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    this.document.head.appendChild(link);
  }

  ngOnDestroy(): void {
    this.subscriptionList.unsubscribe();
  }
}
