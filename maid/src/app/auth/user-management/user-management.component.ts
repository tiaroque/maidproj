import {
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { NgStyle } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { hasKind } from '../../forms/form-utils';
import {
  passwordRuleStates,
  strongPasswordSchema,
} from '../../forms/credentials-form';
import {
  CaptchaComponent,
  isCaptchaError,
} from '../captcha/captcha.component';

@Component({
  selector: 'app-user-recovery',
  templateUrl: './user-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatButtonModule,
    MatIcon,
    NgStyle,
    RouterLink,
    MatProgressSpinner,
    TranslatePipe,
    CaptchaComponent,
  ],
})
export class UserManagementComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private translateService = inject(TranslateService);
  protected readonly hasKind = hasKind;

  mode = signal<string | null>(null);
  loading = signal(false);
  loadingResetSubmit = signal(false);
  actionCode: string;

  errorMessage = signal('');
  resetPasswordSuccessMessage = signal('');
  verifiedEmailSuccessMessage = signal('');

  captcha = viewChild(CaptchaComponent);
  resetModel = signal({ pass: '' });
  resetForm = form(this.resetModel, strongPasswordSchema);
  passwordRules = computed(() => passwordRuleStates(this.resetModel().pass));

  hide = true;
  private emailVerificationRequested = false;

  constructor() {
    afterNextRender(() => {
      void this.verifyUserManagement();
    });
  }

  async verifyUserManagement() {
    const lang = this.translateService.currentLang;
    this.loading.set(true);
    const params = this.activatedRoute.snapshot.queryParamMap;
    // if we didn't receive any parameters,
    // we can't do anything
    if (!params) {
      this.router.navigate([lang, 'login']);
    }

    this.mode.set(params.get('mode') as string);
    this.actionCode = params.get('oobCode') as string;

    if (this.mode() === UserManagementActions.resetPassword) {
      if (!this.actionCode) {
        this.translateService
          .get('userManagement.verifyCodeExpired')
          .subscribe((val: string) => {
            this.errorMessage.set(val);
          });
      }
      this.loading.set(false);
      return;
    }

    if (this.mode() === UserManagementActions.verifyEmail) {
      await this.updateEmailVerification();
      this.loading.set(false);
      return;
    }

    this.router.navigate([lang, 'login']);
  }

  async onSubmitResetPassword(event: Event) {
    event.preventDefault();
    this.loadingResetSubmit.set(true);
    try {
      await submit(this.resetForm, async (formRef) => {
        const pass = this.resetModel().pass;
        const captcha = this.captcha()?.code()?.trim() ?? '';
        if (!captcha) {
          this.captcha()?.markMissing();
          return;
        }

        try {
          await firstValueFrom(
            this.authService.resetPassword(this.actionCode, pass, captcha),
          );
          formRef().reset();

          this.translateService
            .get('userManagement.redefinePasswordSuccess')
            .subscribe((val: string) => {
              this.resetPasswordSuccessMessage.set(val);
            });
        } catch (error: any) {
          this.captcha()?.reload(isCaptchaError(error));
          if (isCaptchaError(error) || error?.error?.error === 'WEAK_PASSWORD') {
            return;
          }
          this.translateService
            .get('userManagement.resetPasswordError')
            .subscribe((val: string) => {
              this.errorMessage.set(val);
            });
        }
      });
    } finally {
      this.loadingResetSubmit.set(false);
    }
  }

  private async updateEmailVerification() {
    if (!this.actionCode) {
      this.translateService
        .get('userManagement.validatingEmailError')
        .subscribe((val: string) => {
          this.errorMessage.set(val);
        });
      return;
    }

    if (this.emailVerificationRequested || this.verifiedEmailSuccessMessage()) {
      return;
    }
    this.emailVerificationRequested = true;

    try {
      await firstValueFrom(this.authService.verifyEmail(this.actionCode));

      this.translateService
        .get('userManagement.emailVerifiedSuccess')
        .subscribe((val: string) => {
          this.verifiedEmailSuccessMessage.set(val);
        });
    } catch (error) {
      this.emailVerificationRequested = false;
      if (this.verifiedEmailSuccessMessage()) {
        return;
      }
      this.translateService
        .get('userManagement.validatingEmailError')
        .subscribe((val: string) => {
          this.errorMessage.set(val);
        });
    }
  }
}

class UserManagementActions {
  static verifyEmail = 'verifyEmail';
  static resetPassword = 'resetPassword';
}
