import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-alerts-geral',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './alerts-geral.component.html',
})
export class AlertsGeralComponent implements OnInit {
  public data = inject(MAT_SNACK_BAR_DATA);
  public snackBarRef = inject(MatSnackBarRef<AlertsGeralComponent>);
  messageTxt: string;
  buttonTxt: string;

  ngOnInit(): void {
    this.messageTxt = this.data.messageTxt;
    this.buttonTxt = this.data.buttonTxt;
  }
}
