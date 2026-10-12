import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemValue, MeridianSearchResponse } from './interfaces/common';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class AssetsService {
  private httpClient = inject(HttpClient);

  translateService = inject(TranslateService);

  getCountries(lang: string): Observable<ItemValue[]> {
    const url = `${environment.baseUrl}/api/assets/countries`;
    const params = new HttpParams().set('lang', lang);
    return this.httpClient.get<ItemValue[]>(url, {
      params,
      withCredentials: true,
    });
  }

  searchMeridianLocations(
    query: string,
    country: string,
  ): Observable<MeridianSearchResponse> {
    const url = `${environment.meridianApiUrl}/api/locations/search`;
    const lang = country.toLowerCase() === 'gb' ? 'uk' : country.toLowerCase();
    const params = new HttpParams()
      .set('q', query)
      .set('limit', 10)
      .set('lang', lang);

    return this.httpClient.get<MeridianSearchResponse>(url, { params });
  }

  getLanguages(): ItemValue[] {
    return [
      { value: 'en', name: 'English' },
      { value: 'pt', name: 'Português' },
      { value: 'fr', name: 'Français' },
      { value: 'de', name: 'Deutsch' },
      { value: 'it', name: 'Italiano' },
      { value: 'es', name: 'Español' },
      { value: 'nl', name: 'Nederlands' },
    ];
  }

  // getMonths() {
  //   return [
  //     { value: 1, name: 'Janeiro' },
  //     { value: 2, name: 'Fevereiro' },
  //     { value: 3, name: 'Março' },
  //     { value: 4, name: 'Abril' },
  //     { value: 5, name: 'Maio' },
  //     { value: 6, name: 'Junho' },
  //     { value: 7, name: 'Julho' },
  //     { value: 8, name: 'Agosto' },
  //     { value: 9, name: 'Setembro' },
  //     { value: 10, name: 'Outubro' },
  //     { value: 11, name: 'Novembro' },
  //     { value: 12, name: 'Dezembro' },
  //   ];
  // }
}
