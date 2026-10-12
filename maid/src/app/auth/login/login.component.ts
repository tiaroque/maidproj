import {
  Component,
  inject,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../services/utils.service';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { Router, RouterModule } from '@angular/router';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '../../services/shared/language-service.service';
import {
  credentialsSchema,
  defaultCredentials,
} from '../../forms/credentials-form';
import { hasKind } from '../../forms/form-utils';
import { GoogleComponent } from '../../shared/snackbars/google/google.component';
import {
  CaptchaComponent,
  isCaptchaError,
} from '../captcha/captcha.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    RouterModule,
    MatProgressSpinner,
    TranslatePipe,
    CaptchaComponent,
  ],
})
export class LoginComponent {
  private utilsService = inject(UtilsService);

  readonly selectionScreenChange = output<string>();
  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  authService = inject(AuthService);
  cookieService = inject(CookieService);

  private router: Router = inject(Router);

  hide = true;
  loading = signal(false);
  captchaRequired = signal(false);
  protected readonly hasKind = hasKind;

  loginModel = signal(defaultCredentials());
  loginForm = form(this.loginModel, credentialsSchema);
  captcha = viewChild(CaptchaComponent);

  async onSubmit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    try {
      await submit(this.loginForm, async () => {
        const lang =
          this.languageService.defaultLang() ||
          this.translateService.getCurrentLang() ||
          'en';
        const close = this.translateService.instant('buttonClose') as string;
        const { email, pass } = this.loginModel();
        const userEmail = email.toLowerCase().trim();
        const captcha = this.captchaRequired()
          ? (this.captcha()?.code()?.trim() ?? '')
          : '';
        if (this.captchaRequired() && !captcha) {
          this.captcha()?.markMissing();
          return;
        }
        try {
          this.cookieService.set('displayName', '');

          await firstValueFrom(
            this.authService.sessionLogin(userEmail, pass, captcha),
          );
          const checkAuth = await firstValueFrom(this.authService.checkAuth());

          if (!checkAuth.hasUserType) {
            await this.router.navigateByUrl(`/${lang}/admin/signup`);
            return;
          }

          await this.router.navigateByUrl(`/${lang}/admin/list`);
        } catch (err: any) {
          this.revealCaptcha(err);
          if (isCaptchaError(err)) {
            return;
          }
          if (err?.error?.error === 'USE_GOOGLE') {
            this.utilsService.providerOAuth('', GoogleComponent, 5000);
          } else if (err?.status === 403) {
            const text = this.translateService.instant(
              'auth.pleaseVerifyAccount',
            );
            this.utilsService.alert(text, close);
            void firstValueFrom(
              this.authService.resendVerificationEmail(userEmail, lang),
            );
          } else if (err?.status === 401) {
            const text = this.translateService.instant('auth.userOrPassInvalid');
            this.utilsService.alert(text, close);
          } else {
            const text = this.translateService.instant('pleaseTryLater');
            this.utilsService.alert(text, close);
          }
        }
      });
    } finally {
      this.loading.set(false);
    }
  }

  private revealCaptcha(err: unknown) {
    const body = (
      err as { error?: { error?: string; captchaRequired?: boolean } }
    )?.error;
    if (!body?.captchaRequired && !isCaptchaError(err)) {
      return;
    }
    const alreadyVisible = !!this.captcha();
    this.captchaRequired.set(true);
    if (alreadyVisible) {
      this.captcha()?.reload(isCaptchaError(err));
    }
  }
}
