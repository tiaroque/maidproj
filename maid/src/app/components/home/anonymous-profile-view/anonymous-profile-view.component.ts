import {
  Component,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';
import { UserDetailsObject } from '../../../services/admin/interfaces/user.interface';
import { ProfileViewComponent } from '../../../shared/profile-view/profile-view.component';
import { QuickSearchComponent } from '../../../shared/quick-search/quick-search.component';
import { FooterComponent } from '../footer/footer.component';
import { LanguageService } from '../../../services/shared/language-service.service';

@Component({
  selector: 'app-profile-search',
  imports: [
    HeaderComponent,
    ProfileViewComponent,
    QuickSearchComponent,
    FooterComponent,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anonymous-profile-view.component.html',
  host: { class: 'block h-full' },
})
export class AnonymousProfileViewComponent {
  readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.defaultLang;

  userProfileDetails = input.required<UserDetailsObject>();
}
