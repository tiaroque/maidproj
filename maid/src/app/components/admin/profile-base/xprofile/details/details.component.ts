import {
  Component,
  computed,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { UtilsService } from '../../../../../services/utils.service';
import { LocationComponent } from '../location/location.component';
import { TranslatePipe } from '@ngx-translate/core';
import { PlaceModel, ProfileDetailsModel } from '../../../../../forms/profile-form';
import { hasKind } from '../../../../../forms/form-utils';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatAutocompleteModule,
    MatButtonModule,
    MatOptionModule,
    MatSelectModule,
    LocationComponent,
    TranslatePipe,
  ],
})
export class DetailsComponent {
  form = input.required<FieldTree<ProfileDetailsModel>>();
  // The location picker only touches the place fields; the field tree type is
  // invariant, so it needs the narrower view spelled out.
  readonly place = computed(
    () => this.form() as unknown as FieldTree<PlaceModel>,
  );
  isSignup = input.required<boolean>();

  utilsService = inject(UtilsService);
  protected readonly hasKind = hasKind;

  showUnrequiredFields = input(true);
  isCleaner = input(false);
}
