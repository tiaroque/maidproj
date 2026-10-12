import {
  Component,
  inject,
  PLATFORM_ID,
  OnInit,
  viewChild,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { ChatStore } from '../../../services/admin/signals/store';
import { UserDetailsObject } from '../../../services/admin/interfaces/user.interface';
import { form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { UserService } from '../../../services/user.service';
import { BirthdateComponent } from '../profile-base/xprofile/birthdate/birthdate.component';
import { DetailsComponent } from '../profile-base/xprofile/details/details.component';
import { UtilsService } from '../../../services/utils.service';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { parse, subMinutes } from 'date-fns';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { GoogleAnalyticsService } from '../../../services/shared/analytics.service';
import { LanguageService } from '../../../services/shared/language-service.service';
import { GenderComponent } from '../../../shared/gender/gender.component';
import { ProfileNameComponent } from '../../../shared/profile-name/profile-name.component';
import {
  defaultProfileForm,
  defaultSignupConditions,
  profileFormSchema,
  signupConditionsSchema,
} from '../../../forms/profile-form';

@Component({
  selector: 'app-signup',
  imports: [
    MatButtonModule,
    MatStepperModule,
    MatCheckboxModule,
    FormField,
    MatCardModule,
    BirthdateComponent,
    DetailsComponent,
    GenderComponent,
    ProfileNameComponent,
    MatDialogModule,
    TranslatePipe,
    RouterLink,
    MatProgressSpinner,
  ],
  templateUrl: './signup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent implements OnInit {
  analyticsService = inject(GoogleAnalyticsService);
  readonly genderComponent = viewChild<GenderComponent>('genderComponentName');

  readonly storeChat = inject(ChatStore);
  readonly themeService = inject(ThemeService);
  readonly usersService = inject(UserService);
  readonly utilsService = inject(UtilsService);
  readonly authService = inject(AuthService);
  readonly cookieService = inject(CookieService);
  readonly languageService = inject(LanguageService);
  readonly platformId = inject(PLATFORM_ID);
  readonly router = inject(Router);
  readonly dialog = inject(MatDialog);
  readonly translateService = inject(TranslateService);
  readonly loading = signal(false);
  lang = this.languageService.defaultLang;

  readonly profileModel = signal(defaultProfileForm());
  readonly profileForm = form(
    this.profileModel,
    profileFormSchema(this.storeChat),
  );

  readonly conditionsModel = signal(defaultSignupConditions());
  readonly conditionsForm = form(this.conditionsModel, signupConditionsSchema);
  readonly canFinish = computed(
    () =>
      this.profileForm.gender().valid() &&
      this.profileForm.birthDate().valid() &&
      this.profileForm.details().valid() &&
      this.conditionsForm.agreeTermsConditions().value() === true &&
      !this.loading(),
  );

  user: UserDetailsObject;
  name: string | undefined;

  async ngOnInit() {
    const displayName = this.cookieService.get('displayName');
    if (displayName) {
      this.profileForm.details.profileName().value.set(displayName);
    }

    const lang = this.translateService.currentLang;
    await this.storeChat.loadCountries(lang);
  }

  markGenderAsToutched() {
    this.profileForm.gender().markAsTouched();
  }

  markBirthDateAsToutched() {
    this.profileForm.birthDate().markAsTouched();
  }

  markDetailsAsTouched() {
    this.profileForm.details().markAsTouched();
  }

  isSignupValid() {
    return (
      this.profileForm.gender().valid() &&
      this.profileForm.birthDate().valid() &&
      this.profileForm.details().valid() &&
      this.conditionsForm.agreeTermsConditions().value() === true
    );
  }

  submit() {
    if (!this.isSignupValid()) {
      this.profileForm.gender().markAsTouched();
      this.profileForm.birthDate().markAsTouched();
      this.profileForm.details().markAsTouched();
      this.conditionsForm.agreeTermsConditions().markAsTouched();
      const close = this.translateService.instant('buttonClose');
      const invalidData = this.translateService.instant('invalidData');
      this.utilsService.alert(invalidData, close);
      return;
    }

    const lang = this.translateService.currentLang;
    const localBirthday = parse(
      this.profileForm.birthDate().value(),
      'dd/MM/yyyy',
      new Date(),
    );
    const birthdayIso = subMinutes(
      localBirthday,
      localBirthday.getTimezoneOffset(),
    ).toISOString();

    const formValue = Object.assign(
      {},
      this.profileForm.details().value(),
      { birthday: birthdayIso },
      { userType: this.profileForm.gender().value() },
    );

    this.analyticsService.logEvent(
      'signup',
      'authentication',
      'usertType',
      this.profileForm.gender().value(),
    );

    const close = this.translateService.instant('buttonClose');
    const saved = this.translateService.instant('saved');
    const saveError = this.translateService.instant('saveError');
    this.loading.set(true);

    this.usersService.createSignUp(formValue).subscribe({
      next: (val) => {
        this.utilsService.alert(saved, close);
        setTimeout(() => {
          this.router.navigate([lang, 'admin', 'list']);
        }, 2000);
      },
      error: () => {
        this.loading.set(false);
        this.utilsService.alert(saveError, close);
      },
    });
  }
}
