import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { hasKind } from '../../forms/form-utils';

@Component({
  selector: 'app-gender',
  imports: [FormField, MatButtonToggleModule, MatIcon, NgClass, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './gender.component.html',
})
export class GenderComponent {
  gender = input.required<FieldTree<string>>();
  hasLoading = input(false);
  protected readonly hasKind = hasKind;
}
