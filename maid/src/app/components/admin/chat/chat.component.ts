import { HttpResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  TemplateRef,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterContentInit,
  AfterViewInit,
  PLATFORM_ID,
  afterNextRender,
  afterRenderEffect,
  input,
  viewChild,
} from '@angular/core';

import { BehaviorSubject, EMPTY, Subject, Subscription } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { ChatSocketsService } from '../../../services/admin/chat-sockets.service';
import { ChatService } from '../../../services/admin/chat.service';
import { UploadService } from '../../../services/admin/upload.service';

import {
  AsyncPipe,
  DatePipe,
  isPlatformBrowser,
  NgClass,
  NgTemplateOutlet,
  NgOptimizedImage,
} from '@angular/common';
import { form, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { S3UrlPipe, s3Url } from '../../../utils/s3-url';
import {
  IsTyping,
  MessageDTO,
} from '../../../services/admin/interfaces/message-dto';
import {
  ImageObj,
  UserDetailsObject,
} from '../../../services/admin/interfaces/user.interface';
import { MenusService } from '../../../services/admin/menus.service';
import { ChatStore } from '../../../services/admin/signals/store';
import { ThemeService } from '../../../services/theme.service';
import { UtilsService } from '../../../services/utils.service';
import { MessagesListComponent } from '../left-nav/messages-list/messages-list.component';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { IntersectionWatcherDirective } from '../../../libs/directives/intersection-watcher';
import { IntersectionItemDirective } from '../../../libs/directives/intersection-item';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ClickOutsideDirective } from '../../../libs/directives/click-outside.directive';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { addSeconds } from 'date-fns';
import { EmojiMartDirective } from '../../../libs/directives/emoji-mart.directive';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DateTransformPipe } from '../../../utils/pipes/date.pipe';
import { ImageViewerService } from '../../../services/admin/image-viewer.service';
import { ProfileAvatarComponent } from '../../../shared/profile-avatar/profile-avatar.component';
import { LanguageService } from '../../../services/shared/language-service.service';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    NgOptimizedImage,
    IntersectionWatcherDirective,
    IntersectionItemDirective,
    ProfileAvatarComponent,
    MatProgressSpinner,
    NgClass,
    MatIcon,
    MatButtonModule,
    DatePipe,
    MessagesListComponent,
    PortalModule,
    OverlayModule,
    MatMenuModule,
    MatDialogModule,
    NgTemplateOutlet,
    ClickOutsideDirective,
    EmojiMartDirective,
    AsyncPipe,
    TranslatePipe,
    S3UrlPipe,
    DateTransformPipe,
    RouterLink,
  ],
})
export class ChatComponent
  implements AfterViewInit, AfterContentInit, OnDestroy
{
  static readonly MESSAGE_MAX_LENGTH = 80;
  static readonly DEFAULT_EMOJI_PANEL_HEIGHT = 345;
  // Visual viewport changes below this are browser toolbars, not a keyboard.
  static readonly MIN_KEYBOARD_HEIGHT = 150;
  // Enough for the title, the composer and a sliver of the thread between.
  static readonly MIN_CHAT_HEIGHT = 160;

  private uploadService = inject(UploadService);
  protected utilsService = inject(UtilsService);
  private themeService = inject(ThemeService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  readonly templatePortal = viewChild.required(CdkPortal);
  readonly viewportRef = viewChild<ElementRef<HTMLElement>>('chatContainer');
  readonly messageInput = viewChild<ElementRef<HTMLElement>>('messageInput');
  readonly templateConfirmBlock = viewChild.required<TemplateRef<unknown>>(
    'templateConfirmBlock',
  );
  readonly templateConfirmDeletePhoto = viewChild.required<
    TemplateRef<unknown>
  >('templateConfirmDeletePhoto');
  readonly emojiTrigger = viewChild<CdkOverlayOrigin>('trigger');

  readonly storeChat = inject(ChatStore);
  private chatService = inject(ChatService);
  readonly chatSocketsService = inject(ChatSocketsService);
  readonly dialog = inject(MatDialog);
  readonly breakpointObserver = inject(BreakpointObserver);
  readonly activeRoute = inject(ActivatedRoute);
  readonly authService = inject(AuthService);
  readonly menuService = inject(MenusService);
  readonly translateService = inject(TranslateService);
  readonly imageViewerService = inject(ImageViewerService);
  readonly platformId = inject(PLATFORM_ID);
  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;

  closeTxt = this.translateService.instant('buttonClose') as string;
  pleaseTryLaterTxt = this.translateService.instant('pleaseTryLater');

  isOpenEmojisDesktop = signal(false);
  isOpenEmojisMobile = signal(false);
  isHoverEmojiButton = false;

  // The mobile panel matches the soft keyboard, so switching between them
  // leaves the composer where it is.
  emojiPanelHeight = signal(ChatComponent.DEFAULT_EMOJI_PANEL_HEIGHT);
  // Space held inside the column, below the composer. Shared by the emoji
  // panel and whatever part of the keyboard the layout has not absorbed, so
  // swapping them does not resize the thread or the wallpaper.
  bottomReserve = signal(0);
  // How tall the soft keyboard looks, mid-slide included.
  private keyboardHeight = 0;
  // Layout viewport height while the keyboard is closed. Compared with the
  // current height to see how much the browser already shortened the page.
  private layoutFullHeight = 0;
  // Safari and Firefox ignore interactive-widget=resizes-content, so the
  // keyboard covers the page instead of shortening it. The reserve then has
  // to hold the keyboard's height itself.
  private appliedReserve = 0;
  // The height the keyboard had last time, held until the real one arrives so
  // the composer is already in place while the keyboard is still sliding up.
  private anticipatedInset = 0;
  // Viewport gaps count as a keyboard only after a tap on the composer or the
  // emoji control. Opening a conversation does not focus the field, and the
  // browser can still report a tall gap for a moment as its chrome settles.
  private keyboardArmed = false;
  // True once a real keyboard has covered the page, so the reserve can follow
  // it all the way down. A shorter visual-viewport gap is the browser toolbar.
  private keyboardEngaged = false;
  private anticipationTimer = 0;
  // Panel height kept after the picker is dismissed, until the keyboard has
  // grown into that same slot. Dropping it immediately lets the thread flash
  // to full height and back.
  protected emojiHandoffHeight = signal(0);
  // Ancestors that would scroll to reveal the caret. Overflow is frozen
  // while the composer is focused so the thread cannot jump, without
  // scrolling the page back — that fight dismisses the keyboard.
  private scrollPins: { el: HTMLElement; overflow: string }[] = [];
  readonly bottomReserveRef =
    viewChild<ElementRef<HTMLElement>>('keyboardReserve');

  subscriptionList = new Subscription();

  uploadLoading = false;

  private lastOpenedConversationId = '';
  private typingNoticeTarget: {
    userToId: string;
    conversationId: string;
  } | null = null;

  protected destroyGetPastMessages$ = new Subject<boolean>();
  private cancelConversationLoad$ = new Subject<void>();

  // The thread is reversed, so the bottom is zero and scrolling up is negative.
  private scrollTop = signal(0);
  isScrolledUp = computed(() => this.scrollTop() < 0);

  readonly userProfile = input<UserDetailsObject>();

  chatModel = signal({ message: '' });
  chatForm = form(this.chatModel, (p) => {
    maxLength(p.message, ChatComponent.MESSAGE_MAX_LENGTH);
  });
  userIsTyping$ = new BehaviorSubject<boolean>(false);
  // Carries whether the composer holds text, which is what "is typing" means.
  private chatIsTypingSubject = new Subject<boolean>();

  isDark = toSignal(this.themeService.isDarkTheme, { initialValue: false });

  setEmojisContainer = signal(false);

  selectedLang = signal<string>(this.translateService.currentLang);

  mapOfHiddenDateGroups = new Map<string, IntersectionObserverEntry>();
  #signalIntersectionEntry = signal<IntersectionObserverEntry | undefined>(
    undefined,
  );

  profilePicUrlOther = computed(() => {
    const userTo = this.storeChat.userTo();
    const image = userTo && !userTo.avatar ? userTo.images?.[0] : undefined;
    return image ? s3Url(image.keyRezised) : '';
  });

  hasNewMessage = computed(
    () => this.storeChat.messageStatus().type !== 'idle' && this.isScrolledUp(),
  );

  stickyHeaderMessage = computed(() => {
    if (!this.#signalIntersectionEntry()) {
      return '';
    }

    const entitiesMap = this.storeChat.messagesEntityMap();
    // Ids can outlive their message when a conversation is reset, so only
    // consider the ones still present in the store.
    const hiddenIds = [...this.mapOfHiddenDateGroups.keys()].filter(
      (messageId) => !!entitiesMap[messageId],
    );
    if (hiddenIds.length === 0) {
      return '';
    }

    // The newest divider that has scrolled away is the one on show.
    return hiddenIds.reduce((prev, curr) =>
      entitiesMap[prev].date < entitiesMap[curr].date ? curr : prev,
    );
  });

  isMobile = toSignal(
    this.breakpointObserver.observe(['(min-width: 768px)']).pipe(
      tap(() => {
        this.isOpenEmojisDesktop.set(false);
        this.isOpenEmojisMobile.set(false);
        this.emojiHandoffHeight.set(0);
        if (isPlatformBrowser(this.platformId)) {
          this.clearAnticipatedInset();
          this.applyBottomReserve(0);
        }
      }),
      map((observer) => !observer.matches),
    ),
  );

  album = computed(() =>
    this.storeChat
      .groupedMessages()
      .filter((msg) => msg.message && msg.type === 'media')
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((msg) => msg.message as ImageObj),
  );

  deletingPhotoId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.storeChat.groupedMessages()) {
        this.safariScrollFix();
      }
    });

    // Writes that do not come from typing, such as a picked emoji or the reset
    // after sending, still have to reach the editable host.
    effect(() => {
      const message = this.chatForm.message().value();
      const host = this.messageInput()?.nativeElement;
      if (!host || host.textContent === message) {
        return;
      }

      host.textContent = message;
      if (document.activeElement === host) {
        this.placeCaretAtEnd(host);
      }
    });

    // Surface store level failures, which carry a translation key.
    effect(() => {
      const errorKey = this.storeChat.error();
      if (!errorKey || !isPlatformBrowser(this.platformId)) {
        return;
      }

      this.utilsService.alert(
        this.translateService.instant(errorKey) as string,
        this.closeTxt,
        6000,
        'top',
      );
      this.storeChat.clearError();
    });

    // Pin the thread once per opened conversation. The viewport can appear a
    // render after the id is set, so wait for it. The composer is left alone.
    afterRenderEffect({
      earlyRead: () => ({
        viewport: this.viewportRef()?.nativeElement ?? null,
        conversationId: this.storeChat.currentConversationId(),
      }),
      write: (state) => {
        const { viewport, conversationId } = state();

        if (!conversationId) {
          this.lastOpenedConversationId = '';
          return;
        }
        if (!viewport || conversationId === this.lastOpenedConversationId) {
          return;
        }

        viewport.scrollTop = 0;

        // A previous conversation may still be holding a keyboard slot. Drop it
        // before this one paints, or the thread flicks short.
        this.keyboardArmed = false;
        this.keyboardEngaged = false;
        this.clearAnticipatedInset();
        this.emojiHandoffHeight.set(0);
        this.applyBottomReserve(0);

        this.lastOpenedConversationId = conversationId;
      },
    });

    this.loadChatConversation();

    const sub = this.translateService.onLangChange
      .pipe(
        takeUntilDestroyed(),
        map((lang) => {
          this.selectedLang.set(lang.lang);

          this.closeTxt = this.translateService.instant(
            'buttonClose',
          ) as string;
          this.pleaseTryLaterTxt =
            this.translateService.instant('pleaseTryLater');
        }),
      )
      .subscribe();
    this.subscriptionList.add(sub);

    this.manageUserTypingOnInit();
    afterNextRender(() => this.trackKeyboard());
    afterNextRender(() => {
      this.subscriptionList.add(
        this.chatSocketsService.onReConnect().subscribe({
          next: () => {
            if (this.storeChat.currentConversationId()) {
              this.chatSocketsService.joinRoom(
                this.storeChat.currentConversationId(),
              );
            }
          },
        }),
      );
    });
  }

  ngAfterViewInit(): void {
    this.templatePortal().context = 'admin/chat';
    this.menuService.setPortal(this.templatePortal());
  }

  ngAfterContentInit() {
    setTimeout(() => {
      this.setEmojisContainer.set(true);
    }, 300);
  }

  private resetConversationView() {
    this.stopTypingNotice();
    this.chatForm.message().value.set('');
    this.chatIsTypingSubject.next(false);
    this.isOpenEmojisDesktop.set(false);
    this.isOpenEmojisMobile.set(false);
    this.mapOfHiddenDateGroups.clear();
    this.#signalIntersectionEntry.set(undefined);

    this.userIsTyping$.next(false);
    this.scrollTop.set(0);
    this.storeChat.setDefaultNewMessageStatus();
    const viewport = this.viewportRef()?.nativeElement;
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }

  private leaveCurrentRoom() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const roomId =
      this.storeChat.currentConversationId() ||
      this.storeChat.lastCurrentConversationId();
    if (roomId) {
      this.chatSocketsService.leaveRoom(roomId);
    }
  }

  loadChatConversation() {
    this.activeRoute.queryParams
      .pipe(
        map((params) => (params['uid'] as string | undefined) ?? ''),
        distinctUntilChanged(),
        switchMap((uid) => {
          // Stop the previous thread's history request before resolving the
          // next person. The conversation lookup itself can outlive this
          // switch, and must not keep applying the previous page.
          this.cancelConversationLoad$.next();
          this.destroyGetPastMessages$.next(true);
          this.resetConversationView();
          this.leaveCurrentRoom();
          this.storeChat.resetMessages();

          if (uid) {
            return this.storeChat.getChatConversation(
              uid,
              this.authService.isNavigated,
            );
          }

          void this.storeChat.getEmptyChatConversation();
          return EMPTY;
        }),
        // An empty id means the conversation could not be resolved, so there
        // is nothing to join or load.
        filter((conversationId): conversationId is string => !!conversationId),
        switchMap((conversationId: string) => {
          this.storeChat.resetUnread(conversationId);
          const dateNow = addSeconds(new Date(), 2).toISOString();

          // The previous room was already left when the switch started.
          if (isPlatformBrowser(this.platformId)) {
            this.chatSocketsService.joinRoom(conversationId);
          }

          return this.storeChat
            .loadConversationMessages$(conversationId, dateNow)
            .pipe(
              takeUntil(this.cancelConversationLoad$),
              catchError(() => {
                this.utilsService.alert(this.pleaseTryLaterTxt, this.closeTxt);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  focusMessageInput() {
    const host = this.messageInput()?.nativeElement;
    if (!host) {
      return;
    }

    // A normal focus scrolls every ancestor to reveal the caret, which
    // fights the keyboard slide and flashes the thread when it finishes.
    host.focus({ preventScroll: true });
    this.placeCaretAtEnd(host);
  }

  // A date divider that has slipped off the top of the thread is the one the
  // sticky header stands in for.
  onDateGroupVisibility(entry: IntersectionObserverEntry) {
    const target = entry.target as HTMLElement;
    const messageId = target.getAttribute('data-msgid') ?? '';

    if (entry.isIntersecting) {
      if (this.mapOfHiddenDateGroups.delete(messageId)) {
        this.#signalIntersectionEntry.set(entry);
      }
      return;
    }

    const threadTop = target.parentElement?.getBoundingClientRect().top ?? 0;
    if (target.getBoundingClientRect().top < threadTop) {
      this.mapOfHiddenDateGroups.set(messageId, entry);
      this.#signalIntersectionEntry.set(entry);
    }
  }

  onDateGroupRemoved(message: MessageDTO) {
    this.mapOfHiddenDateGroups.delete(message._id);
  }

  showEmojiPanel() {
    if (!this.isMobile()) {
      this.isOpenEmojisDesktop.update((isOpen) => !isOpen);
      return;
    }

    // The panel takes the soft keyboard's place, so only one is ever shown.
    if (this.isOpenEmojisMobile()) {
      this.focusMessageInput();
      return;
    }

    this.lockPageScroll();
    // The panel takes over the slot the keyboard was holding. Resize that
    // slot in place — clearing it first drops the composer for a frame.
    this.clearAnticipatedInset();
    this.emojiHandoffHeight.set(0);
    this.keyboardArmed = true;
    this.isOpenEmojisMobile.set(true);
    this.syncComposerInset();
    this.messageInput()?.nativeElement.blur();
  }

  addEmoji($event: any) {
    const chatMessage = `${this.chatForm.message().value() || ''}${$event.native}`;

    this.chatForm.message().value.set(chatMessage);

    if (!this.isMobile()) {
      this.focusMessageInput();
    }
  }

  clickedOutsideEmojiPanel($event: MouseEvent) {
    // The trigger button's own click handler toggles the panel.
    const trigger = this.emojiTrigger()?.elementRef.nativeElement as
      | HTMLElement
      | undefined;
    if (trigger?.contains($event.target as Node)) {
      return;
    }
    this.isOpenEmojisDesktop.set(false);
  }

  closeMobileEmojis() {
    this.isOpenEmojisMobile.set(false);
    this.emojiHandoffHeight.set(0);
    this.keyboardArmed = false;
    this.keyboardEngaged = false;
    this.syncComposerInset();
  }

  onMessageEnter($event: KeyboardEvent) {
    // IME composition uses Enter to confirm the current word.
    if ($event.isComposing) {
      return;
    }
    $event.preventDefault();
    this.sendMessage();
  }

  // The composer holds plain text on a single line, so the editable host is
  // the source of truth for the model while the user types.
  onMessageInput() {
    const host = this.messageInput()?.nativeElement;
    if (!host) {
      return;
    }

    const text = (host.textContent ?? '')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, ChatComponent.MESSAGE_MAX_LENGTH);

    // Browsers leave a stray <br> behind once the last character is deleted,
    // which would keep the placeholder hidden.
    if (!text && host.innerHTML) {
      host.innerHTML = '';
    }

    this.chatForm.message().value.set(text);
    this.keepCaretVisible(host);
    this.chatIsTypingSubject.next(text.length > 0);
  }

  onMessageFocus() {
    if (this.isMobile()) {
      // Keep the panel's slot until the keyboard has grown into it.
      if (this.isOpenEmojisMobile()) {
        this.emojiHandoffHeight.set(this.emojiPanelHeight());
      }
      this.isOpenEmojisMobile.set(false);
      this.anticipateKeyboard();
    }
    this.notifyTypingFromModel();
  }

  onMessageBlur() {
    this.notifyTypingFromModel();
    // The emoji control blurs the field while the panel is taking the slot.
    if (this.isOpenEmojisMobile() || this.emojiHandoffHeight() > 0) {
      return;
    }
    this.keyboardArmed = false;
  }

  private notifyTypingFromModel() {
    this.chatIsTypingSubject.next(this.chatForm.message().value().length > 0);
  }

  // Paste arrives as rich text or with line breaks, neither of which fits a
  // single line of plain text.
  onMessagePaste($event: ClipboardEvent) {
    $event.preventDefault();

    const pasted = ($event.clipboardData?.getData('text') ?? '').replace(
      /\s*[\r\n]+\s*/g,
      ' ',
    );
    const selection = window.getSelection();
    if (!pasted || !selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const inserted = document.createTextNode(pasted);
    range.insertNode(inserted);
    range.setStartAfter(inserted);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    this.onMessageInput();
  }

  private trackKeyboard() {
    this.emojiPanelHeight.set(this.storedKeyboardHeight());
    this.layoutFullHeight = document.documentElement.clientHeight;
    this.syncWallpaperHeight();
    this.lockPageScroll();

    const visualViewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    const onOrientationChange = () => {
      fullHeight = window.innerHeight;
      this.layoutFullHeight = document.documentElement.clientHeight;
      this.emojiPanelHeight.set(this.storedKeyboardHeight());
      onViewportResize();
    };

    const onViewportResize = () => {
      const innerHeight = window.innerHeight;
      if (innerHeight > fullHeight) {
        fullHeight = innerHeight;
      }

      const keyboardHeight = visualViewport
        ? Math.max(
            0,
            Math.round(
              fullHeight - visualViewport.height - visualViewport.offsetTop,
            ),
          )
        : Math.max(0, Math.round(fullHeight - innerHeight));
      const keyboardOpen = keyboardHeight >= ChatComponent.MIN_KEYBOARD_HEIGHT;

      // Browser chrome (the address bar) moves the baseline. Follow it only
      // while a keyboard is not covering the page and the emoji slot is empty.
      if (
        !keyboardOpen &&
        !this.isOpenEmojisMobile() &&
        this.emojiHandoffHeight() === 0
      ) {
        fullHeight = innerHeight;
        this.layoutFullHeight = document.documentElement.clientHeight;
      }

      this.keyboardHeight = keyboardHeight;
      // Mid-slide heights would resize the picker that is still holding the slot.
      if (
        !this.isOpenEmojisMobile() &&
        this.emojiHandoffHeight() === 0 &&
        keyboardOpen
      ) {
        this.rememberKeyboardHeight(keyboardHeight);
      }

      this.syncComposerInset(keyboardOpen);
      this.syncWallpaperHeight();
    };

    visualViewport?.addEventListener('resize', onViewportResize);
    visualViewport?.addEventListener('scroll', onViewportResize);
    window.addEventListener('resize', onViewportResize);
    screen.orientation?.addEventListener('change', onOrientationChange);
    this.destroyRef.onDestroy(() => {
      this.clearAnticipatedInset();
      this.emojiHandoffHeight.set(0);
      this.applyBottomReserve(0);
      this.releasePageScroll();
      visualViewport?.removeEventListener('resize', onViewportResize);
      visualViewport?.removeEventListener('scroll', onViewportResize);
      window.removeEventListener('resize', onViewportResize);
      screen.orientation?.removeEventListener('change', onOrientationChange);
    });
  }

  // Space below the composer. The emoji panel and the soft keyboard share it.
  // Where the browser already shortened the layout, that part is left out so
  // the thread is not pushed up twice. The rest is a spacer inside the column,
  // which keeps the wallpaper box at a steady height.
  private syncComposerInset(
    keyboardOpen = this.keyboardHeight >= ChatComponent.MIN_KEYBOARD_HEIGHT,
  ) {
    if (!this.isMobile()) {
      this.clearAnticipatedInset();
      this.emojiHandoffHeight.set(0);
      this.keyboardArmed = false;
      this.keyboardEngaged = false;
      this.applyBottomReserve(0);
      return;
    }

    // Nothing asked for the keyboard. A viewport gap on open is the browser
    // chrome settling, and reserving it flashes the thread short.
    if (
      !this.keyboardArmed &&
      !this.keyboardEngaged &&
      this.anticipatedInset === 0 &&
      !this.isOpenEmojisMobile() &&
      this.emojiHandoffHeight() === 0
    ) {
      this.applyBottomReserve(0);
      return;
    }

    // Pinch zoom shrinks the visual viewport too, and nothing is hidden then.
    const view = window.visualViewport;
    const covered =
      view && view.scale <= 1.01
        ? Math.max(
            0,
            Math.round(
              document.documentElement.clientHeight -
                view.height -
                view.offsetTop,
            ),
          )
        : 0;

    if (covered >= ChatComponent.MIN_KEYBOARD_HEIGHT) {
      this.keyboardEngaged = true;
    } else if (covered === 0) {
      this.keyboardEngaged = false;
    }

    // Follow a keyboard that is already on screen, including the last part of
    // its slide. Anything shorter, with no guess held open, is browser chrome.
    const keyboardCover =
      this.keyboardEngaged || this.anticipatedInset > 0 ? covered : 0;

    const layoutShrink = Math.max(
      0,
      Math.round(
        this.layoutFullHeight - document.documentElement.clientHeight,
      ),
    );
    // The guessed keyboard height is in full-page coordinates. Drop it once
    // the real keyboard, or the layout shrink it caused, has caught up.
    // Clearing on the first few pixels would snap the thread short and
    // then stretch it again as the keyboard finishes opening.
    const absorbed = layoutShrink + covered;
    if (
      this.emojiHandoffHeight() === 0 &&
      this.anticipatedInset > 0 &&
      absorbed + 8 >= this.anticipatedInset
    ) {
      this.clearAnticipatedInset();
    }

    const panelTarget = this.isOpenEmojisMobile()
      ? this.emojiPanelHeight()
      : this.emojiHandoffHeight();
    const panelReserve = Math.max(0, panelTarget - layoutShrink);
    // While the panel is open it owns the slot, including the moment the
    // keyboard is still on its way down. The guessed height is reduced by
    // whatever the browser has already taken off the layout, so the thread
    // is not shortened twice.
    const keyboardReserve = this.isOpenEmojisMobile()
      ? 0
      : Math.max(
          0,
          Math.max(keyboardCover, this.anticipatedInset) - layoutShrink,
        );
    const reserve = Math.max(panelReserve, keyboardReserve);

    // keyboardReserve matches panelReserve for the whole slide, so compare
    // against the real keyboard. Releasing the slot earlier lets the thread
    // drop, then climb back as the keyboard finishes opening.
    if (
      this.emojiHandoffHeight() > 0 &&
      keyboardOpen &&
      absorbed + 8 >= this.emojiHandoffHeight()
    ) {
      this.emojiHandoffHeight.set(0);
      if (absorbed + 8 >= this.anticipatedInset) {
        this.clearAnticipatedInset();
      }
    }

    this.applyBottomReserve(reserve);
  }

  // The pattern is centered on the column's full height. Freezing that height
  // while the keyboard shortens the column keeps the tiles from sliding.
  private syncWallpaperHeight() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const column = this.host.nativeElement.firstElementChild as HTMLElement | null;
    if (!column) {
      return;
    }

    const layoutShrunk =
      this.layoutFullHeight > 0 &&
      document.documentElement.clientHeight < this.layoutFullHeight - 2;
    if (layoutShrunk) {
      return;
    }

    const height = Math.round(column.getBoundingClientRect().height);
    if (height <= 0) {
      return;
    }

    column.style.setProperty('--chat-wallpaper-height', `${height}px`);
  }

  // Written straight to the spacer: a binding would land a frame later, and
  // the slot has to move with the keyboard, not a paint behind it.
  private applyBottomReserve(reserve: number) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const host = this.host.nativeElement;
    // Older builds shortened the host itself, which rescaled the wallpaper.
    if (host.style.height) {
      host.style.height = '';
    }

    const columnHeight = host.clientHeight;
    // A keyboard taller than the column, which landscape can be, would leave
    // no room for the thread, so the composer keeps a floor to stand on.
    const limit =
      columnHeight > 0
        ? Math.max(0, Math.round(columnHeight - ChatComponent.MIN_CHAT_HEIGHT))
        : Number.POSITIVE_INFINITY;
    const wanted = Math.min(Math.max(0, Math.round(reserve)), limit);
    if (wanted === this.appliedReserve && this.bottomReserve() === wanted) {
      const el = this.bottomReserveRef()?.nativeElement;
      if (!el || el.style.height === `${wanted}px`) {
        return;
      }
    }

    this.appliedReserve = wanted;
    this.bottomReserve.set(wanted);
    const el = this.bottomReserveRef()?.nativeElement;
    if (el) {
      el.style.height = `${wanted}px`;
    }
  }

  // Reserving the slot only once the keyboard has claimed its space leaves
  // the thread at the wrong height for the whole slide. Start from the height
  // the keyboard had last time, on the click, and let the viewport correct it.
  private anticipateKeyboard() {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!coarse && this.emojiHandoffHeight() === 0) {
      return;
    }

    this.keyboardArmed = true;

    if (coarse) {
      // From the emoji panel, keep the slot that is already on screen. A
      // taller remembered keyboard would shrink the thread on the tap.
      const handoff = this.emojiHandoffHeight();
      this.anticipatedInset =
        handoff > 0 ? handoff : this.storedKeyboardHeight();
    }

    // No keyboard turned up, so release the slot the panel left behind.
    window.clearTimeout(this.anticipationTimer);
    this.anticipationTimer = window.setTimeout(() => {
      this.anticipatedInset = 0;
      this.emojiHandoffHeight.set(0);
      this.syncComposerInset();
    }, 1200);
    this.syncComposerInset();
  }

  private clearAnticipatedInset() {
    window.clearTimeout(this.anticipationTimer);
    this.anticipatedInset = 0;
  }

  // Stop the page from scrolling the thread into view. Done once, before
  // the keyboard moves, and never by pushing the scroll position back.
  private lockPageScroll() {
    if (!this.isMobile() || this.scrollPins.length > 0) {
      return;
    }

    let el = this.host.nativeElement.parentElement;
    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay'
      ) {
        this.scrollPins.push({ el, overflow: el.style.overflow });
        el.style.overflow = 'hidden';
      }
      el = el.parentElement;
    }
  }

  private releasePageScroll() {
    for (const pin of this.scrollPins) {
      pin.el.style.overflow = pin.overflow;
    }
    this.scrollPins = [];
  }

  private keyboardHeightKey() {
    const isLandscape =
      screen.orientation?.type.startsWith('landscape') ??
      screen.width > screen.height;
    return `chatKeyboardHeight:${isLandscape ? 'landscape' : 'portrait'}`;
  }

  private storedKeyboardHeight() {
    const stored = Number(localStorage.getItem(this.keyboardHeightKey()));
    return stored > 0 ? stored : ChatComponent.DEFAULT_EMOJI_PANEL_HEIGHT;
  }

  private rememberKeyboardHeight(height: number) {
    if (height === this.emojiPanelHeight()) {
      return;
    }

    this.emojiPanelHeight.set(height);
    localStorage.setItem(this.keyboardHeightKey(), String(height));
  }

  private placeCaretAtEnd(host: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(host);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    this.keepCaretVisible(host);
  }

  // An editable host does not scroll to its caret the way a native field does,
  // so the single line has to be panned by hand.
  private keepCaretVisible(host: HTMLElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      return;
    }

    const caret = selection.getRangeAt(0).getBoundingClientRect();
    if (!caret.width && !caret.height && !caret.left) {
      return;
    }

    // A margin keeps the character next to the caret from being half cut off.
    const margin = 12;
    const view = host.getBoundingClientRect();
    if (caret.right > view.right - margin) {
      host.scrollLeft += caret.right - view.right + margin;
    } else if (caret.left < view.left + margin) {
      host.scrollLeft -= view.left - caret.left + margin;
    }
  }

  manageUserTypingOnInit() {
    // Only the transitions between an empty and a filled composer are news.
    const sub1 = this.chatIsTypingSubject
      .pipe(distinctUntilChanged())
      .subscribe((hasData) => {
        if (!hasData) {
          this.stopTypingNotice();
          return;
        }

        const userToId = this.storeChat.userTo()?.uid;
        const conversationId = this.storeChat.currentConversationId();
        if (!userToId || !conversationId) {
          return;
        }
        this.typingNoticeTarget = { userToId, conversationId };
        this.chatSocketsService.sendIsTyping(userToId, conversationId, true);
      });
    this.subscriptionList.add(sub1);

    afterNextRender(() => {
      const sub2 = this.chatSocketsService
        .subscribeChannel<IsTyping>(this.userProfile()!.user.uid, 'typing')
        .pipe(
          filter(
            (isTyping) =>
              isTyping.conversationId ===
              this.storeChat.currentConversationId(),
          ),
        )
        .subscribe((isTyping) => {
          this.userIsTyping$.next(isTyping.isTyping);
        });
      this.subscriptionList.add(sub2);
    });
  }

  // "Stopped" has to reach whoever was told "typing", even after a switch.
  private stopTypingNotice() {
    const target = this.typingNoticeTarget;
    if (!target) {
      return;
    }
    this.typingNoticeTarget = null;
    this.chatSocketsService.sendIsTyping(
      target.userToId,
      target.conversationId,
      false,
    );
  }

  sendMessage() {
    const message = this.chatForm.message().value()?.trim();
    if (!message || !this.chatForm().valid()) {
      this.chatForm.message().markAsTouched();
      return;
    }

    const senderUid = this.userProfile()!.user.uid;
    const receiverUid = this.storeChat.userTo()!.uid;

    const messageObj: MessageDTO = {
      _id: UtilsService.ObjectId(),
      conversationId: this.storeChat.currentConversationId(),
      date: new Date().toISOString(),
      message: message,
      sender: senderUid,
      receiver: receiverUid,
      type: 'message',
      loading: null,
      isSocketMessage: true,
    };

    this.chatSocketsService.sendData(
      this.storeChat.currentConversationId(),
      messageObj,
      'message',
    );
    this.chatForm.message().value.set('');
    this.chatIsTypingSubject.next(false);

    this.isOpenEmojisDesktop.set(false);
    this.isOpenEmojisMobile.set(false);

    this.focusMessageInput();

    // this.scrollToBottom();
  }

  async upload(file: File) {
    const imageMaxSizError = this.translateService.instant(
      'upload.imageMaxSizError',
    );
    const imageUploadError = this.translateService.instant(
      'upload.imageUploadError',
    );

    this.uploadLoading = true;

    // The upload can outlive a conversation switch, so it must keep targeting
    // the conversation it started in.
    const conversationId = this.storeChat.currentConversationId();
    const userToId = this.storeChat.userTo()?.uid;
    if (!conversationId || !userToId) {
      this.uploadLoading = false;
      return;
    }

    if (file.size > 1024 * 1024) {
      this.uploadLoading = false;
      this.utilsService.alert(imageMaxSizError, this.closeTxt, 6000, 'top');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const width = img.width;
    const height = img.height;

    const messageId = UtilsService.ObjectId();
    const newDate = new Date().toISOString();

    const messageDTO: MessageDTO = {
      _id: messageId,
      conversationId: '',
      message: null,
      sender: this.userProfile()!.user.uid,
      receiver: userToId,
      date: newDate,
      type: 'media',
      loading: true,
      isSocketMessage: true,
    };

    this.chatSocketsService.sendData(conversationId, messageDTO, 'media');

    const sub1 = this.uploadService
      .uploadChatPhoto(file, conversationId, messageId, width, height)
      .subscribe({
        next: (event) => {
          if (!(event instanceof HttpResponse)) {
            return;
          }

          // The placeholder is replaced by the stored image.
          this.chatSocketsService.sendData(
            conversationId,
            {
              ...messageDTO,
              message: event.body.imageObj as ImageObj,
              loading: false,
            },
            'message',
          );
          this.uploadLoading = false;
        },
        error: () => {
          this.storeChat.removeMessage(messageId);
          this.utilsService.alert(imageUploadError, this.closeTxt, 6000, 'top');
          this.uploadLoading = false;
        },
      });
    this.subscriptionList.add(sub1);
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      void this.upload(file);
      input.value = '';
    }
  }

  confirmDeletePhoto(message: MessageDTO) {
    if (
      message.deleted ||
      message.type !== 'media' ||
      !message.message ||
      this.deletingPhotoId()
    ) {
      return;
    }

    const dialogRef = this.dialog.open(this.templateConfirmDeletePhoto(), {
      hasBackdrop: true,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deletePhoto(message);
      }
    });
  }

  deletePhoto(message: MessageDTO) {
    const image = message.message as ImageObj;
    this.deletingPhotoId.set(message._id);

    const sub = this.chatService.deleteChatPhoto(message._id).subscribe({
      next: (result) => {
        this.storeChat.markMediaDeleted(result);
        this.deletingPhotoId.set(null);
        if (
          this.imageViewerService.showViewer().index >= 0 &&
          !this.album().some((photo) => photo?.key === image.key)
        ) {
          this.imageViewerService.showViewer.set({ index: -1 });
        }
      },
      error: () => {
        this.deletingPhotoId.set(null);
        this.utilsService.alert(this.pleaseTryLaterTxt, this.closeTxt);
      },
    });
    this.subscriptionList.add(sub);
  }

  open(message: MessageDTO): void {
    if (!message.message || message.type !== 'media') {
      return;
    }

    const album = this.album();
    const image = message.message as ImageObj;

    this.imageViewerService.listPhotos.set(album);
    this.imageViewerService.showViewer.set({
      index: album.findIndex((img) => img?.key === image.key),
    });
  }

  loadPastMessages() {
    this.storeChat.loadMoreMessages(this.destroyGetPastMessages$);
  }

  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.src = './assets/images/image-regular-2.svg';
  }

  // Safari leaves the thread a row off after new messages land.
  private safariScrollFix() {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport || UtilsService.getBrowserName() !== 'Safari') {
      return;
    }

    const currentScrollTop = viewport.scrollTop;
    setTimeout(() => {
      viewport.scrollTop = currentScrollTop - 1;
    }, 0);
  }

  toggleAlerts($event: Event, menuTrigger: MatMenuTrigger) {
    $event.stopPropagation();
    const conversation = this.storeChat.selectCurrentConversation();
    if (!conversation) {
      return;
    }
    void this.storeChat.toggleAlerts(conversation);
    setTimeout(() => {
      menuTrigger.closeMenu();
    }, 300);
  }

  toggleFavorite() {
    const conversation = this.storeChat.selectCurrentConversation();
    if (!conversation) {
      return;
    }
    void this.storeChat.toggleFavorite(conversation);
  }

  blockUser() {
    const dialogRef = this.dialog.open(this.templateConfirmBlock(), {
      hasBackdrop: true,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const userToBlock = this.storeChat.userTo()!.uid as string;
        this.storeChat.blockUser(
          userToBlock,
          this.storeChat.currentConversationId(),
        );
      }
    });
  }

  onScroll($event: Event) {
    const scrollTop = ($event.target as HTMLElement).scrollTop;
    this.scrollTop.set(scrollTop);

    // Coming back to the bottom is how the new message notice is dismissed.
    if (scrollTop >= 0 && this.storeChat.messageStatus().type !== 'idle') {
      this.storeChat.setDefaultNewMessageStatus();
    }
  }

  scrollToBottom() {
    this.storeChat.setDefaultNewMessageStatus();
    this.viewportRef()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnDestroy() {
    if (this.templatePortal().isAttached) {
      this.templatePortal().detach();
    }

    this.stopTypingNotice();
    this.leaveCurrentRoom();
    this.storeChat.resetConversationIds();
    this.subscriptionList.unsubscribe();

    this.cancelConversationLoad$.next();
    this.cancelConversationLoad$.complete();
    this.destroyGetPastMessages$.next(true);
    this.destroyGetPastMessages$.complete();
  }
}
