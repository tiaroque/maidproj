import { DOCUMENT, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

type GtagFn = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: GtagFn };

const GTAG_FALLBACK_DELAY_MS = 10_000;

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private started = false;
  private analyticsGranted = false;
  private lastPagePath = '';
  private pendingPagePath = '';

  start() {
    if (this.started || !environment.gaMeasurementId) {
      return;
    }

    const win = this.document.defaultView as AnalyticsWindow | null;
    if (!win) {
      return;
    }

    this.started = true;
    this.analyticsGranted = this.hasAnalyticsConsent();
    win.dataLayer = win.dataLayer ?? [];
    const gtag: GtagFn = function () {
      // gtag.js only processes an Arguments object, not a plain array.
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer?.push(arguments);
    };
    win.gtag = gtag;

    gtag('consent', 'default', {
      analytics_storage: this.analyticsGranted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
    gtag('js', new Date());
    gtag('config', environment.gaMeasurementId, { send_page_view: false });

    this.loadGtagAfterPageLoad(win);

    const initialPath = `${win.location.pathname}${win.location.search}`;
    this.trackPage(gtag, initialPath);
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => this.trackPage(gtag, event.urlAfterRedirects));
  }

  // gtag.js is ~175 KiB and runs ~170 ms of script. It is fetched on the first
  // interaction, or after a delay for visitors who only read; calls made before
  // it arrives wait in dataLayer.
  private loadGtagAfterPageLoad(win: AnalyticsWindow) {
    const interactionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    let fallbackTimer: number | undefined;

    const appendScript = () => {
      win.clearTimeout(fallbackTimer);
      interactionEvents.forEach((name) =>
        win.removeEventListener(name, appendScript, true),
      );
      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaMeasurementId}`;
      this.document.head.appendChild(script);
    };

    const waitForInteraction = () => {
      interactionEvents.forEach((name) =>
        win.addEventListener(name, appendScript, {
          once: true,
          passive: true,
          capture: true,
        }),
      );
      fallbackTimer = win.setTimeout(appendScript, GTAG_FALLBACK_DELAY_MS);
    };

    if (this.document.readyState === 'complete') {
      waitForInteraction();
    } else {
      win.addEventListener('load', waitForInteraction, { once: true });
    }
  }

  updateAnalyticsConsent(granted: boolean) {
    const win = this.document.defaultView as AnalyticsWindow | null;
    const gtag = win?.gtag;
    if (!gtag) {
      return;
    }

    this.analyticsGranted = granted;
    gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
    });

    if (granted && this.pendingPagePath) {
      const pagePath = this.pendingPagePath;
      this.pendingPagePath = '';
      this.pageView(gtag, pagePath);
    }
  }

  logEvent(event: string, category: string, label: string, value: string) {
    if (!this.analyticsGranted) {
      return;
    }
    const win = this.document.defaultView as AnalyticsWindow | null;
    win?.gtag?.('event', event, {
      event_category: category,
      event_label: label,
      event_value: value,
    });
  }

  private trackPage(gtag: GtagFn, pagePath: string) {
    if (!this.analyticsGranted) {
      this.pendingPagePath = pagePath;
      return;
    }
    this.pageView(gtag, pagePath);
  }

  private pageView(gtag: GtagFn, pagePath: string) {
    if (pagePath === this.lastPagePath) {
      return;
    }
    this.lastPagePath = pagePath;
    const win = this.document.defaultView;
    gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: win?.location.href,
      page_title: this.document.title,
    });
  }

  private hasAnalyticsConsent() {
    const cookie = this.document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('cc_cookie='));
    if (!cookie) {
      return false;
    }

    try {
      const raw = decodeURIComponent(cookie.slice('cc_cookie='.length));
      const parsed = JSON.parse(raw) as { categories?: string[] };
      return parsed.categories?.includes('analytics') ?? false;
    } catch {
      return false;
    }
  }
}
