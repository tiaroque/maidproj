import { Component, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';

@Component({
  selector: 'app-xprofile-stepper',
  templateUrl: './xprofile-stepper.component.html',
  imports: [MatStepperModule, MatButtonModule],
})
export class XprofileStepperComponent {
  @Input() dialogRef: MatDialogRef<XprofileStepperComponent>;

  loading = false;

  name: string;

  constructor() {}

  closeDialog() {
    this.dialogRef.close();
  }
}
