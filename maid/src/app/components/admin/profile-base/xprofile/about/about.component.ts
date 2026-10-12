import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ProfileAboutModel } from '../../../../../forms/profile-form';
import { hasKind } from '../../../../../forms/form-utils';
import { UtilsService } from '../../../../../services/utils.service';
import { LanguagesComponent } from '../languages/languages.component';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    LanguagesComponent,
    TranslatePipe,
  ],
})
export class AboutComponent {
  form = input.required<FieldTree<ProfileAboutModel>>();
  isCleaner = input.required<boolean>();

  protected utilsService = inject(UtilsService);
  protected readonly hasKind = hasKind;
  readonly maxDescription = 500;
}
