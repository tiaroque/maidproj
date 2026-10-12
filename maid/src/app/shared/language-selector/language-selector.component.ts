import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateService } from '@ngx-translate/core';
import { UpperCasePipe } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import {
  ActivatedRoute,
  PRIMARY_OUTLET,
  Router,
  UrlSegment,
} from '@angular/router';
import { compiledLocale } from '../../../locale/compiled-locale';
import { ChatStore } from '../../services/admin/signals/store';
import { LanguageService } from '../../services/shared/language-service.service';
import { UtilsService } from '../../services/utils.service';
import { localeSwitchHref, pageSegments } from '../../utils/locale-href';

@Component({
  selector: 'app-language-selector',
  imports: [MatButtonModule, MatMenuModule, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './language-selector.component.html',
})
export class LanguageSelectorComponent {
  translateService = inject(TranslateService);
  utilsService = inject(UtilsService);
  languageService = inject(LanguageService);
  cookieService = inject(CookieService);
  storeChat = inject(ChatStore);
  router = inject(Router);

  selectedLanguage = signal('en');

  // languages = signal(this.languageService.getLanguagesMenu());

  languages = computed(() => {
    return this.languageService
      .getLanguagesMenu()
      .filter((lang) =>
        this.languageService.currentLanguages.includes(lang.value),
      );
  });

  constructor() {
    // afterNextRender(() => {
    //   const browserLang = this.translateService.getBrowserLang();
    //   const selectedLanguage =
    //     localStorage.getItem('selectedLanguage') || browserLang || 'en';
    //   this.translateService.setDefaultLang(this.selectedLanguage());
    //   this.translateService.use(this.selectedLanguage());
    //   this.selectedLanguage.set(selectedLanguage);
    // });

    this.selectedLanguage.set(this.languageService.defaultLang());
  }

  selectLanguage(value: string) {
    this.selectedLanguage.set(value);
    // this.cookieService.set('lang', value, {
    //   path: '/',
    // });
    // this.translateService.use(value);
    // this.languageService.setDefaultLanguage(value);
    const urlTree = this.router.parseUrl(this.router.url);
    const segments = (
      urlTree.root.children[PRIMARY_OUTLET]?.segments ?? []
    ).map((segment) => segment.path);
    const pages = pageSegments(segments);

    if (compiledLocale()) {
      globalThis.location.assign(
        localeSwitchHref(value, pages, urlTree.queryParams),
      );
      return;
    }

    this.router.navigate([value, ...pages], {
      queryParams: urlTree.queryParams,
    });

    // this.languageService.changeLang(value);
    // this.storeChat.loadLocations(value);
    // this.storeChat.loadCountries(value);
  }
}
