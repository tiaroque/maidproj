import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatInput } from '@angular/material/input';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
} from '@angular/material/form-field';
import { FieldTree, FormField } from '@angular/forms/signals';
import {
  LocateDatetime,
  UtilsService,
} from '../../../../../services/utils.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { hasKind } from '../../../../../forms/form-utils';

@Component({
  selector: 'app-birthdate',
  providers: [provideNgxMask()],
  imports: [
    MatInput,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    FormField,
    NgxMaskDirective,
    TranslatePipe,
  ],
  templateUrl: './birthdate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdateComponent {
  private readonly translateService = inject(TranslateService);

  isSignup = input.required<boolean>();
  birthDate = input.required<FieldTree<string>>();

  utilsService = inject(UtilsService);
  localeDate: LocateDatetime = this.utilsService.getLocaleDate('');
  protected readonly hasKind = hasKind;

  errorMessage = computed(() => {
    const field = this.birthDate()();
    if (hasKind(field, 'invalidDateFormat')) {
      return this.translateService.instant('invalidDateFormat');
    }
    if (hasKind(field, 'invalidDate')) {
      return this.translateService.instant('invalidDate');
    }
    if (hasKind(field, 'required')) {
      return this.translateService.instant('fieldRequired');
    }
    if (hasKind(field, 'ageInvalid')) {
      return this.translateService.instant('ageInvalid');
    }
    return '';
  });
}
