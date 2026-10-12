import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-verified-badge',
  imports: [MatIcon, MatTooltipModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-icon
      class="verified-badge-icon"
      role="img"
      [style.font-size.px]="size()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-label]="'verification.badgeTooltip' | translate"
      [matTooltip]="'verification.badgeTooltip' | translate"
      >verified</mat-icon
    >
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
    }
    .verified-badge-icon {
      color: var(--ad-accent, #155e63);
    }
  `,
})
export class VerifiedBadgeComponent {
  size = input(20);
}
