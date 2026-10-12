# Routes

Angular config-based routing. Language prefix matcher: `/:lang/...` (en, pt, es, fr, de, it).

Entry: `maid/src/app/app.routes.ts` → `app.child-routes.ts`.
Admin lazy: `path: 'admin'` → `maid/src/app/components/admin/admin-routing.routes.ts`.

## Public
| URL | Component | Notes |
|---|---|---|
| `/:lang` | HomeComponent | Marketing home |
| `/:lang/browse` | AnonymousProfileSearchComponent | Public search |
| `/:lang/profile-view/:uid` | AnonymousProfileViewComponent | Public profile |
| `/:lang/login` etc | auth.routes | Auth |
| `/:lang/signup` | SignupComponent | Onboarding |

## Authenticated `/admin` (AdminComponent shell + HeaderAdmin)

Layout: `AdminComponent` (`max-w-7xl` column) → `app-header-admin` + `router-outlet`.
Inner: `MainComponent` three-pane: LeftNav (286px) + content + RightContent (lg+).

| URL | Component | Layout | Renders |
|---|---|---|---|
| `/:lang/admin` | redirect → profile | Admin + Main | |
| `/:lang/admin/profile` | XprofileComponent inside ProfileBase | Header + left settings nav + form + right latest users | Edit profile completeness + Material form sections |
| `/:lang/admin/offer-dreams` | DreamOffersComponent | same | Wishes/offers |
| `/:lang/admin/upload` | UploadComponent | same | Photo grid |
| `/:lang/admin/preferences` | PreferencesComponent | same | Match prefs |
| `/:lang/admin/list` | ListComponent | Header + left filters (no settings nav) + search grid | Discovery |
| `/:lang/admin/chat` | ChatComponent | Header + conversation list left + thread | Messaging |
| `/:lang/admin/profile-view/:uid` | ViewUsersProfileComponent | Header only (outside Main) | Full profile view |

Left nav content is a CDK portal swapped by route:
- profile/* → settings buttons (Edit profile, Wishes, Photos, Preferences)
- list → location/age/measures/additional filter accordions
- chat → conversation list

## Router excerpt (`admin-routing.routes.ts`)
```ts
export const routesAdminChildren: Routes = [
  { path: '', redirectTo: 'profile', pathMatch: 'full' },
  { path: 'profile-view/:uid', component: ViewUsersProfileComponent },
  {
    path: '',
    component: MainComponent,
    children: [
      {
        path: '',
        component: ProfileBaseComponent,
        children: [
          { path: 'upload', component: UploadComponent },
          { path: 'preferences', component: PreferencesComponent },
          { path: 'profile', component: XprofileComponent },
          { path: 'offer-dreams', component: DreamOffersComponent },
        ],
      },
      { path: 'list', component: ListComponent },
      { path: 'chat', component: ChatComponent },
    ],
  },
];
```
