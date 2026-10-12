import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const BLINK_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class ChatAlertsService {
  private document = inject(DOCUMENT);
  private translateService = inject(TranslateService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private audio?: HTMLAudioElement;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private originalTitle = '';

  constructor() {
    if (this.isBrowser) {
      this.document.addEventListener('visibilitychange', () => {
        if (!this.document.hidden) {
          this.stopBlinking();
        }
      });
    }
  }

  notifyNewMessage() {
    if (!this.isBrowser) {
      return;
    }

    if (this.document.hidden) {
      this.startBlinking();
    }

    this.audio ??= new Audio('assets/sounds/no-problem-notification-sound.mp3');
    this.audio.currentTime = 0;
    // Playback is rejected when the browser blocks unprompted autoplay.
    this.audio.play().catch(() => undefined);
  }

  private startBlinking() {
    if (this.blinkTimer) {
      return;
    }

    this.originalTitle = this.document.title;
    const message = this.translateService.instant('chatScreen.newMessage');

    this.blinkTimer = setInterval(() => {
      this.document.title =
        this.document.title === message ? this.originalTitle : message;
    }, BLINK_INTERVAL_MS);
  }

  private stopBlinking() {
    if (!this.blinkTimer) {
      return;
    }

    clearInterval(this.blinkTimer);
    this.blinkTimer = null;
    this.document.title = this.originalTitle;
  }
}
