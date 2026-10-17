import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { ListService } from '../../../services/admin/list.service';
import { QuickSearchComponent } from '../../../shared/quick-search/quick-search.component';
import { FooterComponent } from '../footer/footer.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ListFilterService } from '../../../services/admin/list-filter.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, filter, map, of, switchMap } from 'rxjs';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { DatingCardComponent } from '../../admin/list/dating-card/dating-card.component';
import { LanguageService } from '../../../services/shared/language-service.service';
import {
  BROWSE_COUNTRIES,
  BrowseLocation,
  ResolvedBrowseLocation,
  SERVICE_SLUGS,
  slugifyLocation,
} from '../../../utils/browse-locations';
import { BrowseLocationsService } from '../../../services/shared/browse-locations.service';

@Component({
  selector: 'app-anonymous-profile-search',
  imports: [
    NgOptimizedImage,
    HeaderComponent,
    QuickSearchComponent,
    FooterComponent,
    DatingCardComponent,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anonymous-profile-search.component.html',
  host: { class: 'block h-full' },
})
export class AnonymousProfileSearchComponent {
  listService = inject(ListService);
  translateService = inject(TranslateService);
  listFilterService = inject(ListFilterService);
  readonly router = inject(Router);
  readonly routeActivated = inject(ActivatedRoute);
  readonly languageService = inject(LanguageService);
  readonly browseLocations = inject(BrowseLocationsService);
  readonly lang = this.languageService.defaultLang;
  readonly citySlug = slugifyLocation;
  readonly serviceSlugs = SERVICE_SLUGS;
  readonly countries = BROWSE_COUNTRIES;

  private readonly resolvedLocation$ = this.routeActivated.data.pipe(
    map((data) => data['browseLocation'] as ResolvedBrowseLocation | undefined),
  );

  /** Set on /browse/:country(/:city(/:service)), absent on plain /browse. */
  readonly browseLocation = toSignal(this.resolvedLocation$);

  readonly locationHeading = computed(() => {
    const resolved = this.browseLocation();
    if (!resolved) {
      return '';
    }
    return resolved.location?.locationName ?? resolved.country.name;
  });

  // Crawlers reach the city pages through these links; the sitemap alone
  // leaves them orphaned with no internal path to follow.
  readonly cities = toSignal(
    this.resolvedLocation$.pipe(
      switchMap((resolved) =>
        resolved ? this.browseLocations.citiesFor(resolved.country.slug) : of([]),
      ),
    ),
    { initialValue: [] as BrowseLocation[] },
  );

  /** Services actually covered in the current city, for the same reason. */
  readonly cityServices = computed(
    () => this.browseLocation()?.location?.services ?? [],
  );

  // Plain /browse (header link, sitemap) has no query params and lists the
  // newest cleaners.
  list$ = combineLatest([
    this.resolvedLocation$,
    this.routeActivated.queryParams,
  ]).pipe(
    map(([resolved, params]): Params => {
      const merged: Params = { type: 'Cleaner', ...params };
      if (!resolved) {
        return merged;
      }
      // The path is the authoritative filter here; a stale ?country= from a
      // copied URL must not contradict the page's own canonical.
      merged['country'] = resolved.country.code;
      if (resolved.location) {
        merged['location'] = resolved.location.location;
        // Read back by the filter panel to label the location chip.
        merged['locationName'] = resolved.location.locationName;
      } else {
        delete merged['location'];
        delete merged['locationName'];
      }
      if (resolved.service) {
        merged['service'] = resolved.service.service;
      } else {
        delete merged['service'];
      }
      return merged;
    }),
    filter((params) => {
      return this.listFilterService.validateQuickSearchParams(params);
    }),
    switchMap((c) => {
      const filters = new Map<string, string | undefined>();

      for (const key of ['type', 'service', 'country', 'location']) {
        if (c[key]) {
          filters.set(key, c[key]);
        }
      }

      return this.listService.getListAnonymous(filters);
    }),
  );

  listPaging = toSignal(this.list$);

  list = computed(() => this.listPaging() ?? []);

  // ngOnInit() {
  //   // debugger
  //   // this.routeActivated.queryParams.subscribe((params) => {
  //   //   debugger;
  //   //   if (!this.listFilterService.validateQuickSearchParams(params)) {
  //   //     const lang = this.translateService.currentLang;
  //   //     this.router.navigate([lang]);
  //   //   }
  //   // });
  // }
}
