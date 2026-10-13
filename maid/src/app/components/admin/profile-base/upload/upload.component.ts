import { NgOptimizedImage } from '@angular/common';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import {
  Component,
  inject,
  linkedSignal,
  OnInit,
  signal,
  computed,
  TemplateRef,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UploadService } from '../../../../services/admin/upload.service';
import { UserService } from '../../../../services/user.service';
import { UtilsService } from '../../../../services/utils.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { S3UrlPipe } from '../../../../utils/s3-url';
import { ThemeService } from '../../../../services/theme.service';
import {
  Photo,
  ProfileImage,
  UserDetailsObject,
  UserType,
} from '../../../../services/admin/interfaces/user.interface';
import { ChatStore } from '../../../../services/admin/signals/store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ImageViewerService } from '../../../../services/admin/image-viewer.service';
import { ProfileAvatarComponent } from '../../../../shared/profile-avatar/profile-avatar.component';
import { avatarOptions } from '../../../../utils/avatar';
import {
  ImageCropDialogComponent,
  ImageCropDialogData,
} from './image-crop-dialog/image-crop-dialog.component';
import {
  VerifyDialogComponent,
  VerifyDialogData,
} from './verify-dialog/verify-dialog.component';
import {
  VerificationService,
  VerificationStatus,
} from '../../../../services/verification.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
  // host: { class: 'border-r-2 border-color block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    MatProgressBarModule,
    MatButtonModule,
    MatMenuModule,
    MatIcon,
    MatProgressSpinner,
    MatDialogModule,
    MatTooltipModule,
    TranslatePipe,
    ProfileAvatarComponent,
    S3UrlPipe,
  ],
})
export class UploadComponent implements OnInit {
  private uploadService = inject(UploadService);
  private usersService = inject(UserService);
  private utilsService = inject(UtilsService);
  private themeService = inject(ThemeService);
  private verificationService = inject(VerificationService);
  dialog = inject(MatDialog);

  readonly templateConfirmDelete = viewChild.required<TemplateRef<any>>(
    'templateConfirmDelete',
  );

  readonly storeChat = inject(ChatStore);
  readonly translateService = inject(TranslateService);
  readonly imageViewerService = inject(ImageViewerService);

  // @Input() userProfile: UserObject;
  user: UserDetailsObject;

  isMobile = UtilsService.isUserUsingMobile();
  isDark = signal(false);
  userType: UserType = 'Client';

  chosenFiles: FileList | undefined;
  existingFile: File | undefined;
  progress = 0;
  showLoader = signal(false);

  readonly album = linkedSignal(() => {
    const user = this.storeChat.me();
    const images = user.user.images;

    // Maps Photos into ProfileImages array

    return images
      ? images.map((image: Photo): ProfileImage => {
          return {
            isNew: image.isNew!,
            isProfile: image.isProfile,
            key: image.key,
            keyRezised: image.keyRezised,
            width: image.width,
            height: image.height,
            blobUrl: image.blobUrl,
            thumbHeight: image.thumbHeight,
            thumbWidth: image.thumbWidth,
          };
        })
      : [];
  });

  readonly maxPhotos = 5;
  readonly emptySlots = computed(() =>
    Array.from(
      {
        length: Math.max(
          0,
          this.maxPhotos - this.album().length - (this.showLoader() ? 1 : 0),
        ),
      },
      (_, index) => index,
    ),
  );

  readonly meUser = computed(() => this.storeChat.me().user);
  readonly currentAvatar = computed(() => this.meUser()?.avatar);
  readonly avatars = computed(() => avatarOptions());
  readonly profilePhoto = computed(() =>
    this.currentAvatar()
      ? null
      : (this.album().find((image) => image.isProfile) ?? null),
  );
  showAvatarPicker = signal(false);
  savingAvatar = signal<string | null>(null);

  showViewer = signal<{ index: number }>({ index: -1 });

  verification = signal<VerificationStatus | null>(null);

