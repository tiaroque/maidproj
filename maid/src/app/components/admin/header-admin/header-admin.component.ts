import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  MenusService,
  MenuStructure,
} from '../../../services/admin/menus.service';
import { ThemeService } from '../../../services/theme.service';
import { ProfileIconComponent } from '../profile-icon/profile-icon.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { NgClass } from '@angular/common';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ChatStore } from '../../../services/admin/signals/store';
import {
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from '../../../services/auth.service';
import { ChatSocketsService } from '../../../services/admin/chat-sockets.service';
import { LanguageService } from '../../../services/shared/language-service.service';
import { LanguageLinksComponent } from '../../../shared/language-links/language-links.component';
import { LanguageSelectorComponent } from '../../../shared/language-selector/language-selector.component';

@Component({
  selector: 'app-header-admin',
  templateUrl: './header-admin.component.html',
  styleUrl: './header-admin.component.css',
  host: { '(document:keydown.escape)': 'closeMobileMenu()' },
  imports: [
    NgClass,
    MatTabsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatButtonModule,
    ProfileIconComponent,
    MatMenuModule,
    MatIcon,
    RouterLink,
    TranslatePipe,
    LanguageSelectorComponent,
    RouterLink,
    LanguageLinksComponent,
    RouterLinkActive,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderAdminComponent implements OnInit {
  private themeService = inject(ThemeService);

  storeChat = inject(ChatStore);
  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  cookieService = inject(CookieService);
  authService = inject(AuthService);
  private chatSocketsService = inject(ChatSocketsService);
  menusService = inject(MenusService);
  tabSelectedIndex: number = 0;
  isDark = signal(false);
  open = signal(false);
  menu: MenuStructure[];
  subscription: Subscription;
  tabAnimation = '150ms';
  myUserId = this.storeChat.me()?.user?.uid;
  lang = this.languageService.defaultLang;

  router = inject(Router);
  profileIsActive = signal(false);

  // otherActive = signal(false);
  // profileActive = signal(false);
  // listActive = signal(false);
  // chatActive = signal(false);

  constructor() {
    // The inbox is otherwise only fetched by the chat route, and the unread
    // badge needs it on every admin page.
    afterNextRender(() => {
      if (!this.storeChat.inboxLoaded()) {
        void this.storeChat.loadMoreConversations();
      }
    });

    this.menusService.portal$.subscribe((portal) => {
      if (portal.context === 'admin/profile') {
        this.profileIsActive.set(true);
      } else {
        this.profileIsActive.set(false);
      }
    });

    // this.menusService.portal$.subscribe((portal) => {
    //   this.resetTabs();
    //   ngZone.runOutsideAngular(() => {
    //     if (portal.context) {
    //       setTimeout(() => {
    //         this.menusService.toggleTabAnimation('enable');
    //       }, 0);
    //     } else {
    //       setTimeout(() => {
    //         this.menusService.toggleTabAnimation('disable');
    //       }, 0);
    //     }
    //   });

    //   if (
    //     portal.context === 'admin/profile' ||
    //     portal.context === 'admin/upload'
    //   ) {
    //     this.profileActive.set(true);
    //   } else if (portal.context === 'admin/list') {
    //     this.listActive.set(true);
    //   } else if (portal.context === 'admin/chat') {
    //     this.chatActive.set(true);
    //   } else {
    //     this.otherActive.set(true);
    //   }
    // });
  }

  ngOnInit(): void {
    this.handleTheming();
    // this.menusService.tabAnimation$.subscribe((val) => {
    //   this.tabAnimation = val;
    // });
  }

  // resetTabs() {
  //   this.otherActive.set(false);
  //   this.profileActive.set(false);
  //   this.listActive.set(false);
  //   this.chatActive.set(false);
  // }

  toggleDarkTheme(
    checked: boolean,
    $event: any,
    menuTrigger: MatMenuTrigger | null,
  ) {
    $event.stopPropagation();
    this.themeService.setDarkTheme(checked);
    if (menuTrigger) {
      setTimeout(() => {
        menuTrigger.closeMenu();
      }, 300);
    } else {
      setTimeout(() => {
        this.closeMobileMenu();
      }, 300);
    }
  }

  setTheme(dark: boolean) {
    this.themeService.setDarkTheme(dark);
  }

  closeMobileMenu() {
    this.open.set(false);
  }

  clickedLinkEvent(e: Event) {
    this.closeMobileMenu();
  }

  handleTheming() {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      this.isDark.set(isDark);
    });
  }

  logout() {
    this.cookieService.delete('session_admin');
    this.cookieService.delete('session');

    this.authService.sessionLogout().subscribe({
      next: () => {
        this.chatSocketsService.disconnect();
        this.storeChat.resetStore();
        this.router.navigate([this.lang(), 'login']);
      },
    });
  }

  // toggleUnderLine(value: boolean) {
  //   const valuPixeis = value ? '2px' : '0px';
  //   document.documentElement.style.setProperty(
  //     '--mat-tab-active-indicator-height',
  //     valuPixeis
  //   );
  // }

  // ngOnDestroy() {
  //   // this.subscription.unsubscribe();
  // }
}
