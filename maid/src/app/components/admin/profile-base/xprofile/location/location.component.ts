import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { AssetsService } from '../../../../../services/admin/assets.service';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { UtilsService } from '../../../../../services/utils.service';
import { MatIcon } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MeridianLocationResult } from '../../../../../services/admin/interfaces/common';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TitleCasePipe } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlaceModel } from '../../../../../forms/profile-form';
import { hasKind } from '../../../../../forms/form-utils';

interface MeridianCountry {
  code: string;
  name: string;
}

@Component({
  selector: 'app-location',
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatAutocompleteModule,
    MatSelectModule,
    MatIcon,
    MatButtonModule,
    TranslatePipe,
    TitleCasePipe,
    MatProgressSpinner,
  ],
  templateUrl: './location.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LocationComponent {
  form = input.required<FieldTree<PlaceModel>>();
  isSignup = input.required<boolean>();

  private assetsService = inject(AssetsService);
  private destroyRef = inject(DestroyRef);
  protected utilsService = inject(UtilsService);
  protected translateService = inject(TranslateService);
  protected readonly hasKind = hasKind;

  readonly countries: MeridianCountry[] = [
    { code: 'PT', name: 'Portugal' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
  ];

  readonly results = signal<MeridianLocationResult[]>([]);
  readonly loading = signal(false);
  readonly searchError = signal(false);

  private readonly searchTerms = new Subject<string>();

  constructor() {
    this.searchTerms
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          const country = this.form().country().value();
          if (query.length < 2 || !country) {
            this.loading.set(false);
            return of({ results: [] });
          }
          this.loading.set(true);
          this.searchError.set(false);
          return this.assetsService.searchMeridianLocations(query, country).pipe(
            catchError(() => {
              this.searchError.set(true);
              return of({ results: [] });
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => this.results.set(response.results));
  }

  countryFlag(code: string): string {
    return [...code.toUpperCase()]
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }

  countryName(code: string): string {
    return this.countries.find((country) => country.code === code)?.name ?? code;
  }

  countryChanged() {
    this.clearLocation();
    this.form()().markAsDirty();
  }

  search(query: string) {
    this.searchTerms.next(query.trim());
  }

  selectLocation(event: MatAutocompleteSelectedEvent) {
    const { location } = event.option.value as MeridianLocationResult;
    this.form().locationName().value.set(location.name);
    this.form().location().value.set(location.lineage);
    this.results.set([]);
    this.form()().markAsDirty();
  }

  clearLocation() {
    this.form().location().value.set('');
    this.form().locationName().value.set('');
    this.form().location().markAsTouched();
    this.results.set([]);
    this.searchError.set(false);
  }

  displayValue(value: MeridianLocationResult | string | null) {
    if (!value) {
      return '';
    }
    if (typeof value !== 'string') {
      return value.location.name;
    }
    return this.form().locationName().value();
  }
}