  ngOnInit(): void {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      this.isDark.set(isDark);
    });

    this.loadVerification();

    this.user = this.storeChat.me();
    this.userType = this.user.user.claims!.user;

    // this.preloadImages$.subscribe();
  }

  loadVerification() {
    this.verificationService.status().subscribe({
      next: (status) => this.verification.set(status),
      error: () => this.verification.set(null),
    });
  }

  openVerify() {
    const dialogRef = this.dialog.open<
      VerifyDialogComponent,
      VerifyDialogData,
      boolean
    >(VerifyDialogComponent, {
      data: { isDark: this.isDark() },
      width: '520px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.utilsService.alert(
          this.translateService.instant('verification.submitted'),
          this.translateService.instant('buttonClose'),
        );
        this.loadVerification();
      }
    });
  }

  open(file: ProfileImage, index: number): void {
    this.showViewer.set({ index });
    this.imageViewerService.listPhotos.set(this.album());
    this.imageViewerService.showViewer.set(this.showViewer());
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.chosenFiles = input.files as FileList;

    if (this.chosenFiles && this.chosenFiles?.length > 0) {
      const file = this.chosenFiles.item(0) as File;
      input.value = '';
      this.openCropper(file);
    }
  }

  private openCropper(file: File) {
    const dialogRef = this.dialog.open<
      ImageCropDialogComponent,
      ImageCropDialogData,
      File | null | undefined
    >(ImageCropDialogComponent, {
      data: { file, isDark: this.isDark() },
      width: '560px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((cropped) => {
      this.chosenFiles = undefined;
      if (cropped === null) {
        this.utilsService.alert(
          this.translateService.instant('upload.imageUploadError'),
          this.translateService.instant('buttonClose'),
          6000,
          'top',
        );
      } else if (cropped) {
        this.existingFile = cropped;
        this.upload(cropped);
      }
    });
  }

  setProfilePic(key: string) {
    const close = this.translateService.instant('buttonClose');
    const profilePhotoChanged = this.translateService.instant(
      'upload.profilePhotoChanged',
    );
    const errorChangingPhoto = this.translateService.instant(
      'upload.errorChangingPhoto',
    );
    this.usersService.setProfilePic({ key }).subscribe(
      () => {
        // this.images = this.uploadService.getFiles();
        this.utilsService.alert(profilePhotoChanged, close);

        this.storeChat.setProfilePic(key);
        this.loadVerification();
      },
      () => this.utilsService.alert(errorChangingPhoto, close),
    );
  }

  chooseAvatar(avatar: string) {
    if (this.savingAvatar()) {
      return;
    }
    if (avatar === this.currentAvatar()) {
      this.showAvatarPicker.set(false);
      return;
    }

    const close = this.translateService.instant('buttonClose');
    this.savingAvatar.set(avatar);
    this.usersService.setAvatar(avatar).subscribe({
      next: () => {
        this.storeChat.setAvatar(avatar);
        this.loadVerification();
        this.savingAvatar.set(null);
        this.showAvatarPicker.set(false);
        this.utilsService.alert(
          this.translateService.instant('upload.avatarChanged'),
          close,
        );
      },
      error: () => {
        this.savingAvatar.set(null);
        this.utilsService.alert(
          this.translateService.instant('upload.errorChangingAvatar'),
          close,
        );
      },
    });
  }

  private async upload(file: File) {
    const close = this.translateService.instant('buttonClose');
    const imageMaxSizError = this.translateService.instant(
      'upload.imageMaxSizError',
    );
    // const imageTooBig = this.translateService.instant('upload.imageTooBig');
    const imageUploadError = this.translateService.instant(
      'upload.imageUploadError',
    );

    this.showLoader.set(true);
    this.progress = 0;

    const fileSizeMb = +(file.size / (1024 * 1024)).toFixed(2);
    if (fileSizeMb > 1) {
      this.utilsService.alert(imageMaxSizError, close, 6000, 'top');
      this.showLoader.set(false);
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const width = img.width;
    const height = img.height;

    this.uploadService.uploadFile(file, width, height).subscribe(
      (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.progress = Math.round(
            (100 * event.loaded) / (event.total as number),
          );
        } else if (event instanceof HttpResponse) {
          const { imageObj } = event.body;

          const { images: userImages, avatar } = this.storeChat.me().user;
          if (userImages?.length === 0 && !avatar) {
            this.setProfilePic(imageObj.key);
          }

          this.storeChat.addImagesToUser({
            isNew: true,
            keyRezised: imageObj.keyRezised,
            keyBlured: imageObj.keyBlured,
            key: imageObj.key,
            isProfile: false,
            bucket: imageObj.bucket,
            contentType: imageObj.contentType,
            etag: imageObj.etag,
            mimetype: imageObj.mimetype,
            originalname: imageObj.originalname,
            size: imageObj.size,
            userId: imageObj.userId,
            width: width,
            height: height,
            thumbWidth: imageObj.thumbWidth,
            thumbHeight: imageObj.thumbHeight,
            blobUrl: img.src,
          });

          new Image().src = imageObj.location;

          this.showLoader.set(false);

          // this.filesList = [];
          this.existingFile = undefined;
        }
      },
      (error) => {
        console.error('Failed to upload photo', error);
        this.progress = 0;
        // this.msg = 'Error occured while uploading file';

        this.utilsService.alert(imageUploadError, close, 6000, 'top');

        this.existingFile = undefined;
        this.showLoader.set(false);
      },
    );

    this.chosenFiles = undefined;
  }

  confirmDelete(file: any) {
    const dialogRef = this.dialog.open(this.templateConfirmDelete(), {
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const close = this.translateService.instant('buttonClose');
        const imageDeleted = this.translateService.instant(
          'upload.imageDeleted',
        );
        const imageDeleteError = this.translateService.instant(
          'upload.imageDeleteError',
        );

        this.setDeleteLoadingImage(file.key);

        this.uploadService.deleteFile(file.key).subscribe({
          next: () => {
            this.utilsService.alert(imageDeleted, close);
            this.storeChat.removeUserImage(file.key);
            this.loadVerification();
          },
          error: () => {
            this.utilsService.alert(imageDeleteError, close);
          },
          complete: () => {},
        });
      }
    });
  }

  setDeleteLoadingImage(imageKey: string) {
    this.album.update((images) =>
      images.map((img) =>
        img.key === imageKey ? { ...img, isLoading: true } : img,
      ),
    );
  }

  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.src = './assets/images/image-regular-2.svg';
  }
}
