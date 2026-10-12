import { Component, inject, OnInit, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NgIf, NgOptimizedImage, NgStyle } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-display-photo',
  imports: [
    MatDialogModule,
    MatButtonModule,
    NgOptimizedImage,
    MatProgressSpinner,
    NgStyle,
    TranslatePipe,
  ],
  templateUrl: './display-photo.component.html',
})
export class DisplayPhotoComponent implements OnInit {
  // @ViewChild('timelineStrip', { static: true }) timelineStripRef: ElementRef;
  readonly dialogRef = inject(MatDialogRef<DisplayPhotoComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  isDark = false;
  imageLoading = signal(true);

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      this.isDark = isDark;
    });
  }

  imageLoaded(image: HTMLImageElement) {
    this.imageLoading.set(false);
    // const imageHeight = image.clientHeight;
    // const countainerHeight = this.timelineStripRef.nativeElement.clientHeight;
    // this.timelineStripRef.nativeElement.scrollTo(
    //   0,
    //   (imageHeight - countainerHeight) / 2,
    // );
  }
}
