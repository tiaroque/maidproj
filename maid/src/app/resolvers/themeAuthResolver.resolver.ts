import { isPlatformServer } from '@angular/common';
import {
  inject,
  PLATFORM_ID,
  Renderer2,
  RendererFactory2,
} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const themeSetWhiteResolver = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const platformID = inject(PLATFORM_ID);
  const rendererFactory = inject(RendererFactory2);
  const renderer = rendererFactory.createRenderer(null, null);

  if (!isPlatformServer(platformID)) {
    renderer.removeClass(document.body, 'dark');
    renderer.addClass(document.body, 'light');
    document.documentElement.classList.remove('cc--darkmode');
    return renderer.removeClass(document.body, 'unicorn-dark-theme');
  }
};
