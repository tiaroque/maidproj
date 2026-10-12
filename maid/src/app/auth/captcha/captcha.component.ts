import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import {
  DomSanitizer,
  SafeHtml,
} from '@angular/platform-browser';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

export const isCaptchaError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { error?: { error?: string } }).error?.error === 'CAPTCHA_INVALID';

const isCaptchaSvg = (image: string) =>
  image.startsWith('<svg ') &&
  image.endsWith('</svg>') &&
  image.length < 20000 &&
  !/script|foreignObject|on[a-z]+=|href|<!|javascript:/i.test(image);

@Component({
  selector: 'app-captcha',
  templateUrl: './captcha.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    TranslatePipe,
  ],
})
export class CaptchaComponent {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private captchaField = viewChild<MatInput>('captchaField');

  code = signal('');
  image = signal<SafeHtml | null>(null);
  loading = signal(false);
  missing = signal(false);
  serverInvalid = signal(false);
  loadFailed = signal(false);
  readonly errorState: ErrorStateMatcher = {
    isErrorState: () =>
      this.loadFailed() || this.serverInvalid() || this.missing(),
  };

  private requestId = 0;

  constructor() {
    afterNextRender(() => {
      this.reload();
    });
  }

  markMissing() {
    this.missing.set(true);
    this.syncErrorState();
  }

  reload(invalid = false) {
    this.serverInvalid.set(invalid);
    this.missing.set(false);
    this.loadFailed.set(false);
    this.code.set('');
    this.syncErrorState();
    const requestId = ++this.requestId;
    this.loading.set(true);

    this.http
      .get<{ image: string }>(`${environment.baseUrl}/api/users/captcha`, {
        withCredentials: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) {
            return;
          }
          const image = response?.image;
          if (!image || !isCaptchaSvg(image)) {
            this.image.set(null);
            this.loadFailed.set(true);
            this.loading.set(false);
            this.syncErrorState();
            return;
          }
          this.image.set(this.sanitizer.bypassSecurityTrustHtml(image));
          this.loading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) {
            return;
          }
          this.image.set(null);
          this.loadFailed.set(true);
          this.loading.set(false);
          this.syncErrorState();
        },
      });
  }

  onCodeInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.code.set(value);
    this.missing.set(false);
    this.serverInvalid.set(false);
    this.syncErrorState();
  }

  // MatInput only refreshes error state on its own when the input has a form control.
  private syncErrorState() {
    this.captchaField()?.updateErrorState();
  }
}
