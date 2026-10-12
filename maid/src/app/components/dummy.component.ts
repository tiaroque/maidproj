import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dummy',
  imports: [RouterOutlet],
  host: { class: 'block h-full w-full' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<router-outlet></router-outlet>`,
})
export class DummyComponent {}
