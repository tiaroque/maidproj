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
import { NavigationEnd, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { PushNotificationsService } from '../../services/push-notifications.service';

const DISMISS_KEY = 'pushBannerDismissed';
// Preferences already shows the push toggle; chat needs the full height.
const HIDDEN_ON = ['/admin/preferences', '/admin/chat'];

@Component({
  selector: 'app-push-banner',
  imports: [MatIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './push-banner.component.html',
  styleUrl: '../verification-banner/verification-banner.component.css',
})
export class PushBannerComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly pushService = inject(PushNotificationsService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly dismissed = signal(true);
  // The service starts as 'disabled', so wait for the real state to avoid a
  // flash for users who already have push on.
  private readonly checked = signal(false);
  readonly enabling = signal(false);

  readonly visible = computed(() => {
    if (!this.checked() || this.dismissed()) return false;
    if (this.pushService.state() !== 'disabled') return false;
    const path = this.url().split(/[?#]/)[0];
    return !HIDDEN_ON.some((hidden) => path.endsWith(hidden));
  });

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.dismissed.set(sessionStorage.getItem(DISMISS_KEY) === '1');
    await this.pushService.refreshState();
    this.checked.set(true);
  }

  // Runs from the button click, so the browser allows the permission prompt.
  async enable() {
    this.enabling.set(true);
    try {
      await this.pushService.enable();
    } catch (error) {
      console.error('Enabling push failed', error);
    } finally {
      this.enabling.set(false);
    }
  }

  dismiss() {
    this.dismissed.set(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }
}
