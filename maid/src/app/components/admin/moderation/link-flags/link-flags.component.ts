import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  FlaggedUser,
  LinkFlagService,
} from '../../../../services/link-flag.service';
import { MultiAccountService } from '../../../../services/multi-account.service';
import { UtilsService } from '../../../../services/utils.service';

@Component({
  selector: 'app-link-flags',
  templateUrl: './link-flags.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatProgressSpinner, RouterLink, TranslatePipe],
})
export class LinkFlagsComponent implements OnInit {
  private linkFlagService = inject(LinkFlagService);
  private multiAccountService = inject(MultiAccountService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  users = signal<FlaggedUser[]>([]);
  busyUid = signal<string | null>(null);
  confirmingUid = signal<string | null>(null);
  reasons = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.confirmingUid.set(null);
    this.linkFlagService.flaggedUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 403) {
          this.router.navigate(['../../profile'], { relativeTo: this.route });
          return;
        }
        this.notify('linkFlags.errors.generic');
      },
    });
  }

  setReason(uid: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.reasons.update((reasons) => ({ ...reasons, [uid]: value }));
  }

  remove(user: FlaggedUser) {
    const reason = this.reasons()[user.uid]?.trim();
    if (!reason) {
      this.notify('linkFlags.reasonRequired');
      return;
    }
    if (this.confirmingUid() !== user.uid) {
      this.confirmingUid.set(user.uid);
      return;
    }

    this.confirmingUid.set(null);
    this.busyUid.set(user.uid);
    this.multiAccountService.remove(user.uid, reason).subscribe({
      next: () => {
        this.dropUser(user.uid);
        this.notify('linkFlags.removed');
      },
      error: (error: HttpErrorResponse) => {
        this.busyUid.set(null);
        if (error.error?.error === 'ALREADY_REMOVED') {
          this.dropUser(user.uid);
          return;
        }
        this.notify(
          error.error?.error === 'CANNOT_REMOVE_MODERATOR'
            ? 'linkFlags.errors.moderator'
            : 'linkFlags.errors.generic',
        );
      },
    });
  }

  dismiss(user: FlaggedUser) {
    this.busyUid.set(user.uid);
    this.linkFlagService.dismiss(user.uid).subscribe({
      next: () => {
        this.dropUser(user.uid);
        this.notify('linkFlags.dismissed');
      },
      error: () => {
        this.busyUid.set(null);
        this.notify('linkFlags.errors.generic');
      },
    });
  }

  private dropUser(uid: string) {
    this.users.update((users) => users.filter((user) => user.uid !== uid));
    this.busyUid.set(null);
  }

  private notify(key: string) {
    this.utilsService.alert(
      this.translateService.instant(key),
      this.translateService.instant('buttonClose'),
    );
  }
}
