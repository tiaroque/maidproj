import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { UtilsService } from '../services/utils.service';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  PRIMARY_OUTLET,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { UserService } from '../services/user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageLinksComponent } from '../shared/language-links/language-links.component';
import { LanguageService } from '../services/shared/language-service.service';
import { PasskeyCancelled, PasskeyService } from '../services/passkey.service';
import { filter, firstValueFrom, fromEvent, merge } from 'rxjs';
import { APP_LOCALES } from '../../locale/compiled-locale';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  host: { class: 'block h-full' },
  imports: [
    FormsModule,
    RouterOutlet,
    MatProgressSpinner,
    TranslatePipe,
    RouterLink,
    LanguageLinksComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private authService = inject(AuthService);
  private utilsService = inject(UtilsService);

  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  cookieService = inject(CookieService);
  userService = inject(UserService);
  router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly mode = input<string>();
  screenUrl = signal('');

  loading = signal(false);
  facebookLoading = signal(false);
  passkeyLoading = signal(false);
  private passkeyService = inject(PasskeyService);
  constructor() {
    this.setScreenUrl(this.router.url);
    this.router.events.pipe(takeUntilDestroyed()).subscribe((resp) => {
      if (resp instanceof NavigationEnd) {
        this.setScreenUrl(resp.urlAfterRedirects);
      }
    });

    // Google/Facebook login leaves via location.assign, so the page can come
    // back with loading still true: Back restores it from the back-forward
    // cache, and on mobile the provider's app may take over the link without
    // the page ever unloading. Clear loading in both cases.
    if (isPlatformBrowser(this.platformId)) {
      merge(
        fromEvent<PageTransitionEvent>(window, 'pageshow').pipe(
          filter((event) => event.persisted),
        ),
        fromEvent(document, 'visibilitychange').pipe(
          filter(() => document.visibilityState === 'visible'),
        ),
      )
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.loading.set(false);
          this.facebookLoading.set(false);
        });
    }

    afterNextRender(() => {
      this.showOAuthErrorIfPresent();
    });
  }

  changeLang(lang: string) {
    console.log('CHanging lang: ', lang);
  }

  private setScreenUrl(rawUrl: string) {
    const tree = this.router.parseUrl(rawUrl);
    // With <base href="/de/"> a server render sees "/login" while in-app
    // navigation sees "/de/login", so the locale segment is optional.
    const segments = (tree.root.children[PRIMARY_OUTLET]?.segments ?? [])
      .map((segment) => segment.path)
      .filter((path) => !(APP_LOCALES as readonly string[]).includes(path));
    this.screenUrl.set(segments[0] ?? '');
  }

  showGoogleAuth() {
    return this.screenUrl() === 'login' || this.screenUrl() === 'register';
  }

  async signInWithPasskey() {
    if (!window.PublicKeyCredential) {
      this.utilsService.alert(
        this.translateService.instant('auth.passkeyUnavailable'),
        this.translateService.instant('buttonClose'),
      );
      return;
    }

    this.passkeyLoading.set(true);
    const lang =
      this.languageService.defaultLang() ||
      this.translateService.getCurrentLang() ||
      'en';
    const close = this.translateService.instant('buttonClose');
    try {
      await this.passkeyService.signIn();
      const checkAuth = await firstValueFrom(this.authService.checkAuth());
      if (!checkAuth.hasUserType) {
        await this.router.navigateByUrl(`/${lang}/admin/signup`);
        return;
      }
      await this.router.navigateByUrl(`/${lang}/admin/list`);
    } catch (error: any) {
      if (error instanceof PasskeyCancelled) {
        return;
      }
      if (error?.error?.error === 'EMAIL_NOT_VERIFIED' || error?.status === 403) {
        this.utilsService.alert(
          this.translateService.instant('auth.pleaseVerifyAccount'),
          close,
        );
        return;
      }
      this.utilsService.alert(
        this.translateService.instant('auth.passkeyError'),
        close,
      );
    } finally {
      this.passkeyLoading.set(false);
    }
  }

  createGoogleUser() {
    this.loading.set(true);
    this.authService.startGoogleLogin(this.currentLang());
  }

  createFacebookUser() {
    this.facebookLoading.set(true);
    this.authService.startFacebookLogin(this.currentLang());
  }

  private currentLang() {
    return (
      this.languageService.defaultLang() ||
      this.translateService.getCurrentLang() ||
      'en'
    );
  }

  private showOAuthErrorIfPresent() {
    const params = new URLSearchParams(window.location.search);
    const errorParam = ['googleError', 'facebookError'].find((name) =>
      params.has(name),
    );
    if (!errorParam) {
      return;
    }
    const close = this.translateService.instant('buttonClose');
    const messageKey =
      errorParam === 'facebookError' && params.get(errorParam) === 'email'
        ? 'auth.facebookNoEmail'
        : 'auth.authenticationError';
    this.utilsService.alert(this.translateService.instant(messageKey), close);
    const url = new URL(window.location.href);
    url.searchParams.delete(errorParam);
    history.replaceState(null, '', url.pathname + url.search);
  }
}
