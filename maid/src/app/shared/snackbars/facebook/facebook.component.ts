import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-facebook',
  templateUrl: './facebook.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButtonModule, TranslatePipe],
})
export class FacebookComponent {
  data = inject(MAT_SNACK_BAR_DATA);
  snackBarRef = inject<MatSnackBarRef<FacebookComponent>>(MatSnackBarRef);

  close() {
    this.snackBarRef.dismiss();
  }
}
