import { Component, Inject, OnInit } from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-facebook',
  templateUrl: './facebook.component.html',
  imports: [MatButtonModule],
})
export class FacebookComponent implements OnInit {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: string,
    public snackBarRef: MatSnackBarRef<FacebookComponent>,
  ) {}

  ngOnInit(): void {
    console.log(this.data);
  }

  close() {
    this.snackBarRef.dismiss();
  }
}
