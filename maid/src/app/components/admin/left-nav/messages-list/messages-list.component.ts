import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, distinctUntilChanged, map } from 'rxjs';
import { NgClass, NgTemplateOutlet, NgOptimizedImage } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { S3UrlPipe } from '../../../../utils/s3-url';
import {
  Conversation,
  UserDetailsObject,
} from '../../../../services/admin/interfaces/user.interface';
import {
  ChatSocketsService,
  SocketUserData,
} from '../../../../services/admin/chat-sockets.service';
import { ChatStore } from '../../../../services/admin/signals/store';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DateTransformPipe } from '../../../../utils/pipes/date.pipe';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MenusService } from '../../../../services/admin/menus.service';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { ProfileAvatarComponent } from '../../../../shared/profile-avatar/profile-avatar.component';
import { InfiniteScroll2Component } from '../../../../shared/infinite-scroll-natham/infinite-scroll-nathan.component';
import { ConversationFiltersComponent } from './conversation-filters.component';

@Component({
  selector: 'app-messages-list',
  templateUrl: './messages-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full overflow-y-auto' },
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    NgClass,
    NgTemplateOutlet,
    ProfileAvatarComponent,
    InfiniteScroll2Component,
    MatBadgeModule,
    DateTransformPipe,
    TranslatePipe,
    S3UrlPipe,
    ConversationFiltersComponent,
  ],
})
export class MessagesListComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  // The host is the scroll container (see `host` above).
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly storeChat = inject(ChatStore);
  readonly chatSocketsService = inject(ChatSocketsService);
  readonly breakpointObserver = inject(BreakpointObserver);
  readonly menuService = inject(MenusService);
  readonly platformId = inject(PLATFORM_ID);
  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;

  subscriptionList = new Subscription();
  activeConversationsUserIds$ = toObservable(
    this.storeChat.activeConversationsUserIds,
  );

  isMenuOpen = toSignal(this.menuService.openMenu$);

  isMobile = toSignal(
    this.breakpointObserver
      .observe([
        // '(min-width: 640px)',
        '(min-width: 768px)',
        // '(min-width: 1024px)',
      ])
      .pipe(map((observer) => !observer.matches)),
  );

  readonly visibleConversations = computed(() =>
    this.storeChat.favoritesOnly()
      ? this.storeChat.favorites()
      : this.storeChat.sortedConversations(),
  );

  user: UserDetailsObject;
  constructor() {
    afterNextRender(() => {
      this.getConnectionStatusOfInboxUsers();
    });
  }

  ngOnInit(): void {
    this.user = this.activatedRoute.snapshot.data['userProfile'];
  }

  loadMoreUsers() {
    if (this.storeChat.favoritesOnly()) {
      return;
    }
    this.storeChat.loadMoreConversations();
  }

  isFavorite(conversation: Conversation) {
    const myId = this.storeChat.me().user?.uid;
    return !!myId && !!conversation.favoritedBy?.includes(myId);
  }

  toggleFavorite(event: Event, conversation: Conversation) {
    event.preventDefault();
    event.stopPropagation();
    void this.storeChat.toggleFavorite(conversation);
  }

  alertsDisabled(conversation: Conversation) {
    const myId = this.storeChat.me().user?.uid;
    return !!myId && !!conversation.alertsDisabled?.includes(myId);
  }

  toggleAlerts(event: Event, conversation: Conversation) {
    event.preventDefault();
    event.stopPropagation();
    void this.storeChat.toggleAlerts(conversation);
  }

  getConnectionStatusOfInboxUsers() {
    //Get response about users list
    const sub = this.chatSocketsService
      .subscribeChannel<string[]>(this.user.user.uid, 'active_users')
      .subscribe((activerUserIds) => {
        this.storeChat.toggleConnectionConversations(activerUserIds, true);
      });
    this.subscriptionList.add(sub);

    // Send users list to check their connection status
    const sub2 = this.activeConversationsUserIds$
      .pipe(
        distinctUntilChanged(
          (prev, current) =>
            prev.length === current.length &&
            prev.every((userId, index) => userId === current[index]),
        ),
      )
      .subscribe((activeUserIds) => {
        const socketUserData: SocketUserData = {
          userId: this.user.user.uid,
          activeConversations: activeUserIds,
        };
        this.chatSocketsService.informUsersConnectionState(socketUserData);
      });
    this.subscriptionList.add(sub2);
  }

  toggleMenu(value: boolean) {
    this.menuService.toggleMenu(value);
  }

  ngOnDestroy() {
    this.subscriptionList.unsubscribe();
  }
}
