import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AdminMailService,
  MailAudience,
  MailPreview,
} from '../../../services/admin-mail.service';
import { UtilsService } from '../../../services/utils.service';
import { VerificationService } from '../../../services/verification.service';

@Component({
  selector: 'app-admin-mail',
  templateUrl: './admin-mail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatProgressSpinner,
    TranslatePipe,
  ],
})
export class AdminMailComponent implements OnInit {
  private adminMailService = inject(AdminMailService);
  private verificationService = inject(VerificationService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected utils = this.utilsService;

  audience = signal<MailAudience>('one');
  email = signal('');
  subject = signal('');
  message = signal('');
  cta = signal('');
  url = signal('');
  preview = signal<MailPreview | null>(null);
  previewing = signal(false);
  sending = signal(false);

  private previewTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    const status = this.verificationService.current();
    if (status && !status.isModerator) {
      this.router.navigate(['../profile'], { relativeTo: this.route });
      return;
    }
    this.loadPreview();
  }

  setAudience(audience: MailAudience) {
    if (this.audience() === audience) {
      return;
    }
    this.audience.set(audience);
    this.preview.set(null);
    this.loadPreview();
  }

  setEmail(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
    this.schedulePreview();
  }

  setSubject(event: Event) {
    this.subject.set((event.target as HTMLInputElement).value);
  }

  setMessage(event: Event) {
    this.message.set((event.target as HTMLTextAreaElement).value);
  }

  setCta(event: Event) {
    this.cta.set((event.target as HTMLInputElement).value);
  }

  setUrl(event: Event) {
    this.url.set((event.target as HTMLInputElement).value);
  }

  send() {
    const subject = this.subject().trim();
    const message = this.message().trim();
    const cta = this.cta().trim();
    const url = this.url().trim();
    const email = this.email().trim().toLowerCase();

    if (!subject || !message) {
      this.notify('adminMail.required');
      return;
    }
    if (Boolean(cta) !== Boolean(url)) {
      this.notify('adminMail.linkRequired');
      return;
    }
    if (url && !this.isHttpUrl(url)) {
      this.notify('adminMail.urlInvalid');
      return;
    }
    if (this.audience() === 'one' && this.preview()?.count !== 1) {
      this.notify('adminMail.previewMissing');
      return;
    }
    if (this.audience() === 'all') {
      const count = this.preview()?.count ?? 0;
      if (count === 0) {
        this.notify('adminMail.none');
        return;
      }
      const confirmed = window.confirm(
        this.translateService.instant('adminMail.confirmAll', { count }),
      );
      if (!confirmed) {
        return;
      }
    }

    this.sending.set(true);
    this.adminMailService
      .send({
        audience: this.audience(),
        email: this.audience() === 'one' ? email : undefined,
        subject,
        message,
        cta: cta || undefined,
        url: url || undefined,
      })
      .subscribe({
        next: (result) => {
          this.sending.set(false);
          const key = result.failed
            ? 'adminMail.sentPartial'
            : result.sent === 1
              ? 'adminMail.sentOne'
              : 'adminMail.sent';
          this.notify(key, { sent: result.sent, failed: result.failed });
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          if (error.status === 403) {
            this.router.navigate(['../profile'], { relativeTo: this.route });
            return;
          }
          if (error.status === 404) {
            this.notify('adminMail.previewMissing');
            return;
          }
          if (error.status === 409) {
            this.notify('adminMail.none');
            return;
          }
          this.notify('adminMail.errors.generic');
        },
      });
  }

  private schedulePreview() {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.loadPreview(), 400);
  }

  private loadPreview() {
    if (this.audience() === 'one' && !this.email().trim().includes('@')) {
      this.preview.set(null);
      this.previewing.set(false);
      return;
    }
    this.previewing.set(true);
    this.adminMailService
      .preview(
        this.audience(),
        this.audience() === 'one' ? this.email().trim() : undefined,
      )
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          this.previewing.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.previewing.set(false);
          this.preview.set(null);
          if (error.status === 403) {
            this.router.navigate(['../profile'], { relativeTo: this.route });
          }
        },
      });
  }

  private isHttpUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private notify(key: string, params?: Record<string, number>) {
    this.utilsService.alert(
      this.translateService.instant(key, params),
      this.translateService.instant('buttonClose'),
    );
  }
}
