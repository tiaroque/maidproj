import { NgClass, NgOptimizedImage } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatSlideToggle,
  MatSlideToggleChange,
} from '@angular/material/slide-toggle';
import { UserService } from '../../../../services/user.service';
import { ChatStore } from '../../../../services/admin/signals/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemeService } from '../../../../services/theme.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UtilsService } from '../../../../services/utils.service';
import { Subscription, switchMap } from 'rxjs';
import { BlockedUsers } from '../../../../services/admin/interfaces/user.interface';
import { S3UrlPipe } from '../../../../utils/s3-url';
import {
  PushKind,
  PushNotificationsService,
  PushPrefs,
} from '../../../../services/push-notifications.service';
import {
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
@Component({
  selector: 'app-preferences',
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    MatButtonModule,
    MatIcon,
    MatSlideToggle,
    MatDialogModule,
    TranslatePipe,
    S3UrlPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preferences.component.html',
})
export class PreferencesComponent implements OnInit, OnDestroy {
  readonly templateConfirmUnblock = viewChild.required<TemplateRef<any>>(
    'templateConfirmUnblock',
  );
  readonly userService = inject(UserService);
  readonly themeService = inject(ThemeService);
  readonly dialog = inject(MatDialog);
  readonly utilService = inject(UtilsService);
  readonly translateService = inject(TranslateService);
  readonly storeChat = inject(ChatStore);
  isDark = signal(false);
  blockedUsers = signal<BlockedUsers[]>([]);

  chatAlertsEnabled = computed(
    () => !this.storeChat.me().user?.chatAlertsDisabled,
  );
  savingChatAlerts = signal(false);

  readonly pushService = inject(PushNotificationsService);
  readonly pushKinds: PushKind[] = ['chat', 'likes', 'visits'];
  readonly pushLabels: Record<PushKind, string> = {
    chat: 'preferencesScreen.pushChat',
    likes: 'preferencesScreen.pushLikes',
    visits: 'preferencesScreen.pushVisits',
  };
  pushPrefs = signal<PushPrefs>({ chat: true, likes: true, visits: true });
  savingPush = signal(false);

  sub: Subscription = new Subscription();

  closeTxt = this.translateService.instant('buttonClose') as string;
  pleaseTryLaterTxt = this.translateService.instant('pleaseTryLater');

  constructor() {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      this.isDark.set(isDark);
    });
  }

  ngOnInit(): void {
    this.userService.getBlockedUsers().subscribe({
      next: (v) => {
        this.blockedUsers.set(v);
      },
      error: (e) =>
        this.utilService.alert(this.pleaseTryLaterTxt, this.closeTxt),
      complete: () => console.info('COMPLETE'),
    });

    void this.pushService.refreshState();
    this.pushService.getPrefs().subscribe({
      next: (prefs) => this.pushPrefs.set(prefs),
    });

    const sub = this.translateService.onLangChange.subscribe((lang) => {
      this.closeTxt = this.translateService.instant('buttonClose') as string;
      this.pleaseTryLaterTxt = this.translateService.instant('pleaseTryLater');
    });
    this.sub.add(sub);
  }

  async toggleChatAlerts(enabled: boolean) {
    this.savingChatAlerts.set(true);
    const saved = await this.storeChat.setChatAlertsDisabled(!enabled);
    this.savingChatAlerts.set(false);

    if (!saved) {
      this.utilService.alert(this.pleaseTryLaterTxt, this.closeTxt);
    }
  }

  async togglePush({ source, checked }: MatSlideToggleChange) {
    this.savingPush.set(true);
    try {
      if (checked) {
        await this.pushService.enable();
      } else {
        await this.pushService.disable();
      }
    } catch {
      this.utilService.alert(this.pleaseTryLaterTxt, this.closeTxt);
    } finally {
      this.savingPush.set(false);
      // The permission prompt can be dismissed or denied, so the toggle must
      // reflect the real state rather than the click.
      source.checked = this.pushService.state() === 'enabled';
    }
  }

  togglePushKind(kind: PushKind, enabled: boolean) {
    const previous = this.pushPrefs();
    this.pushPrefs.set({ ...previous, [kind]: enabled });
    this.pushService.updatePrefs({ [kind]: enabled }).subscribe({
      next: (prefs) => this.pushPrefs.set(prefs),
      error: () => {
        this.pushPrefs.set(previous);
        this.utilService.alert(this.pleaseTryLaterTxt, this.closeTxt);
      },
    });
  }

  removeBlockedUser(blockedUser: string) {
    const buttonElement = document.activeElement as HTMLElement; // Get the currently focused element
    buttonElement.blur(); // Remove focus from the button
    const dialogRef = this.dialog.open(this.templateConfirmUnblock(), {
      hasBackdrop: true,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.userService
          .unblockUser(blockedUser)
          .pipe(switchMap(() => this.userService.getBlockedUsers()))
          .subscribe({
            next: (v) => {
              this.blockedUsers.set(v);
              console.log('Valor FINAL:', v);
            },
            error: (e) =>
              this.utilService.alert(this.pleaseTryLaterTxt, this.closeTxt),
            complete: () => console.info('COMPLETE'),
          });
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
