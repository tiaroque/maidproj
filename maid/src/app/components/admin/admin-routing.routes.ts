import { Routes } from '@angular/router';

import { ChatComponent } from './chat/chat.component';
import { ListComponent } from './list/list.component';
import { ActivityComponent } from './activity/activity.component';
import { UploadComponent } from './profile-base/upload/upload.component';
import { XprofileComponent } from './profile-base/xprofile/xprofile.component';
import { MainComponent } from './main.component';
import { canDeactivateForm } from '../../guards/can-deactivate.guard';
import { ProfileBaseComponent } from './profile-base/profile-base.component';
import { findUserDetailResolver } from '../../resolvers/findUserDetailsResolver.resolver';
// import { xprofileResolver } from '../../resolvers/xprofile.resolver';
import { DreamOffersComponent } from './profile-base/dream-offers/dream-offers.component';
import { PreferencesComponent } from './profile-base/preferences/preferences.component';
import { AccountComponent } from './profile-base/account/account.component';
import { SignupComponent } from './signup/signup.component';
import { canActivateUser2 } from '../../guards/auth.guard';
import { canActivateSignUp2 } from '../../guards/signup.guard';
import { AdminComponent } from './admin.component';
import { ViewUsersProfileComponent } from './view-users-profile/view-users-profile.component';
import { ChatStore } from '../../services/admin/signals/store';
import { inject } from '@angular/core';
import { ListFilterService } from '../../services/admin/list-filter.service';
import { ProfileViewComponent } from '../../shared/profile-view/profile-view.component';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { addMeResolver } from '../../resolvers/user.resolver';

export const routesAdminChildren: Routes = [
  { path: '', redirectTo: 'profile', pathMatch: 'full' },
  {
    path: 'profile-view/:uid',
    component: ViewUsersProfileComponent,
    resolve: { userProfileDetails: findUserDetailResolver },
  },
  {
    path: '',
    // Contains the "the Left-Side-Menu" where is the portal placeholder for the different pages, Xprofle, List and Chat.
    // contains the router-outlet for the main content
    // contains the right side component
    component: MainComponent,
    resolve: {
      sessionFilters: () => {
        //sets from sessions the following properties: appliedFiltersList, changingFiltersList
        const storeChat = inject(ChatStore);
        const listFilterService = inject(ListFilterService);
        storeChat.loadFromStorage();

        // sets the filtering FORM
        return listFilterService.setFormFromStorage(
          storeChat.appliedFiltersList(),
        );
      },
    },
    children: [
      {
        path: '',
        component: ProfileBaseComponent, // Contains a router-outlet and a Portal with the Xprofile Menu
        children: [
          // {
          //   path: 'profile-view/:uid',
          //   component: ProfileViewComponent,
          //   resolve: { userProfileDetails: findUserDetailResolver },
          // },
          {
            path: 'upload',
            component: UploadComponent,
            title: 'Clara - Your Photos',
          },
          {
            path: 'preferences',
            component: PreferencesComponent,
            title: 'Clara - Preferences',
          },
          {
            path: 'account',
            component: AccountComponent,
            title: 'Clara - Admin',
          },
          {
            path: 'profile',
            component: XprofileComponent,
            canDeactivate: [canDeactivateForm],
            title: 'Clara - Profile',
            // resolve: { countries: xprofileResolver },
          },
          {
            path: 'offer-dreams',
            component: DreamOffersComponent,
            title: 'Clara - Announcements & Requests',
            // canDeactivate: [canDeactivateForm],
            // resolve: { countries: xprofileResolver },
          },
        ],
      },

      {
        path: 'activity',
        component: ActivityComponent,
        title: 'Clara - Activity',
      },

      {
        path: 'list',
        component: ListComponent,
        title: 'Clara - Search ',
        // resolve: { countries: xprofileResolver },
        // resolve: { userList: listResolver },
      },

      // Removed because having another route for the same component 'ChatComponent' wild generate another NgInit loading.
      // Its was causing the @defer blocks to load again when going into the chat menu and then clicking on a user on the left side
      // {
      //   path: 'chat/:uid',
      //   component: ChatComponent,
      //   // resolve: { initChat: initConversationResolver },
      // },

      {
        path: 'chat',
        component: ChatComponent,
        title: 'Clara - Chat',
        // resolve: { initChat: initConversationResolver },
      },

      {
        path: 'moderation',
        loadComponent: () =>
          import('./moderation/moderation.component').then(
            (cp) => cp.ModerationComponent,
          ),
        title: 'Clara - Moderation',
      },

      {
        path: 'moderation/multi-accounts',
        loadComponent: () =>
          import('./moderation/multi-accounts/multi-accounts.component').then(
            (cp) => cp.MultiAccountsComponent,
          ),
        title: 'Sugrit - Duplicate accounts',
      },

      // { path: 'chat', redirectTo: 'list' },
    ],
  },
];

export const routes: Routes = [
  {
    path: 'signup',
    canActivate: [canActivateSignUp2],
    component: SignupComponent,
    title: 'Clara - Signup',
    resolve: {
      userProfile: addMeResolver,
    },
  },

  {
    path: '',
    canActivate: [canActivateUser2],
    // providers: [
    //   provideHttpClient(
    //     withFetch(),
    //     withInterceptors([authInterceptor]),
    //     withRequestsMadeViaParent(),
    //   ),
    // ],
    resolve: {
      userProfile: addMeResolver,
    },
    component: AdminComponent,
    children: routesAdminChildren,
  },
];

// Why List and chat are not getting the resolver in the activatedroute, bellow is the explanation:

// it works as intended. These are the rules of inheriting params and data:

// Resolved data is derived from params. So the rules apply to params and data in the same way.
// An empty-path route inherits its parent's params and data. This is because it cannot have its own params (it's an empty-path route), and, as a result, it often uses its parent's params and data as its own.
// Any route inherits its parent's params and data if the parent is a componentless route. This is because there is no component that can inject the parent's activated route.
// Nothing else gets inherited.
