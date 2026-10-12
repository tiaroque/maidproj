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
import { filter, map, switchMap } from 'rxjs';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { DatingCardComponent } from '../../admin/list/dating-card/dating-card.component';
import { LanguageService } from '../../../services/shared/language-service.service';

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
  readonly lang = this.languageService.defaultLang;

  // Plain /browse (header link, sitemap) has no query params and lists the
  // newest cleaners.
  list$ = this.routeActivated.queryParams.pipe(
    map((params): Params => ({ type: 'Cleaner', ...params })),
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
