import {
  Component,
  inject,
  ChangeDetectionStrategy,
  RESPONSE_INIT,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { LanguageService } from '../../../services/shared/language-service.service';

@Component({
  selector: 'app-not-found',
  imports: [HeaderComponent, FooterComponent, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.component.html',
  host: { class: 'block h-full' },
})
export class NotFoundComponent {
  readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.defaultLang;

  constructor() {
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
