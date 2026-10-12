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
  VerificationQueueItem,
  VerificationService,
} from '../../../services/verification.service';
import { UtilsService } from '../../../services/utils.service';
import { S3UrlPipe } from '../../../utils/s3-url';

@Component({
  selector: 'app-moderation',
  templateUrl: './moderation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatProgressSpinner, RouterLink, TranslatePipe, S3UrlPipe],
})
export class ModerationComponent implements OnInit {
  private verificationService = inject(VerificationService);
  private utilsService = inject(UtilsService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  items = signal<VerificationQueueItem[]>([]);
  busyId = signal<string | null>(null);
  reasons = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.verificationService.queue().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 403) {
          this.router.navigate(['../profile'], { relativeTo: this.route });
          return;
        }
        this.notify('verification.errors.generic');
      },
    });
  }

  setReason(id: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.reasons.update((reasons) => ({ ...reasons, [id]: value }));
  }

  approve(item: VerificationQueueItem) {
    this.busyId.set(item.id);
    this.verificationService.approve(item.id).subscribe({
      next: ({ verified }) => {
        this.remove(item.id);
        this.notify(
          verified
            ? 'verification.moderation.approved'
            : 'verification.moderation.photoChanged',
        );
      },
      error: () => this.fail(),
    });
  }

  reject(item: VerificationQueueItem) {
    const reason = this.reasons()[item.id]?.trim();
    if (!reason) {
      this.notify('verification.moderation.reasonRequired');
      return;
    }
    this.busyId.set(item.id);
    this.verificationService.reject(item.id, reason).subscribe({
      next: () => {
        this.remove(item.id);
        this.notify('verification.moderation.rejected');
      },
      error: () => this.fail(),
    });
  }

  private remove(id: string) {
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.busyId.set(null);
  }

  private fail() {
    this.busyId.set(null);
    this.notify('verification.errors.generic');
  }

  private notify(key: string) {
    this.utilsService.alert(
      this.translateService.instant(key),
      this.translateService.instant('buttonClose'),
    );
  }
}
