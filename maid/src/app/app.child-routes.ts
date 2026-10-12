import { Routes } from '@angular/router';
import { findUserDetailResolverHome } from './resolvers/findUserDetailsResolver.resolver';
import { addLocationsResolver } from './resolvers/locations.resover';
import { themeSetWhiteResolver } from './resolvers/themeAuthResolver.resolver';

export const childRoutes: Routes = [
  // { path: '', redirectTo: 'login', pathMatch: 'prefix' },

  {
    path: '',
    loadComponent: () =>
      import('./components/home/home/home.component').then(
        (cp) => cp.HomeComponent,
      ),
    resolve: {
      theme: themeSetWhiteResolver,
    },
  },

  {
    path: 'profile-view/:uid',
    loadComponent: () =>
      import(
        './components/home/anonymous-profile-view/anonymous-profile-view.component'
      ).then((cp) => cp.AnonymousProfileViewComponent),
    resolve: { userProfileDetails: findUserDetailResolverHome },
  },
  {
    path: 'browse',
    loadComponent: () =>
      import(
        './components/home/anonymous-profile-search/anonymous-profile-search.component'
      ).then((cp) => cp.AnonymousProfileSearchComponent),
    resolve: { addLocationsResolver: addLocationsResolver },
  },

  {
    path: '',
    // component: AuthComponent,
    loadComponent: () =>
      import('./auth/auth.component').then((cp) => cp.AuthComponent),
    resolve: { theme: themeSetWhiteResolver },
    loadChildren: () => import('./auth/auth.routes').then((m) => m.routes),
  },

  {
    path: 'signup',
    loadComponent: () =>
      import('./components/admin/signup/signup.component').then(
        (m) => m.SignupComponent,
      ),
    resolve: { theme: themeSetWhiteResolver },
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./components/admin/admin-routing.routes').then((m) => m.routes),

    // resolve: {
    //   assets: async () => {
    //     const lang = inject(TranslateService).currentLang;
    //     await inject(ChatStore).loadLocations(lang);
    //     await inject(ChatStore).loadCountries(lang);
    //     return true;
    //   },
    // },
  },
  {
    path: 'terms-conditions',
    loadComponent: () =>
      import(
        './components/admin/signup/terms-conditions/terms-conditions.component'
      ).then((cp) => cp.TermsConditionsComponent),
    resolve: { theme: themeSetWhiteResolver },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./components/admin/signup/privacy/privacy.component').then(
        (cp) => cp.PrivacyComponent,
      ),
    resolve: { theme: themeSetWhiteResolver },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/home/not-found/not-found.component').then(
        (cp) => cp.NotFoundComponent,
      ),
    data: { notFound: true },
    resolve: { theme: themeSetWhiteResolver },
  },
];
