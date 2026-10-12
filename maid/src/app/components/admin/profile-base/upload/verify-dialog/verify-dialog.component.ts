import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
  MatDialogState,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { VerificationService } from '../../../../../services/verification.service';

export interface VerifyDialogData {
  isDark: boolean;
}

type Step = 'consent' | 'pose';

const KNOWN_ERRORS = [
  'CHALLENGE_EXPIRED',
  'PROFILE_PHOTO_REQUIRED',
  'ALREADY_PENDING',
  'TOO_MANY_ATTEMPTS',
];

@Component({
  selector: 'app-verify-dialog',
  templateUrl: './verify-dialog.component.html',
  styleUrls: ['./verify-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIcon,
    MatProgressSpinner,
    TranslatePipe,
  ],
})
export class VerifyDialogComponent {
  readonly data = inject<VerifyDialogData>(MAT_DIALOG_DATA);
  // Closes with true once a selfie was submitted for review.
  private dialogRef = inject(MatDialogRef<VerifyDialogComponent, boolean>);
  private verificationService = inject(VerificationService);
  private destroyRef = inject(DestroyRef);

  step = signal<Step>('consent');
  consent = signal(false);
  loading = signal(false);
  challengeId = signal<string | null>(null);
  selfie = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  errorKey = signal<string | null>(null);

  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  stream = signal<MediaStream | null>(null);
  cameraFailed = signal(false);

  constructor() {
    effect(() => {
      const video = this.video()?.nativeElement;
      const stream = this.stream();
      if (video && video.srcObject !== stream) {
        video.srcObject = stream;
      }
    });

    this.destroyRef.onDestroy(() => {
      this.stopCamera();
      this.revokePreview();
    });
  }

  start() {
    this.loading.set(true);
    this.errorKey.set(null);
    this.verificationService.challenge().subscribe({
      next: ({ challengeId }) => {
        this.challengeId.set(challengeId);
        this.step.set('pose');
        this.loading.set(false);
        this.startCamera();
      },
      error: (error) => this.fail(error),
    });
  }

  async startCamera() {
    this.cameraFailed.set(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraFailed.set(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      // The dialog may have been closed while the permission prompt was open.
      if (this.dialogRef.getState() !== MatDialogState.OPEN) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream.set(stream);
    } catch {
      this.cameraFailed.set(true);
    }
  }

  capture() {
    const video = this.video()?.nativeElement;
    if (!video || !video.videoWidth) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.errorKey.set('verification.errors.generic');
          return;
        }
        this.stopCamera();
        this.setSelfie(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  }

  retake() {
    this.revokePreview();
    this.selfie.set(null);
    this.previewUrl.set(null);
    this.startCamera();
  }

  chooseSelfie(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    this.stopCamera();
    this.setSelfie(file);
  }

  private setSelfie(file: File) {
    this.revokePreview();
    this.selfie.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.errorKey.set(null);
  }

  private stopCamera() {
    this.stream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.stream.set(null);
  }

  submit() {
    const file = this.selfie();
    if (!file) {
      return;
    }
    this.loading.set(true);
    this.errorKey.set(null);
    this.verificationService.submit(file).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => this.fail(error),
    });
  }

  private fail(error: HttpErrorResponse) {
    this.loading.set(false);
    const code = error?.error?.error;
    this.errorKey.set(
      KNOWN_ERRORS.includes(code)
        ? `verification.errors.${code}`
        : 'verification.errors.generic',
    );
    if (code === 'CHALLENGE_EXPIRED') {
      this.stopCamera();
      this.step.set('consent');
      this.challengeId.set(null);
    }
  }

  private revokePreview() {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
