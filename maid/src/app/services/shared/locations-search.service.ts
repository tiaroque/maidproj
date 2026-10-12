import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MeridianSearchResponse } from '../admin/interfaces/common';
// import { SsrCookieService } from 'ngx-cookie-service-ssr';

export interface Location {
  _id: string;
  type: string;
  id: number;
  tags: Tags;
  name_norm: string;
  parents: Parent[];
  children: Children[];
}

export interface Tags {
  admin_level: string;
  border_type: string;
  boundary: string;
  name: string;
  official_name: string;

  // optional properties
  nat_ref?: string;
  population?: string;
  'population:date'?: string;
  'ref:ine'?: string;
  source?: string;
  start_date?: string;
  website?: string;
  wikidata?: string;
  wikipedia?: string;
  'name:ar'?: string;
  'official_name:ar'?: string;
}

export interface Parent {
  _id: string;
  type: string;
  id: number;
  tags: Tags;
  name_norm: string;
  parents: Parent[];
}

export interface Children {
  _id: string;
  type: string;
  id: number;
  tags: Tags;
  name_norm: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationSearchService {
  private http = inject(HttpClient);

  searchLocations(lang: string, search: string) {
    const url = `${environment.meridianApiUrl}/api/locations/search`;
    const params = new HttpParams()
      .set('q', search)
      .set('lang', lang)
      .set('limit', 10);
    return this.http.get<MeridianSearchResponse>(url, { params });
  }
}
