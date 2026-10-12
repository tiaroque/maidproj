import {
  Component,
  inject,
  input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import {
  ItemFilter,
  ItemValue,
} from '../../../../../services/admin/interfaces/common';
import { AssetsService } from '../../../../../services/admin/assets.service';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { UtilsService } from '../../../../../services/utils.service';
import { MatSelectModule } from '@angular/material/select';
import {
  MatOptionModule,
  MatOptionSelectionChange,
} from '@angular/material/core';
import { ChatStore } from '../../../../../services/admin/signals/store';
import { TranslatePipe } from '@ngx-translate/core';
import { TitleCasePipe } from '@angular/common';
import { hasKind } from '../../../../../forms/form-utils';

@Component({
  selector: 'app-languages',
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatSelectModule,
    MatOptionModule,
    TranslatePipe,
    TitleCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './languages.component.html',
})
export class LanguagesComponent implements OnInit {
  languages = input.required<FieldTree<string[]>>();
  isFilter = input.required<boolean>();
  storeChat = inject(ChatStore);
  languageOptions: ItemValue[] = [];
  languagesObj: { [value: string]: string } = {};

  assetsService = inject(AssetsService);
  utilsService = inject(UtilsService);
  protected readonly hasKind = hasKind;

  selectionChange($event: MatOptionSelectionChange<string>, option: ItemValue) {
    if (this.isFilter()) {
      if ($event.source.selected) {
        const filterItem: ItemFilter = {
          ...option,
          type: 'languages',
        };

        this.storeChat.addFilter(filterItem);
      } else {
        this.storeChat.removeFilterByValue(option.value, 'changing');
      }
    }
  }

  ngOnInit(): void {
    this.languageOptions = this.assetsService.getLanguages();
    this.languagesObj = this.languageOptions.reduce(
      (ac, item: ItemValue) => ({ ...ac, [item.value]: item.name }),
      {},
    );
  }
}
