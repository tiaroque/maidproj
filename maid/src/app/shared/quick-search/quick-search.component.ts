import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ListFilterService } from '../../services/admin/list-filter.service';
import { ChatStore } from '../../services/admin/signals/store';
import { SERVICES } from '../../services/admin/interfaces/service-catalog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { UtilsService } from '../../services/utils.service';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { LocationSearchComponent } from '../../components/admin/profile-base/xprofile/location-search/location-search.component';
import { LanguageService } from '../../services/shared/language-service.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-quick-search',
  imports: [
    MatFormField,
    MatLabel,
    LocationSearchComponent,
    TranslatePipe,
    FormField,
    MatSelectModule,
    RouterLink,
  ],
  templateUrl: './quick-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class QuickSearchComponent {
  readonly router = inject(Router);

  listFilterService = inject(ListFilterService);
  readonly translateService = inject(TranslateService);
  readonly utilsService = inject(UtilsService);
  readonly storeChat = inject(ChatStore);
  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;

  filterForm = this.listFilterService.filterForm;
  readonly services = SERVICES;

  // The empty option carries null, and a null value makes the signal form drop
  // the field entirely, which left the previous choice stuck on screen. An
  // empty string keeps the field and reads as "no selection".
  genderChanged(event: MatSelectChange) {
    if (event.value == null) {
      this.filterForm.gender().value.set('');
    }
  }

  serviceChanged(event: MatSelectChange) {
    if (event.value == null) {
      this.filterForm.service().value.set('');
    }
  }

  filterList() {
    if (this.filterForm().valid()) {
      this.filterForm().reset();
      const params = this.listFilterService.navigateQuickSearchParams();
      this.router.navigate([this.lang(), 'browse'], {
        queryParams: params,
      });
    } else {
      this.filterForm().markAsTouched();
    }
  }
}
