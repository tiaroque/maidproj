import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FieldTree, form, FormField, readonly, schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { PlaceModel, ProfileWorkModel } from '../../../../../forms/profile-form';
import { hasKind } from '../../../../../forms/form-utils';
import {
  currencyForCountry,
  DayKey,
  DAYS,
  MAX_AREAS,
  MAX_RATE,
  MIN_RATE,
  SERVICE_ICONS,
  SERVICES,
  SlotKey,
  SLOTS,
  slotsForDay,
  withDaySlots,
} from '../../../../../services/admin/interfaces/service-catalog';
import { UtilsService } from '../../../../../services/utils.service';
import { LocationComponent } from '../location/location.component';
import { ChipPickerComponent } from '../../../../../shared/chip-picker/chip-picker.component';

const emptyPlace = (): PlaceModel => ({ country: '', location: '', locationName: '' });

const placeSchema = schema<PlaceModel>((p) => {
  readonly(p.location, { when: ({ valueOf }) => !valueOf(p.country) });
});

@Component({
  selector: 'app-work',
  templateUrl: './work.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButtonModule,
    MatCheckbox,
    MatSlideToggle,
    ChipPickerComponent,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatInput,
    MatLabel,
    MatSuffix,
    LocationComponent,
    TranslatePipe,
  ],
})
export class WorkComponent {
  form = input.required<FieldTree<ProfileWorkModel>>();
  // Only cleaners list the areas they travel to.
  isCleaner = input.required<boolean>();
  homeCountry = input<string>('');

  protected utilsService = inject(UtilsService);
  protected readonly hasKind = hasKind;

  readonly services = SERVICES;
  readonly serviceIcons = SERVICE_ICONS;
  readonly days = DAYS;
  readonly slots = SLOTS;
  readonly minRate = MIN_RATE;
  readonly maxRate = MAX_RATE;
  readonly maxAreas = MAX_AREAS;

  readonly currency = computed(() => currencyForCountry(this.homeCountry()));

  readonly slotsByDay = computed(() => {
    const availability = this.form().availability().value();
    return Object.fromEntries(
      DAYS.map((day) => [day, slotsForDay(availability, day)]),
    ) as Record<DayKey, SlotKey[]>;
  });

  setOpenToRelocate(open: boolean) {
    this.form().openToRelocate().value.set(open);
    this.form().openToRelocate().markAsDirty();
  }

  setDaySlots(day: DayKey, slots: readonly SlotKey[]) {
    this.form()
      .availability()
      .value.update((availability) => withDaySlots(availability, day, slots));
    this.form().availability().markAsDirty();
  }

  private readonly draftModel = signal(emptyPlace());
  readonly draft = form(this.draftModel, placeSchema);

  readonly canAddArea = computed(() => {
    const draft = this.draftModel();
    const areas = this.form().areasCovered().value();
    return (
      !!draft.location &&
      areas.length < MAX_AREAS &&
      !areas.some((area) => area.location === draft.location)
    );
  });

  addArea() {
    if (!this.canAddArea()) {
      return;
    }
    const { country, location, locationName } = this.draftModel();
    this.form()
      .areasCovered()
      .value.update((areas) => [...areas, { country, location, locationName }]);
    this.form().areasCovered().markAsDirty();
    this.draftModel.set({ ...emptyPlace(), country });
  }

  removeArea(location: string) {
    this.form()
      .areasCovered()
      .value.update((areas) => areas.filter((area) => area.location !== location));
    this.form().areasCovered().markAsDirty();
  }
}
