import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UtilsService } from '../../services/utils.service';
import { firstValueFrom } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { UserModel } from '../../services/admin/interfaces/user.interface';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  defaultCredentials,
  passwordRuleStates,
  registerCredentialsSchema,
} from '../../forms/credentials-form';
import { hasKind } from '../../forms/form-utils';
import { LanguageService } from '../../services/shared/language-service.service';
import { GoogleComponent } from '../../shared/snackbars/google/google.component';
import { FacebookComponent } from '../../shared/snackbars/facebook/facebook.component';
import {
  CaptchaComponent,
  isCaptchaError,
} from '../captcha/captcha.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
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
export class RegisterComponent {
  private authService = inject(AuthService);
  private utilsService = inject(UtilsService);

  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);
  loading = signal(false);
  hide = true;
  protected readonly hasKind = hasKind;

  registerModel = signal(defaultCredentials());
  registerForm = form(this.registerModel, registerCredentialsSchema);
  captcha = viewChild(CaptchaComponent);
  passwordRules = computed(() => passwordRuleStates(this.registerModel().pass));

  async onSubmit(event: Event) {
    event.preventDefault();
    const close = this.translateService.instant('buttonClose') as string;
    const pleaseVerifyAccount = this.translateService.instant(
      'auth.pleaseVerifyAccount',
    );

    this.loading.set(true);
    try {
      await submit(this.registerForm, async (formRef) => {
        const { email, pass } = this.registerModel();
        const lang =
          this.languageService.defaultLang() ||
          this.translateService.getCurrentLang() ||
          'en';
        const captcha = this.captcha()?.code()?.trim() ?? '';
        if (!captcha) {
          this.captcha()?.markMissing();
          return;
        }

        try {
          const user: UserModel = {
            name: '',
            email: email.toLowerCase().trim(),
            emailVerified: false,
            uid: '',
            additionalUserInfo: [],
            images: [],
            password: pass,
          };

          await firstValueFrom(this.authService.createUser(user, lang, captcha));
          const cleared = defaultCredentials();
          this.registerModel.set(cleared);
          formRef().reset(cleared);
          this.captcha()?.reload();
          this.utilsService.alert(pleaseVerifyAccount, close);
          return undefined;
        } catch (error: any) {
          this.captcha()?.reload(isCaptchaError(error));
          if (isCaptchaError(error)) {
            return undefined;
          }
          if (error?.error?.error === 'WEAK_PASSWORD') {
            this.utilsService.alert(
              this.translateService.instant('auth.passwordWeak'),
              close,
              5000,
            );
            return undefined;
          }
          return this.errorAccountExists(error);
        }
      });
    } finally {
      this.loading.set(false);
    }
  }

  private errorAccountExists(error: any) {
    const close = this.translateService.instant('buttonClose') as string;
    const emailAlreadyExists = this.translateService.instant(
      'auth.emailAlreadyExists',
    );

    if (
      error?.error?.error === 'USE_GOOGLE' ||
      error?.error?.error === 'USE_FACEBOOK'
    ) {
      const snackbar =
        error.error.error === 'USE_FACEBOOK' ? FacebookComponent : GoogleComponent;
      this.utilsService.providerOAuth('', snackbar, 5000);
      return {
        kind: 'emailTaken',
        fieldTree: this.registerForm.email,
      };
    }

    if (
      error?.error?.error === 'EMAIL_EXISTS' ||
      error?.error?.message?.includes('E11000 duplicate key')
    ) {
      this.utilsService.alert(emailAlreadyExists, close, 5000);
      return {
        kind: 'emailTaken',
        fieldTree: this.registerForm.email,
      };
    }

    this.utilsService.alert(emailAlreadyExists, close, 5000);
    return undefined;
  }
}
