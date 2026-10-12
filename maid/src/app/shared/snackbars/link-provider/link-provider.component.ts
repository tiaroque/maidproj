import { Component, Inject, OnInit } from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-link-provider',
  templateUrl: './link-provider.component.html',
  imports: [NgIf, MatButtonModule],
})
export class LinkProviderComponent implements OnInit {
  provider: string;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: string,
    public snackBarRef: MatSnackBarRef<LinkProviderComponent>,
  ) {}

  ngOnInit(): void {
    this.provider = this.data;

    console.log(this.data);
  }

  close() {
    this.data = 'close';
    this.snackBarRef.dismissWithAction();
  }

  ok() {
    this.data = 'ok';
    this.snackBarRef.dismissWithAction();
  }
}
