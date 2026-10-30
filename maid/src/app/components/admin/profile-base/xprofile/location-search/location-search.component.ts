import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssetsService } from '../../../../../services/admin/assets.service';
import { UtilsService } from '../../../../../services/utils.service';
import { ChatStore } from '../../../../../services/admin/signals/store';
import {
  ItemFilter,
  MeridianLocationResult,
} from '../../../../../services/admin/interfaces/common';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
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
import { ListFilterModel } from '../../../../../forms/list-filter-form';
import { hasKind } from '../../../../../forms/form-utils';

interface MeridianCountry {
  code: string;
  name: string;
}

@Component({
  selector: 'app-location-search',
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatAutocompleteModule,
    MatSelectModule,
    MatButtonModule,
    TranslatePipe,
    TitleCasePipe,
    MatProgressSpinner,
  ],
  templateUrl: './location-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSearchComponent {
  form = input.required<FieldTree<ListFilterModel>>();
  showLabel = input(true);
  compact = input(false);
  private assetsService = inject(AssetsService);
  private destroyRef = inject(DestroyRef);
  protected utilsService = inject(UtilsService);
  private storeChat = inject(ChatStore);
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
    this.resetLocation();
    this.form()().markAsDirty();
  }

  // Drops any picked location, falling back to filtering by country alone.
  private resetLocation() {
    const country = this.form().country().value();
    this.results.set([]);
    this.searchError.set(false);
    this.form().location().value.set('');

    if (country) {
      this.storeChat.replaceFilter({
        name:
          this.countries.find((item) => item.code === country)?.name ?? country,
        value: `${country}-null`,
        type: 'location',
      });
    } else {
      this.storeChat.removeFilters('location', 'changing');
    }
  }

  search(query: string) {
    this.searchTerms.next(query.trim());
  }

  clearInput(
    event: Event,
    trigger: MatAutocompleteTrigger,
    input: HTMLInputElement,
  ) {
    input.value = '';
    input.dispatchEvent(new Event('input', {}));

    this.resetLocation();
    this.form()().markAsDirty();
  }

  selectLocation(event: MatAutocompleteSelectedEvent) {
    const result = event.option.value as MeridianLocationResult;
    const filterItem: ItemFilter = {
      name: result.location.name,
      value: `${this.form().country().value()}-${result.location.lineage}`,
      type: 'location',
    };

    this.storeChat.replaceFilter(filterItem);
    this.form().location().value.set(filterItem.value);
    this.results.set([]);
    this.form()().markAsDirty();
  }

  displayValue(value: MeridianLocationResult | string | null) {
    if (!value) {
      return '';
    }
    if (typeof value !== 'string') {
      return value.location.name;
    }
    return (
      this.storeChat
        .changingFiltersList()
        .find((filter) => filter.type === 'location' && filter.value === value)
        ?.name ?? ''
    );
  }
}
