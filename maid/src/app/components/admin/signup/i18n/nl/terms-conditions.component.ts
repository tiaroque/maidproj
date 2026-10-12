import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService } from '../../../../../services/shared/language-service.service';

@Component({
  selector: 'app-terms-nl',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './terms-conditions.component.html',
})
export class TermsConditionsNLComponent {
  public languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;
}
