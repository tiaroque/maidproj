import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-google',
  templateUrl: './google.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButtonModule, TranslatePipe],
})
export class GoogleComponent implements OnInit {
  data = inject(MAT_SNACK_BAR_DATA);
  snackBarRef = inject<MatSnackBarRef<GoogleComponent>>(MatSnackBarRef);

  ngOnInit(): void {
    console.log(this.data);
  }

  close() {
    this.snackBarRef.dismiss();
  }
}
