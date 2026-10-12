import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../services/shared/language-service.service';
import { LanguageLinksComponent } from '../../../shared/language-links/language-links.component';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe, LanguageLinksComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  host: { class: 'block' },
})
export class FooterComponent {
  private readonly injector = inject(Injector);
  readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.defaultLang;

  async showDialog() {
    // Dialog service and form are loaded on first click only.
    const [{ MatDialog }, { ContactDialogComponent }] = await Promise.all([
      import('@angular/material/dialog'),
      import('../contact-dialog/contact-dialog.component'),
    ]);
    this.injector.get(MatDialog).open(ContactDialogComponent, {
      width: '25rem',
      maxWidth: 'calc(100vw - 20px)',
    });
  }

  openCookiePrefs() {
    import('vanilla-cookieconsent').then((cc) => cc.showPreferences());
  }
}
