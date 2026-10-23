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

export interface FeaturedCity {
  countrySlug: string;
  citySlug: string;
  locationName: string;
}

@Injectable({ providedIn: 'root' })
export class BrowseLocationsService {
  private readonly httpClient = inject(HttpClient);
  private indexSnapshot = new Map<string, Map<string, BrowseLocation>>();

  // The index backs every /browse/:country/:city request and changes at most
  // a few times a day, so one shared in-flight request is replayed to all of
  // them rather than refetched per navigation.
  private readonly index$ = this.httpClient
    .get<BrowseLocation[]>(`${environment.baseUrl}/api/list/sitemap-locations`)
    .pipe(
      map((locations) => {
        const index = indexLocations(locations ?? []);
        this.indexSnapshot = index;
        return index;
      }),
      catchError(() => of(new Map<string, Map<string, BrowseLocation>>())),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  /** Cities already resolved for this country. Empty until the index arrives. */
  snapshotCities(countrySlug: string): BrowseLocation[] {
    return [...(this.indexSnapshot.get(countrySlug)?.values() ?? [])];
  }

  /** Busiest indexable cities, for links on the homepage. */
  featuredCities(limit = 12): Observable<FeaturedCity[]> {
    return this.index$.pipe(
      map((index) => {
        const cities: Array<FeaturedCity & { count: number }> = [];
        for (const [countrySlug, places] of index) {
          for (const [citySlug, location] of places) {
            if (!location.indexable) {
              continue;
            }
            cities.push({
              countrySlug,
              citySlug,
              locationName: location.locationName,
              count: location.count,
            });
          }
        }
        return cities
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map(({ countrySlug, citySlug, locationName }) => ({
            countrySlug,
            citySlug,
            locationName,
          }));
      }),
    );
  }

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
      if (serviceSlug) {
        return of(null);
      }
      // Wait for the same index the city pages use, so the country sentence
      // and its meta description are ready on the first render.
      return this.index$.pipe(map(() => ({ country })));
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
