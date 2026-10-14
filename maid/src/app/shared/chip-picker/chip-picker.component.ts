import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

// Multi-select chips in the same style as the removable .filter-chip.
// Works with [formField] or with [value] / (valueChange).
@Component({
  selector: 'app-chip-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, TranslatePipe],
  host: { role: 'group', class: 'flex flex-wrap gap-2' },
  template: `
    @for (option of options(); track option) {
      @let selected = value().includes(option);
      @let icon = icons()?.[option];
      <button
        type="button"
        class="chip-toggle"
        [attr.aria-pressed]="selected"
        [disabled]="disabled() || readonly()"
        (click)="toggle(option)"
        (blur)="touch.emit()"
      >
        @if (icon) {
          <span class="filter-chip-icon" aria-hidden="true">
            <mat-icon class="size-3.5! text-sm! leading-none!">{{ icon }}</mat-icon>
          </span>
        } @else {
          <span class="filter-chip-icon" aria-hidden="true">
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              viewBox="0 0 24 24"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        }
        <span class="min-w-0 truncate">{{ labelPrefix() + option | translate }}</span>
      </button>
    }
  `,
})
export class ChipPickerComponent<T extends string> implements FormValueControl<T[]> {
  readonly value = model<T[]>([]);
  readonly options = input.required<readonly T[]>();
  // Translation key prefix, e.g. 'services.' or 'daysShort.'.
  readonly labelPrefix = input.required<string>();
  readonly icons = input<Partial<Record<T, string>>>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly touch = output<void>();

  toggle(option: T) {
    const current = this.value();
    this.value.set(
      current.includes(option)
        ? current.filter((item) => item !== option)
        : this.options().filter((item) => item === option || current.includes(item)),
    );
  }
}
