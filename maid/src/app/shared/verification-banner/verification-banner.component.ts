import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { VerificationService } from '../../services/verification.service';
import { LanguageService } from '../../services/shared/language-service.service';

const DISMISS_KEY = 'verificationBannerDismissed';
// Photos already shows the full verification card; chat needs the full height.
const HIDDEN_ON = ['/admin/upload', '/admin/chat'];

@Component({
  selector: 'app-verification-banner',
  imports: [MatIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-banner.component.html',
  styleUrl: './verification-banner.component.css',
})
export class VerificationBannerComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly verificationService = inject(VerificationService);
  readonly lang = inject(LanguageService).defaultLang;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  // Holds the status the user dismissed, so a status change brings the banner back.
  private readonly dismissedStatus = signal<string | null>(null);

  readonly status = computed(() => {
    const v = this.verificationService.current();
    if (!v || v.verified) return null;
    if (v.status === 'approved') return null;
    return v.status;
  });

  readonly visible = computed(() => {
    const status = this.status();
    if (!status || this.dismissedStatus() === status) return false;
    const path = this.url().split(/[?#]/)[0];
    return !HIDDEN_ON.some((hidden) => path.endsWith(hidden));
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dismissedStatus.set(sessionStorage.getItem(DISMISS_KEY));
    if (!this.verificationService.current()) {
      this.verificationService.status().subscribe({ error: () => {} });
    }
  }

  dismiss() {
    const status = this.status();
    if (!status) return;
    this.dismissedStatus.set(status);
    sessionStorage.setItem(DISMISS_KEY, status);
  }
}
