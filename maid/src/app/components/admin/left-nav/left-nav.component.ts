import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { map, Observable, Subscription } from 'rxjs';
import { MenusService } from '../../../services/admin/menus.service';
import { MatMenuModule } from '@angular/material/menu';
import { isPlatformServer, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  CdkPortalOutlet,
  Portal,
  PortalModule,
  TemplatePortal,
} from '@angular/cdk/portal';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatStore } from '../../../services/admin/signals/store';
import { ConversationFiltersComponent } from './messages-list/conversation-filters.component';

@Component({
  selector: 'app-left-nav',
  templateUrl: './left-nav.component.html',
  imports: [
    TranslatePipe,
    NgClass,
    MatButtonModule,
    MatMenuModule,
    PortalModule,
    CdkPortalOutlet,
    ConversationFiltersComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftNavComponent implements OnInit {
  private menuService = inject(MenusService);
  private eRef = inject(ElementRef);
  readonly storeChat = inject(ChatStore);

  portal$: Observable<TemplatePortal> = this.menuService.portal$;
  selectedPortal = signal<Portal<any> | undefined>(undefined);
  router = inject(Router);
  readonly breakpointObserver = inject(BreakpointObserver);
  subscription: Subscription;
  topMenu: string = '/admin';
  platformId = inject(PLATFORM_ID);

  menuOpen = signal<boolean | undefined>(undefined);
  // @Input() menuOpen: boolean | undefined;
  // @Output() menuOpenChange = new EventEmitter<boolean>();

  noLeftNavScreen = signal(false);
  isDesktop = toSignal(
    this.breakpointObserver
      .observe(['(min-width: 768px)'])
      .pipe(map((val: BreakpointState) => val.matches)),
  );

  isChatScreen = signal(false);
  isListScreen = signal(false);

  readonly showConversationFilters = computed(
    () =>
      this.isChatScreen() &&
      !!this.menuOpen() &&
      this.storeChat.inboxLoaded() &&
      this.storeChat.sortedConversations().length > 0,
  );

  levNavHidden = computed(() => {
    if (isPlatformServer(this.platformId)) {
      return false;
    }
    return this.noLeftNavScreen() && !this.isDesktop();
  });

  ngOnInit(): void {
    // this.portal$ = this.menuService.portal$;
    this.portal$.subscribe((portal) => {
      if (
        portal.context === 'admin/list' ||
        portal.context === 'admin/activity'
      ) {
        this.noLeftNavScreen.set(true);
        this.isListScreen.set(true);
      } else {
        this.noLeftNavScreen.set(false);
        this.isListScreen.set(false);
      }

      if (portal.context === 'admin/chat') {
        this.isChatScreen.set(true);
      } else {
        this.isChatScreen.set(false);
      }

      this.selectedPortal.set(portal);
    });

    this.menuService.openMenu$.subscribe((isOpen) => {
      this.menuOpen.set(isOpen);
    });
  }

  // Closes menu when clicked elsewhere
  // in the page exept the left menu
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.eRef.nativeElement.contains(event.target)) {
      // console.log('not contained');
    } else {
      this.menuService.toggleMenu(false);
    }
  }

  toggleMenu(value: boolean) {
    this.menuService.toggleMenu(value);
  }
}
