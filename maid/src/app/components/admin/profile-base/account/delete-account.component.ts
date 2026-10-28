import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { ChatSocketsService } from '../../../../services/admin/chat-sockets.service';
import { PushNotificationsService } from '../../../../services/push-notifications.service';
import { ChatStore } from '../../../../services/admin/signals/store';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { UtilsService } from '../../../../services/utils.service';

@Component({
  selector: 'app-delete-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinner, TranslatePipe],
  templateUrl: './delete-account.component.html',
})
export class DeleteAccountComponent {
  private authService = inject(AuthService);
  private cookieService = inject(CookieService);
  private chatSocketsService = inject(ChatSocketsService);
  private pushNotificationsService = inject(PushNotificationsService);
  private storeChat = inject(ChatStore);
  private languageService = inject(LanguageService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly confirmDelete = viewChild.required<TemplateRef<unknown>>(
    'confirmDelete',
  );

  deleting = signal(false);

  askDelete() {
    const dialogRef = this.dialog.open(this.confirmDelete(), {
      hasBackdrop: true,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        void this.deleteAccount();
      }
    });
  }

  private async deleteAccount() {
    this.deleting.set(true);
    try {
      await firstValueFrom(this.authService.deleteAccount());
    } catch {
      this.deleting.set(false);
      this.utilsService.alert(
        this.translateService.instant('pleaseTryLater'),
        this.translateService.instant('buttonClose'),
      );
      return;
    }

    this.cookieService.delete('session_admin');
    this.cookieService.delete('session');
    // The server already dropped every subscription of the deleted account.
    await this.pushNotificationsService.detachForLogout();
    this.chatSocketsService.disconnect();
    this.storeChat.resetStore();
    await this.router.navigate([this.languageService.defaultLang(), 'login']);
  }
}
