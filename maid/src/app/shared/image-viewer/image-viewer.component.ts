import {
  Component,
  computed,
  ElementRef,
  HostListener,
  input,
  linkedSignal,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { S3UrlPipe } from '../../utils/s3-url';
import {
  ImageObj,
  ProfileImage,
} from '../../services/admin/interfaces/user.interface';

@Component({
  selector: 'app-image-viewer',
  imports: [MatButtonModule, MatProgressSpinner, NgStyle, MatIcon, S3UrlPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './image-viewer.component.html',
})
export class ImageViewerComponent {
  @ViewChild('image') public imageRef: ElementRef<HTMLImageElement>;
  @ViewChild('leftBtn') public leftBtn: ElementRef<HTMLDivElement>;
  @ViewChild('rightBtn') public rightBtn: ElementRef<HTMLDivElement>;
  album = input.required<ProfileImage[] | ImageObj[]>();
  showViewer = input.required<{ index: number }>();

  // imageIndex = signal(0);
  showImage = computed(() => this.album()[this.imageIndex().index]);
  imageLoading = signal(true);

  imageIndex = linkedSignal(() => this.showViewer());
  showImageViewer = linkedSignal<
    {
      index: number;
    },
    boolean
  >({
    source: this.imageIndex,
    computation: (index, previous) => (index.index >= 0 ? true : false),
  });

  previousImage() {
    this.imageIndex.update((value) => ({
      index: --value.index,
    }));
  }
  nextImage() {
    this.imageIndex.update((value) => ({
      index: ++value.index,
    }));
  }

  closeImageViwer() {
    this.showImageViewer.set(false);
  }

  @HostListener('click', ['$event.target'])
  clicked(target: any) {
    const img = this.imageRef;

    if (!this.imageRef || !this.leftBtn || !this.rightBtn) {
      return;
    }

    const clickedInside =
      this.imageRef.nativeElement.contains(target) ||
      this.leftBtn.nativeElement.contains(target) ||
      this.rightBtn.nativeElement.contains(target);
    if (!clickedInside) {
      this.closeImageViwer();
    }
  }

  // @HostListener('document:click')
  // clickedOut() {
  // }

  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.src = './assets/images/image-regular-2.svg';
  }
  imageLoaded(image: HTMLImageElement) {
    this.imageLoading.set(false);
  }
}
