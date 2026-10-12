import {
  Component,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { UtilsService } from '../../services/utils.service';
import { hasKind } from '../../forms/form-utils';

@Component({
  selector: 'app-profile-name',
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile-name.component.html',
})
export class ProfileNameComponent {
  profileName = input.required<FieldTree<string>>();
  readonly utilsService = inject(UtilsService);
  protected readonly hasKind = hasKind;
}
