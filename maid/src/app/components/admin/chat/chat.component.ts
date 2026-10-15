// import { CdkPortal, ComponentPortal, DomPortal, Portal, TemplatePortal } from '@angular/cdk/portal';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { BreakpointObserver, LayoutModule } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
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
// import { Socket } from 'ngx-socket-io';

import { BehaviorSubject, EMPTY, merge, of, Subject, Subscription } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  throttle,
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
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { InputMonitorDirective } from '../../../libs/directives/input-monitor.directive';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
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
import { UserService } from '../../../services/user.service';
import { IntersectionWatcherDirective } from '../../../libs/directives/intersection-watcher';
import { IntersectionItemDirective } from '../../../libs/directives/intersection-item';
import { MatCardModule } from '@angular/material/card';
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
    MatRippleModule,
    NgClass,
    MatFormField,
    MatSuffix,
    MatInput,
    FormField,
    InputMonitorDirective,
    MatIcon,
    MatButtonModule,
    DatePipe,
    MessagesListComponent,
    PortalModule,
    OverlayModule,
    MatMenuModule,
    MatDialogModule,
    MatCardModule,
    NgTemplateOutlet,
    LayoutModule,
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
  implements OnInit, AfterViewInit, AfterContentInit, OnDestroy
{
  private uploadService = inject(UploadService);
  protected utilsService = inject(UtilsService);
  private themeService = inject(ThemeService);

  readonly templatePortal = viewChild.required(CdkPortal);
  readonly viewportRef = viewChild<ElementRef<HTMLElement>>('chatContainer');
  readonly messageInput =
    viewChild<ElementRef<HTMLInputElement>>('messageInput');
  readonly templateConfirmBlock = viewChild.required<TemplateRef<unknown>>(
    'templateConfirmBlock',
  );
  readonly templateConfirmDeletePhoto = viewChild.required<TemplateRef<unknown>>(
    'templateConfirmDeletePhoto',
  );
  readonly intersectionWatcher = viewChild(IntersectionWatcherDirective);
  readonly audio = viewChild<ElementRef>('audio');
  readonly btn = viewChild<ElementRef>('buttonHidden');
  readonly emojiTrigger = viewChild<CdkOverlayOrigin>('trigger');

  // public backgroundImageFn: Emoji['backgroundImageFn'] = (
  //   set: string,
  //   sheetSize: number,
  // ) => 'assets/images/64.png';

  readonly storeChat = inject(ChatStore);
  private chatService = inject(ChatService);
  readonly chatSocketsService = inject(ChatSocketsService);
  readonly userService = inject(UserService);
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

  currentScrollTop: number;

  subscriptionList = new Subscription();

  uploadLoading = false;

  private lastFocusedConversationId = '';
  private typingNoticeTarget: {
    userToId: string;
    conversationId: string;
  } | null = null;

  protected subscriptionDestroy$ = new Subject<void>();
  protected destroyGetPastMessages$ = new Subject<boolean>();
  private cancelConversationLoad$ = new Subject<void>();

  protected scrollEvent$ = new BehaviorSubject<number>(0);
  // Signal mirror of the scroll offset, so computeds can react to scrolling.
  private scrollTop = signal(0);

  // Profile pics bucket
  chosenFiles: FileList | undefined;
  existingFile: File | undefined;
  progress = 0;

  readonly userProfile = input<UserDetailsObject>();

  chatModel = signal({ message: '' });
  chatForm = form(this.chatModel, (p) => {
    maxLength(p.message, 80);
  });
  userIsTyping$ = new BehaviorSubject<boolean>(false);
  private chatIsTypingSubject = new Subject<any>();

  isDark = signal(false);
  isScrolledUp = signal(false);

  showStaticTimeGrouping = signal('');
  setEmojisContainer = signal(false);
  // observer: IntersectionObserver;

  selectedLang = signal<string>(this.translateService.currentLang);

  mapOfHiddenDateGroups = new Map<string, IntersectionObserverEntry>();
  showTimeHEader = signal(false);
  // stickyHeaderMessage = signal('');
  showTimeHEaderValue = signal('');
  #signalIntersectionEntry = signal<IntersectionObserverEntry | undefined>(
    undefined,
  );

  profilePicUrlOther = computed(() => {
    if (this.storeChat.userTo()) {
      const userTo = this.storeChat.userTo();
      return userTo && !userTo.avatar && userTo.images && userTo.images[0]
        ? s3Url(userTo.images[0].keyRezised)
        : '';
    }
    return '';
  });

  hasNewMessage = computed(() => {
    const messageStatus = this.storeChat.messageStatus();
    return messageStatus.type !== 'idle' && this.scrollTop() < 0;
  });

  stickyHeaderMessage = computed(() => {
    const lastValueSet = this.#signalIntersectionEntry();

    if (lastValueSet) {
      const entitiesMap = this.storeChat.messagesEntityMap();
      // Ids can outlive their message when a conversation is reset, so only
      // consider the ones still present in the store.
      const hiddenItemsIds = [...this.mapOfHiddenDateGroups.keys()].filter(
        (messageId) => !!entitiesMap[messageId],
      );
      if (hiddenItemsIds.length === 0) {
        return '';
      }

      return hiddenItemsIds.reduce((prev, curr) =>
        entitiesMap[prev].date < entitiesMap[curr].date ? curr : prev,
      );
    }

    return '';
  });

  isMobile = toSignal(
    this.breakpointObserver
      .observe([
        // '(min-width: 640px)',
        '(min-width: 768px)',
        // '(min-width: 1024px)',
      ])
      .pipe(
        tap(() => {
          this.isOpenEmojisDesktop.set(false);
          this.isOpenEmojisMobile.set(false);
        }),
        map((observer) => !observer.matches),
      ),
  );

  album = computed(() => {
    return this.storeChat
      .groupedMessages()
      .filter((msg) => msg.message && msg.type === 'media')
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((msg) => msg.message as ImageObj);
  });

  showViewer = signal<{ index: number }>({ index: -1 });
  deletingPhotoId = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.checkMessagesLoading();
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

    // Focus the message input and pin the thread once per opened conversation.
    // The viewport can appear a render after the id is set, so wait for it.
    afterRenderEffect({
      earlyRead: () => {
        const input = this.messageInput()?.nativeElement ?? null;
        return {
          input,
          viewport: this.viewportRef()?.nativeElement ?? null,
          conversationId: this.storeChat.currentConversationId(),
          editingElsewhere: !!input && this.isEditingAnotherField(input),
        };
      },
      write: (state) => {
        const { input, viewport, conversationId, editingElsewhere } = state();

        if (!conversationId) {
          this.lastFocusedConversationId = '';
          return;
        }
        if (!viewport || conversationId === this.lastFocusedConversationId) {
          return;
        }

        viewport.scrollTop = 0;
        if (!input) {
          return;
        }

        this.lastFocusedConversationId = conversationId;
        if (!editingElsewhere) {
          input.focus();
        }
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

    ///////////////////////////////////////////////
    //////// Sockets Subscription Methods /////////
    this.manageUserTypingOnInit();
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
    ///////////////////////////////////////////////
  }

  ngOnInit(): void {
    this.subscriptionList.add(
      this.themeService.isDarkTheme.subscribe((isDark) => {
        this.isDark.set(isDark);
      }),
    );

    if (isPlatformBrowser(this.platformId)) {
      this.onScrollEnd();
    }

    // navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  setCurrentConversationDetails() {
    this.userIsTyping$.next(false);
    this.isScrolledUp.set(false);
    this.scrollTop.set(0);
    this.storeChat.setDefaultNewMessageStatus();
    const viewport = this.viewportRef()?.nativeElement;
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }

  private resetConversationView() {
    this.stopTypingNotice();
    this.chatForm.message().value.set('');
    this.chatIsTypingSubject.next({ hasData: false, isFocused: false });
    this.isOpenEmojisDesktop.set(false);
    this.isOpenEmojisMobile.set(false);
    this.mapOfHiddenDateGroups.clear();
    this.#signalIntersectionEntry.set(undefined);
    this.setCurrentConversationDetails();
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
    this.messageInput()?.nativeElement.focus();
  }

  private isEditingAnotherField(input: HTMLInputElement) {
    const active = document.activeElement as HTMLElement | null;
    return (
      !!active &&
      active !== input &&
      (active.isContentEditable ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement && active.type !== 'file'))
    );
  }

  elementEntry2(entry: IntersectionObserverEntry) {
    const elementTarget = entry.target as HTMLDivElement;
    const parent = elementTarget.parentElement;
    const messageId = elementTarget.getAttribute('data-msgid') as string;

    if (entry.isIntersecting === true) {
      if (this.mapOfHiddenDateGroups.delete(messageId)) {
        this.#signalIntersectionEntry.set(entry);
      }
    } else {
      const distanceToIntercestionContainer =
        elementTarget.getBoundingClientRect().top -
        parent?.getBoundingClientRect()!.top!;
      if (distanceToIntercestionContainer < 0) {
        this.mapOfHiddenDateGroups.set(messageId, entry);
        this.#signalIntersectionEntry.set(entry);
      }
    }
  }

  elementEntryRemoved(element: ElementRef<any>, message: MessageDTO) {
    this.mapOfHiddenDateGroups.delete(message._id);
  }

  checkMessagesLoading() {
    if (this.storeChat.groupedMessages()) {
      this.safariScrollFix();
    }
  }

  trackMessages(index: number, message: any) {
    return message._id;
  }

  showEmojiPanel($event: MouseEvent) {
    if (this.isMobile()) {
      // mat-form-field focuses its input on any click inside it, which would
      // bring the keyboard back over the panel.
      $event.stopPropagation();
      // The panel takes the soft keyboard's place, so only one is ever shown.
      if (this.isOpenEmojisMobile()) {
        this.isOpenEmojisMobile.set(false);
        this.focusMessageInput();
      } else {
        this.messageInput()?.nativeElement.blur();
        this.isOpenEmojisMobile.set(true);
      }
    } else {
      this.isOpenEmojisDesktop.update((isOpen) => !isOpen);
    }
  }

  addEmoji($event: any) {
    const chatMessage = `${this.chatForm.message().value() || ''}${$event.native}`;

    this.chatForm.message().value.set(chatMessage);

    if (!this.isMobile()) {
      this.focusMessageInput();
    }
  }

  clickedOusideEmojiPanel($event: MouseEvent) {
    // The trigger button's own click handler toggles the panel.
    const trigger = this.emojiTrigger()?.elementRef.nativeElement as
      | HTMLElement
      | undefined;
    if (trigger?.contains($event.target as Node)) {
      return;
    }
    this.isOpenEmojisDesktop.set(false);
  }

  closeMobielEmojis() {
    this.isOpenEmojisMobile.set(false);
  }

  onMessageInputFocus() {
    if (this.isMobile()) {
      this.isOpenEmojisMobile.set(false);
    }
  }

  // From directive applied in the input
  inputStateChanged(inputState: { hasData: boolean; isFocused: boolean }) {
    this.chatIsTypingSubject.next(inputState);
  }

  manageUserTypingOnInit() {
    const debounced = this.chatIsTypingSubject.pipe(debounceTime(0));

    const effect = merge(
      // Emits a value from the source Observable, then ignores subsequent source values for a duration
      // determined by another Observable, then repeats this process.
      this.chatIsTypingSubject.pipe(throttle(() => debounced)),
      debounced,
    ).pipe(distinctUntilChanged((a: any, b: any) => a.hasData === b.hasData));

    const sub1 = effect.subscribe(
      (inpuState: { hasData: boolean; isFocused: boolean }) => {
        if (!inpuState.hasData) {
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
      },
    );
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
    this.chatIsTypingSubject.next({ hasData: false, isFocused: false });

    this.isOpenEmojisDesktop.set(false);
    this.isOpenEmojisMobile.set(false);

    this.focusMessageInput();

    // this.scrollToBottom();
  }

  async upload(file: File) {
    const imageMaxSizError = this.translateService.instant(
      'upload.imageMaxSizError',
    );
    const imageTooBig = this.translateService.instant('upload.imageTooBig');
    const imageUploadError = this.translateService.instant(
      'upload.imageUploadError',
    );

    this.progress = 0;
    this.uploadLoading = true;

    // The upload can outlive a conversation switch, so it must keep targeting
    // the conversation it started in.
    const conversationId = this.storeChat.currentConversationId();
    const userToId = this.storeChat.userTo()?.uid;
    if (!conversationId || !userToId) {
      this.uploadLoading = false;
      return;
    }

    const fileSizeMb = +(file.size / (1024 * 1024)).toFixed(2);
    if (fileSizeMb > 1) {
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

    this.chatSocketsService.sendData(conversationId, messageDTO, 'media'); // 'media'

    const sub1 = this.uploadService
      .uploadChatPhoto(file, conversationId, messageId, width, height)
      // .pipe(delay(10000))
      .subscribe(
        (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.progress = Math.round(
              (100 * event.loaded) / (event.total as number),
            );
          } else if (event instanceof HttpResponse) {
            const imageObj: ImageObj = event.body.imageObj;

            // Here 'loading' is set to false and message is set with the image
            const messageDTO: MessageDTO = {
              _id: messageId,
              conversationId: '',
              message: imageObj,
              sender: this.userProfile()!.user.uid,
              receiver: userToId,
              date: newDate,
              type: 'media',
              loading: false,
              isSocketMessage: true,
            };

            this.chatSocketsService.sendData(
              conversationId,
              messageDTO,
              'message',
            ); // 'media'

            this.existingFile = undefined;
            this.uploadLoading = false;
          }
        },
        (error) => {
          console.log(error);

          this.progress = 0;

          this.storeChat.removeMessage(messageId);

          // this.store.dispatch(chatActions.removeMessage({ messageId: id }));

          this.utilsService.alert(imageUploadError, this.closeTxt, 6000, 'top');

          // this.msg = 'Error occured while uploading file';
          this.existingFile = undefined;
          this.uploadLoading = false;
        },
      );
    this.subscriptionList.add(sub1);

    this.chosenFiles = undefined;
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.chosenFiles = input.files as FileList;
    if (this.chosenFiles && this.chosenFiles?.length > 0) {
      this.existingFile = this.chosenFiles?.item(0) as File;
      this.upload(this.existingFile);
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

  open(index: number, message: MessageDTO): void {
    if (message.message && message.type === 'media') {
      const image = message.message as ImageObj;

      const album = this.album();

      const index = album.findIndex((img) => img && img.key === image.key);
      this.showViewer.set({ index });

      this.imageViewerService.listPhotos.set(this.album());
      this.imageViewerService.showViewer.set(this.showViewer());
    }
  }

  loadPastMessages() {
    this.storeChat.loadMoreMessages(this.destroyGetPastMessages$);
  }

  unsubscribeEvents() {
    this.subscriptionList.unsubscribe();
  }

  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.src = './assets/images/image-regular-2.svg';
  }

  private safariScrollFix() {
    if (this.viewportRef()) {
      const browser = UtilsService.getBrowserName();
      if (browser === 'Safari') {
        const currentScrollTop = this.getContainerScrollTop();

        setTimeout(() => {
          this.viewportRef()!.nativeElement.scrollTop = currentScrollTop - 1;
        }, 0);
      }
    }
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

  onScrollEnd() {
    this.scrollEvent$
      .pipe(
        takeUntil(this.subscriptionDestroy$),
        debounceTime(0),
        tap((scrollValue) => {
          if (scrollValue >= 0) {
            this.storeChat.setDefaultNewMessageStatus();
            this.isScrolledUp.set(false);
          } else {
            this.isScrolledUp.set(true);
          }
        }),
      )
      .subscribe();
  }

  onScroll($event: any) {
    const scrollTop = $event.target.scrollTop as number;
    this.scrollTop.set(scrollTop);
    this.scrollEvent$.next(scrollTop);
  }

  scrollToBottom() {
    this.storeChat.setDefaultNewMessageStatus();
    this.viewportRef()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // I get the current scroll offset of the container.
  private getContainerScrollTop(): number {
    return this.viewportRef()!.nativeElement.scrollTop;
  }

  ngOnDestroy() {
    if (this.templatePortal().isAttached) {
      this.templatePortal().detach();
    }

    this.stopTypingNotice();
    this.leaveCurrentRoom();
    this.storeChat.resetConversationIds();

    this.unsubscribeEvents();

    this.cancelConversationLoad$.next();
    this.cancelConversationLoad$.complete();
    this.destroyGetPastMessages$.next(true);
    this.destroyGetPastMessages$.complete();

    this.subscriptionDestroy$.next();
    this.subscriptionDestroy$.complete();
  }
}
