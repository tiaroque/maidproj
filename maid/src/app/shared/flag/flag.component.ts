import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flag.component.html',
  host: { class: 'inline-block shrink-0' },
})
export class FlagComponent {
  readonly code = input.required<string>();
}
