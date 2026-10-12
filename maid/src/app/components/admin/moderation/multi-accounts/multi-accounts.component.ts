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
  ClusterAccount,
  ClusterSignal,
  MultiAccountCluster,
  MultiAccountService,
} from '../../../../services/multi-account.service';
import { UtilsService } from '../../../../services/utils.service';

@Component({
  selector: 'app-multi-accounts',
  templateUrl: './multi-accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatProgressSpinner, RouterLink, TranslatePipe],
})
export class MultiAccountsComponent implements OnInit {
  private multiAccountService = inject(MultiAccountService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly signals: ClusterSignal[] = ['device', 'fingerprint'];

  activeSignal = signal<ClusterSignal>('device');
  loading = signal(true);
  clusters = signal<MultiAccountCluster[]>([]);
  busyKey = signal<string | null>(null);
  confirmingUid = signal<string | null>(null);
  reasons = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();
  }

  selectSignal(value: ClusterSignal) {
    if (value === this.activeSignal()) {
      return;
    }
    this.activeSignal.set(value);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.confirmingUid.set(null);
    this.multiAccountService.clusters(this.activeSignal()).subscribe({
      next: (clusters) => {
        this.clusters.set(clusters);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 403) {
          this.router.navigate(['../../profile'], { relativeTo: this.route });
          return;
        }
        this.notify('multiAccounts.errors.generic');
      },
    });
  }

  setReason(key: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.reasons.update((reasons) => ({ ...reasons, [key]: value }));
  }

  remove(cluster: MultiAccountCluster, account: ClusterAccount) {
    const reason = this.reasons()[cluster.key]?.trim();
    if (!reason) {
      this.notify('multiAccounts.reasonRequired');
      return;
    }
    if (this.confirmingUid() !== account.uid) {
      this.confirmingUid.set(account.uid);
      return;
    }

    this.confirmingUid.set(null);
    this.busyKey.set(cluster.key);
    this.multiAccountService.remove(account.uid, reason).subscribe({
      next: () => {
        this.markRemoved(account.uid);
        this.busyKey.set(null);
        this.notify('multiAccounts.removed');
      },
      error: (error: HttpErrorResponse) => {
        this.busyKey.set(null);
        if (error.error?.error === 'ALREADY_REMOVED') {
          this.markRemoved(account.uid);
          return;
        }
        this.notify(
          error.error?.error === 'CANNOT_REMOVE_MODERATOR'
            ? 'multiAccounts.errors.moderator'
            : 'multiAccounts.errors.generic',
        );
      },
    });
  }

  dismiss(cluster: MultiAccountCluster) {
    this.busyKey.set(cluster.key);
    this.multiAccountService.dismiss(cluster).subscribe({
      next: () => {
        this.dropCluster(cluster.key);
        this.notify('multiAccounts.dismissed');
      },
      error: () => {
        this.busyKey.set(null);
        this.notify('multiAccounts.errors.generic');
      },
    });
  }

  activeCount(cluster: MultiAccountCluster) {
    return cluster.accounts.filter((account) => !account.deleted).length;
  }

  // Removing an account can leave one active account in a group, which
  // resolves it, so every group that account belonged to drops off the list.
  private markRemoved(uid: string) {
    this.clusters.update((clusters) =>
      clusters
        .map((cluster) => ({
          ...cluster,
          accounts: cluster.accounts.map((account) =>
            account.uid === uid
              ? { ...account, deleted: true, removedByModerator: true }
              : account,
          ),
        }))
        .filter((cluster) => this.activeCount(cluster) >= 2),
    );
  }

  private dropCluster(key: string) {
    this.clusters.update((clusters) =>
      clusters.filter((cluster) => cluster.key !== key),
    );
    this.busyKey.set(null);
  }

  private notify(key: string) {
    this.utilsService.alert(
      this.translateService.instant(key),
      this.translateService.instant('buttonClose'),
    );
  }
}
