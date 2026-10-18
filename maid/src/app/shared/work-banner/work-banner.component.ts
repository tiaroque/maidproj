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
import { ChatStore } from '../../services/admin/signals/store';
import { LanguageService } from '../../services/shared/language-service.service';

const DISMISS_KEY = 'workBannerDismissed';
// The profile page already shows the section itself; chat needs the full height.
const HIDDEN_ON = ['/admin/profile', '/admin/chat'];

@Component({
  selector: 'app-work-banner',
  imports: [MatIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './work-banner.component.html',
  styleUrl: '../verification-banner/verification-banner.component.css',
})
export class WorkBannerComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly storeChat = inject(ChatStore);
  readonly lang = inject(LanguageService).defaultLang;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly dismissed = signal(true);

  readonly isCleaner = computed(() => this.storeChat.userType() === 'Cleaner');

  readonly incomplete = computed(() => {
    const user = this.storeChat.me()?.user;
    if (!user) return false;
    const items = [
      user.services?.length,
      user.hourlyRate,
      user.availability?.length,
      ...(this.isCleaner() ? [user.areasCovered?.length] : []),
    ];
    return items.some((item) => !item);
  });

  readonly visible = computed(() => {
    if (!this.incomplete() || this.dismissed()) return false;
    const path = this.url().split(/[?#]/)[0];
    return !HIDDEN_ON.some((hidden) => path.endsWith(hidden));
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.dismissed.set(sessionStorage.getItem(DISMISS_KEY) === '1');
  }

  dismiss() {
    this.dismissed.set(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }
}
