import { ActivatedRouteSnapshot } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { inject, PLATFORM_ID, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs';

export const initThemeResolver = (route: ActivatedRouteSnapshot) => {
  const themeService = inject(ThemeService);
  const platformId = inject(PLATFORM_ID);
  const rendererFactory = inject(RendererFactory2);
  const renderer = rendererFactory.createRenderer(null, null);

  if (isPlatformBrowser(platformId)) {
    return themeService.isDarkTheme.pipe(
      tap((isDark) => {
        if (isDark) {
          renderer.addClass(document.body, 'unicorn-dark-theme');
          renderer.addClass(document.body, 'dark');
          renderer.removeClass(document.body, 'light');
        } else {
          renderer.removeClass(document.body, 'unicorn-dark-theme');
          renderer.removeClass(document.body, 'dark');
          renderer.addClass(document.body, 'light');
        }
      }),
    );
  }

  return true;
};
