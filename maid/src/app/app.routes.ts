import { Routes } from '@angular/router';
import { langUrlMatcher } from './utils/lang-url-matcher';
import { canActivateLang } from './guards/lang.guard';
import { langResolver } from './resolvers/lang.resolver';
import { DummyComponent } from './components/dummy.component';
import { childRoutes } from './app.child-routes';

export const appRoutes: Routes = [
  {
    matcher: langUrlMatcher,
    resolve: { lang: langResolver },
    component: DummyComponent,
    children: childRoutes,
    // loadComponent: () =>
    //   import('./components/dummy.component').then((cp) => cp.DummyComponent),
    // loadChildren: () => import('./app.child-routes').then((m) => m.childRoutes),
  },
  {
    path: '**',
    canActivate: [canActivateLang],
    component: DummyComponent,
    // loadComponent: () =>
    //   import('./components/dummy.component').then((cp) => cp.DummyComponent),
  },
];
