import { Component, Inject, OnInit } from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-twitter',
  templateUrl: './twitter.component.html',
  imports: [MatButtonModule],
})
export class TwitterComponent implements OnInit {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: string,
    public snackBarRef: MatSnackBarRef<TwitterComponent>,
  ) {}

  ngOnInit(): void {
    console.log(this.data);
  }

  close() {
    this.snackBarRef.dismiss();
  }
}
