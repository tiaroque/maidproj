import {
  Component,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { email, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../services/utils.service';
import { RouterModule } from '@angular/router';
import {
  MatError,
  MatFormField,
  MatLabel,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../services/shared/language-service.service';
import { hasKind } from '../../forms/form-utils';
import {
  CaptchaComponent,
  isCaptchaError,
} from '../captcha/captcha.component';

@Component({
  selector: 'app-recover',
  templateUrl: './recover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    RouterModule,
    MatProgressSpinner,
    TranslatePipe,
    CaptchaComponent,
  ],
})
export class RecoverComponent {
  private utilsService = inject(UtilsService);
  private authService = inject(AuthService);

  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  loading = signal(false);
  protected readonly hasKind = hasKind;

  captcha = viewChild(CaptchaComponent);
  recoverModel = signal({ email: '' });
  recoverPasswordForm = form(this.recoverModel, (p) => {
    required(p.email);
    email(p.email);
    maxLength(p.email, 35);
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    try {
      await submit(this.recoverPasswordForm, async (formRef) => {
        const userEmail = this.recoverModel().email.toLowerCase().trim();
        const close = this.translateService.instant('buttonClose');
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
          await firstValueFrom(
            this.authService.requestPasswordReset(userEmail, lang, captcha),
          );
          this.recoverModel.set({ email: '' });
          formRef().reset({ email: '' });
          this.captcha()?.reload();
          const recoverPasswordSuccess = this.translateService.instant(
            'userManagement.recoverPasswordSuccess',
          );
          this.utilsService.alert(recoverPasswordSuccess, close);
        } catch (error) {
          this.captcha()?.reload(isCaptchaError(error));
          if (isCaptchaError(error)) {
            return;
          }
          const recoverPasswordError = this.translateService.instant(
            'userManagement.recoverPasswordError',
          );
          this.utilsService.alert(recoverPasswordError, close);
        }
      });
    } finally {
      this.loading.set(false);
    }
  }
}
