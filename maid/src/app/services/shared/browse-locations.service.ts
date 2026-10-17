import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BrowseLocation,
  ResolvedBrowseLocation,
  countryBySlug,
  indexLocations,
  serviceBySlug,
} from '../../utils/browse-locations';

@Injectable({ providedIn: 'root' })
export class BrowseLocationsService {
  private readonly httpClient = inject(HttpClient);

  // The index backs every /browse/:country/:city request and changes at most
  // a few times a day, so one shared in-flight request is replayed to all of
  // them rather than refetched per navigation.
  private readonly index$ = this.httpClient
    .get<BrowseLocation[]>(`${environment.baseUrl}/api/list/sitemap-locations`)
    .pipe(
      map((locations) => indexLocations(locations ?? [])),
      catchError(() => of(new Map<string, Map<string, BrowseLocation>>())),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  citiesFor(countrySlug: string): Observable<BrowseLocation[]> {
    return this.index$.pipe(
      map((index) => [...(index.get(countrySlug)?.values() ?? [])]),
    );
  }

  /**
   * Resolves a `/browse/:country/:city/:service` path to the filters the list
   * API expects. Returns null for an unknown country, city or service, and for
   * a service nobody in that city offers, so the route can fall through to the
   * 404 page instead of rendering an empty, indexable listing.
   */
  resolve(
    countrySlug: string | undefined,
    citySlug: string | undefined,
    serviceSlug: string | undefined,
  ): Observable<ResolvedBrowseLocation | null> {
    const country = countryBySlug(countrySlug);
    if (!country) {
      return of(null);
    }
    if (!citySlug) {
      return of(serviceSlug ? null : { country });
    }

    const serviceKey = serviceSlug ? serviceBySlug(serviceSlug) : undefined;
    if (serviceSlug && !serviceKey) {
      return of(null);
    }

    return this.index$.pipe(
      map((index) => {
        const location = index.get(country.slug)?.get(citySlug.toLowerCase());
        if (!location) {
          return null;
        }
        if (!serviceKey) {
          return { country, location, citySlug };
        }
        const service = location.services.find(
          (entry) => entry.service === serviceKey,
        );
        // A service with no cleaners in this city has nothing to list, so it
        // gets no page rather than an empty one.
        return service
          ? { country, location, citySlug, service, serviceSlug }
          : null;
      }),
    );
  }
}
