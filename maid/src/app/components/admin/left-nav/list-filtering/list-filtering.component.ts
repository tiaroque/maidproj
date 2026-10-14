import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  output,
  signal,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { MatSliderModule } from '@angular/material/slider';
import { LanguagesComponent } from '../../profile-base/xprofile/languages/languages.component';
import { ChatStore } from '../../../../services/admin/signals/store';
import { LocationSearchComponent } from '../../profile-base/xprofile/location-search/location-search.component';
import { ListFilterService } from '../../../../services/admin/list-filter.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  FilterType,
  ToggleFilterType,
} from '../../../../services/admin/interfaces/common';
import { MatIcon } from '@angular/material/icon';
import { ChipPickerComponent } from '../../../../shared/chip-picker/chip-picker.component';
import {
  DAYS,
  SERVICE_ICONS,
  SERVICES,
  SLOTS,
} from '../../../../services/admin/interfaces/service-catalog';

type FilterPanel = 'location' | 'services' | 'rate' | 'availability' | 'languages';
type FilterChip = FilterPanel | ToggleFilterType;

@Component({
  selector: 'app-list-filtering',
  imports: [
    NgClass,
    NgTemplateOutlet,
    FormField,
    MatSliderModule,
    ChipPickerComponent,
    LanguagesComponent,
    LocationSearchComponent,
    TranslatePipe,
    MatIcon,
  ],
  templateUrl: './list-filtering.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block min-w-0 w-full flex-1' },
})
export class ListFilteringComponent {
  private translateService = inject(TranslateService);
  private elementRef = inject(ElementRef<HTMLElement>);

  searchChange = output<boolean>();
  storeChat = inject(ChatStore);
  listFilterService = inject(ListFilterService);
  sliders = this.listFilterService.sliders;
  filterForm = this.listFilterService.filterForm;
  openPanel = signal<FilterPanel | null>(null);
  // Clients browse cleaners, which is the only list this choice applies to.
  readonly searchingCleaners = computed(
    () => this.storeChat.userType() === 'Client',
  );

  readonly services = SERVICES;
  readonly serviceIcons = SERVICE_ICONS;
  readonly days = DAYS;
  readonly slots = SLOTS;

  toggle(panel: FilterPanel) {
    this.openPanel.update((current) => (current === panel ? null : panel));
  }

  // Country and location menus are drawn in an overlay outside this host, so a
  // click there is still part of the open filter.
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent) {
    if (!this.openPanel()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.elementRef.nativeElement.contains(target)) {
      return;
    }

    const element =
      target instanceof Element ? target : target.parentElement;
    if (element?.closest('.cdk-overlay-pane')) {
      return;
    }

    this.openPanel.set(null);
  }

  chipClasses(panel: FilterChip, types: FilterType[]) {
    const active =
      this.openPanel() === panel ||
      this.storeChat
        .appliedFiltersList()
        .some((filter) => types.includes(filter.type));
    return active
      ? 'is-active border-[#7fd8c3] bg-[#7fd8c3]/10'
      : 'border-(--mat-sys-outline-variant) bg-white/30 dark:bg-transparent';
  }

  // One value shows its name; several show the filter name and a count.
  chipLabel(types: FilterType[], fallbackKey: string) {
    const applied = this.storeChat
      .appliedFiltersList()
      .filter((filter) => types.includes(filter.type));
    const fallback = this.translateService.instant(fallbackKey);
    if (applied.length === 1) {
      return applied[0].name;
    }
    return applied.length > 1 ? `${fallback} (${applied.length})` : fallback;
  }

  filterList() {
    if (!this.filterForm().valid()) {
      this.filterForm().markAsTouched();
      return;
    }

    this.listFilterService.changeSliderFilters();
    this.listFilterService.syncMultiFilters();
    this.storeChat.applyFilters();
    this.filterForm().reset();
    this.openPanel.set(null);
    this.searchChange.emit(true);
  }

  toggleFilter(type: ToggleFilterType) {
    this.openPanel.set(null);
    this.listFilterService.toggleFilter(type);
    this.searchChange.emit(true);
  }

  resetFilters() {
    this.openPanel.set(null);
    this.listFilterService.resetFilters();
    this.searchChange.emit(true);
  }
}
