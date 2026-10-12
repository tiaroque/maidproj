import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../services/shared/language-service.service';
import { TranslatePipe } from '@ngx-translate/core';
import { MenusGlobalService } from '../../../services/menus-global.service';

@Component({
  selector: 'app-header-landing',
  templateUrl: './header.component.html',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly languageService = inject(LanguageService);
  readonly menuGlobal = inject(MenusGlobalService);
  readonly router = inject(Router);
  lang = this.languageService.defaultLang;

  openMobileMenu() {
    this.menuGlobal.openMenu.set(true);
  }
}
