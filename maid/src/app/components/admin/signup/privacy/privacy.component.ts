import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { PrivacyENComponent } from '../i18n/en/privacy.component';
import { PrivacyPTComponent } from '../i18n/pt/privacy.component';
import { PrivacyFRComponent } from '../i18n/fr/privacy.component';
import { PrivacyDEComponent } from '../i18n/de/privacy.component';
import { PrivacyITComponent } from '../i18n/it/privacy.component';
import { PrivacyESComponent } from '../i18n/es/privacy.component';
import { PrivacyNLComponent } from '../i18n/nl/privacy.component';
import { FooterComponent } from '../../../home/footer/footer.component';

@Component({
  selector: 'app-privacy',
  imports: [
    FooterComponent,
    RouterLink,
    TranslatePipe,
    PrivacyENComponent,
    PrivacyPTComponent,
    PrivacyFRComponent,
    PrivacyDEComponent,
    PrivacyITComponent,
    PrivacyESComponent,
    PrivacyNLComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.component.html',
  host: { class: 'block h-full' },
})
export class PrivacyComponent {
  readonly languageService = inject(LanguageService);
}
