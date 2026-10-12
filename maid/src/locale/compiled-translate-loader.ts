import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { compiledLocale } from './compiled-locale';
import { compiledMessages } from './compiled-messages';

@Injectable()
export class CompiledTranslateLoader implements TranslateLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string): Observable<TranslationObject> {
    if (compiledLocale()) {
      return of(compiledMessages as TranslationObject);
    }

    return this.http.get<TranslationObject>(`/assets/i18n/${lang}.json`);
  }
}
