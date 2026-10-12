import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LeftNavComponent } from './left-nav/left-nav.component';
import { NgClass } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { RightContentComponent } from './right-content/right-content.component';
import { MenusService } from '../../services/admin/menus.service';
import { UserDetailsObject } from '../../services/admin/interfaces/user.interface';
import { Subscription } from 'rxjs';
import { ChatStore } from '../../services/admin/signals/store';
import { TranslateService } from '@ngx-translate/core';
import { ListFilterService } from '../../services/admin/list-filter.service';
import { ChatSocketsService } from '../../services/admin/chat-sockets.service';
import { VerificationBannerComponent } from '../../shared/verification-banner/verification-banner.component';

type MenuStates = 'closed' | 'opened';

@Component({
  selector: 'app-main',
  imports: [
    LeftNavComponent,
    NgClass,
    RouterOutlet,
    RightContentComponent,
    VerificationBannerComponent,
  ],
  templateUrl: './main.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-full' },
})
export class MainComponent implements OnInit, OnDestroy {
  private menuService = inject(MenusService);
  private router = inject(Router);

  readonly storeChat = inject(ChatStore);
  readonly translateService = inject(TranslateService);
  readonly listFilterService: ListFilterService = inject(ListFilterService);
  private chatSocketsService = inject(ChatSocketsService);

  hasSideMenu = signal(true);
  menu = signal<MenuStates>('closed');

  user: UserDetailsObject;
  name: string | undefined;
  subscriptions: Subscription[] = [];

  constructor() {
    // hides leff menu or pages(admin/list) before page loads
    if (
      this.router.url.includes('/admin/list') ||
      this.router.url.includes('/admin/activity')
    ) {
      this.hasSideMenu.set(false);
    }
  }

  async ngOnInit() {
    // this.router.events.subscribe((event) => {
    //   if (event instanceof NavigationEnd) {
    //     const navigationEnd = event as NavigationEnd;
    //     const rawUrl = navigationEnd.url;
    //     this.topMenu = this.router.parseUrl(rawUrl).toString();
    //     debugger;
    //   }
    // });

    this.menuService.portal$.subscribe((portal) => {
      if (
        portal.context === 'admin/chat' ||
        portal.context === 'admin/profile'
      ) {
        this.hasSideMenu.set(true);
        // Promise.resolve().then(() => this.hasSideMenu.set(true));
      } else {
        this.hasSideMenu.set(false);
        // Promise.resolve().then(() => this.hasSideMenu.set(false));
      }
    });

    // Toggles the left side menu on click
    this.menuService.openMenu$.subscribe((isOpen) => {
      this.menu.set(isOpen ? 'opened' : 'closed');
    });

    this.user = this.storeChat.me();
    this.name = this.user.user?.name;

    this.chatSocketsService.connect();

    await this.loadCountries();
  }

  public async loadCountries() {
    const lang = this.translateService.currentLang;
    await this.storeChat.loadCountries(lang);

    this.translateService.onLangChange.subscribe((lang) => {
      this.storeChat.loadCountries(lang.lang);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
  }
}
