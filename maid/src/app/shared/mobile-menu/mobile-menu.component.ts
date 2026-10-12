import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageLinksComponent } from '../language-links/language-links.component';
import { LanguageService } from '../../services/shared/language-service.service';
import { MenusGlobalService } from '../../services/menus-global.service';

// Landing-page slide-in menu. Replaces MatSidenav in the app shell so the
// sidenav code is not part of the initial bundle; loaded via @defer.
@Component({
  selector: 'app-mobile-menu',
  templateUrl: './mobile-menu.component.html',
  styleUrl: './mobile-menu.component.css',
  imports: [RouterLink, TranslatePipe, LanguageLinksComponent],
  host: { '(document:keydown.escape)': 'close()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMenuComponent {
  private readonly menuGlobalService = inject(MenusGlobalService);
  readonly lang = inject(LanguageService).defaultLang;
  readonly open = this.menuGlobalService.openMenu;

  close() {
    this.open.set(false);
  }
}
