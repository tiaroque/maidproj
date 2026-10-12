import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ImageCropperComponent } from 'ngx-image-cropper';

export interface ImageCropDialogData {
  file: File;
  isDark: boolean;
}

@Component({
  selector: 'app-image-crop-dialog',
  templateUrl: './image-crop-dialog.component.html',
  styleUrls: ['./image-crop-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinner,
    TranslatePipe,
    ImageCropperComponent,
  ],
})
export class ImageCropDialogComponent {
  readonly data = inject<ImageCropDialogData>(MAT_DIALOG_DATA);
  // Closes with a File on save, null when the image can't be read, undefined on cancel.
  private dialogRef = inject(
    MatDialogRef<ImageCropDialogComponent, File | null | undefined>,
  );

  readonly cropper = viewChild.required(ImageCropperComponent);

  readonly maxOutputSize = 1600;
  ready = signal(false);
  saving = signal(false);

  loadFailed() {
    this.dialogRef.close(null);
  }

  async save() {
    this.saving.set(true);
    const result = await this.cropper().crop('blob');
    this.saving.set(false);

    if (!result?.blob) {
      this.dialogRef.close(null);
      return;
    }

    const name = this.data.file.name.replace(/\.[^.]+$/, '') + '.jpg';
    this.dialogRef.close(
      new File([result.blob], name, { type: 'image/jpeg' }),
    );
  }
}
