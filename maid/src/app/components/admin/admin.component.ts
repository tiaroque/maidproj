import {
  Component,
  DOCUMENT,
  inject,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HeaderAdminComponent } from './header-admin/header-admin.component';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderAdminComponent, RouterOutlet],
})
export class AdminComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  readonly themeService = inject(ThemeService);
  readonly renderer = inject(Renderer2);
  readonly document = inject(DOCUMENT);
  readonly router = inject(Router);
  readonly authService = inject(AuthService);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe((event) => {
        // If is route navigated from other page there is a 'NavigationStart',
        // when is browser load theres is NO 'NavigationStart'
        if (event instanceof NavigationStart) {
          this.authService.isNavigated = this.router.navigated;
        }
      });
      // this.loadingTranslations.set(false);
    }
  }

  ngOnInit(): void {
    this.handleTheming();
  }

  handleTheming() {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      if (isDark) {
        this.renderer.addClass(this.document.body, 'unicorn-dark-theme');
        this.renderer.addClass(this.document.body, 'dark');
        this.renderer.removeClass(this.document.body, 'light');
      } else {
        this.renderer.removeClass(this.document.body, 'unicorn-dark-theme');
        this.renderer.removeClass(this.document.body, 'dark');
        this.renderer.addClass(this.document.body, 'light');
      }
    });
  }
}
