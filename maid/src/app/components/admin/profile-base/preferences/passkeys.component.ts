import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PasskeySummary } from '../../../../services/auth.service';
import {
  PasskeyCancelled,
  PasskeyService,
} from '../../../../services/passkey.service';
import { UtilsService } from '../../../../services/utils.service';

@Component({
  selector: 'app-passkeys',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinner,
    TranslatePipe,
  ],
  templateUrl: './passkeys.component.html',
})
export class PasskeysComponent {
  private passkeyService = inject(PasskeyService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private dialog = inject(MatDialog);

  readonly confirmRemove = viewChild.required<TemplateRef<unknown>>(
    'confirmRemove',
  );

  passkeys = signal<PasskeySummary[]>([]);
  loading = signal(true);
  adding = signal(false);
  removingId = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      void this.load();
    });
  }

  async addPasskey() {
    if (!window.PublicKeyCredential) {
      this.alert('auth.passkeyUnavailable');
      return;
    }
    this.adding.set(true);
    try {
      await this.passkeyService.addPasskey();
      await this.load();
      this.alert('preferencesScreen.passkeyAdded');
    } catch (error: any) {
      if (error instanceof PasskeyCancelled) {
        return;
      }
      if (error?.error?.error === 'PASSKEY_LIMIT') {
        this.alert('preferencesScreen.passkeyLimit');
        return;
      }
      if (error?.status === 403) {
        this.alert('auth.pleaseVerifyAccount');
        return;
      }
      this.alert('preferencesScreen.passkeyAddError');
    } finally {
      this.adding.set(false);
    }
  }

  askRemove(credentialId: string) {
    const dialogRef = this.dialog.open(this.confirmRemove(), {
      hasBackdrop: true,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        void this.remove(credentialId);
      }
    });
  }

  label(passkey: PasskeySummary) {
    return passkey.backedUp || passkey.deviceType === 'multiDevice'
      ? 'preferencesScreen.passkeySynced'
      : 'preferencesScreen.passkeyThisDevice';
  }

  addedOn(passkey: PasskeySummary) {
    return this.translateService.instant('preferencesScreen.passkeyAddedOn', {
      date: this.formatDate(passkey.createdAt),
    });
  }

  lastUsed(passkey: PasskeySummary) {
    if (!passkey.lastUsedAt) {
      return '';
    }
    return this.translateService.instant('preferencesScreen.passkeyLastUsed', {
      date: this.formatDate(passkey.lastUsedAt),
    });
  }

  private async load() {
    this.loading.set(true);
    try {
      this.passkeys.set(await firstValueFrom(this.passkeyService.list()));
    } catch {
      this.alert('pleaseTryLater');
    } finally {
      this.loading.set(false);
    }
  }

  private async remove(credentialId: string) {
    this.removingId.set(credentialId);
    try {
      await firstValueFrom(this.passkeyService.remove(credentialId));
      this.passkeys.update((items) =>
        items.filter((item) => item.credentialId !== credentialId),
      );
    } catch {
      this.alert('pleaseTryLater');
    } finally {
      this.removingId.set(null);
    }
  }

  private formatDate(value: string) {
    const lang = this.translateService.getCurrentLang() || 'en';
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(
      new Date(value),
    );
  }

  private alert(key: string) {
    this.utilsService.alert(
      this.translateService.instant(key),
      this.translateService.instant('buttonClose'),
    );
  }
}
