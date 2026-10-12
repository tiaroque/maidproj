import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { TermsConditionsENComponent } from '../i18n/en/terms-conditions.component';
import { TermsConditionsPTComponent } from '../i18n/pt/terms-conditions.component';
import { TermsConditionsFRComponent } from '../i18n/fr/terms-conditions.component';
import { TermsConditionsDEComponent } from '../i18n/de/terms-conditions.component';
import { TermsConditionsITComponent } from '../i18n/it/terms-conditions.component';
import { TermsConditionsESComponent } from '../i18n/es/terms-conditions.component';
import { TermsConditionsNLComponent } from '../i18n/nl/terms-conditions.component';
import { FooterComponent } from '../../../home/footer/footer.component';

@Component({
  selector: 'app-terms-conditions',
  imports: [
    FooterComponent,
    RouterLink,
    TranslatePipe,
    TermsConditionsENComponent,
    TermsConditionsPTComponent,
    TermsConditionsFRComponent,
    TermsConditionsDEComponent,
    TermsConditionsITComponent,
    TermsConditionsESComponent,
    TermsConditionsNLComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terms-conditions.component.html',
  host: { class: 'block h-full' },
})
export class TermsConditionsComponent {
  readonly languageService = inject(LanguageService);
}
