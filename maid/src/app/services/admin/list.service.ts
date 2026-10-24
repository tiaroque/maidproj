import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserDetailsObject,
  UserModel,
  UserType,
} from './interfaces/user.interface';
import { ListPaging } from './interfaces/list.interface';

export interface SliderMinMaxValues {
  min: number;
  max: number;
}

export interface Sliders {
  rate: SliderMinMaxValues;
}

export interface ProfileLikeResult {
  liked: boolean;
  likedUid: string;
  createdAt: string | null;
}

export interface ProfileVisitResult {
  visited: boolean;
  visitedUid: string;
  createdAt: string | null;
  lastVisitedAt: string | null;
}

export interface ActivityFeed {
  likes: UserDetailsObject[];
  myLikes: UserDetailsObject[];
  visits: UserDetailsObject[];
}

@Injectable({
  providedIn: 'root',
})
export class ListService {
  httpClient: HttpClient = inject(HttpClient);

  getList(
    type: UserType,
    pageNumber: number,
    pageSize: number,
    searchTerms: string[],
    globalFilters: Map<string, string[]>,
  ): Observable<ListPaging> {
    const url = `${environment.baseUrl}/api/list`;
    let params = new HttpParams()
      .set('type', type)
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('searchTerms', searchTerms.join(' '));

    globalFilters.forEach((value, key, map) => {
      params = params.set(key, value.join(','));
    });

    return this.httpClient.get<ListPaging>(url, {
      params,
      withCredentials: true,
    });
  }

  getListAnonymous(
    globalFilters: Map<string, string | undefined>,
  ): Observable<UserDetailsObject[]> {
    const url = `${environment.baseUrl}/api/list/browse`;
    let params = new HttpParams();
    globalFilters.forEach((value, key, map) => {
      params = params.set(key, value ?? '');
    });

    // No `withCredentials`: this is a public endpoint, and Angular skips
    // credentialed requests when filling the SSR transfer cache, which would
    // make the browser refetch the list and discard the rendered cards.
    return this.httpClient.get<UserDetailsObject[]>(url, {
      params,
    });
  }

  getLatestOffersAnonymous(): Observable<UserDetailsObject[]> {
    const url = `${environment.baseUrl}/api/list/latestOffers`;
    return this.httpClient.get<UserDetailsObject[]>(url);
  }

  getMembersCount(): Observable<{ count: number | null }> {
    const url = `${environment.baseUrl}/api/list/members-count`;
    return this.httpClient.get<{ count: number | null }>(url, {
      withCredentials: true,
    });
  }

  getLatestUsers(type: UserType) {
    const url = `${environment.baseUrl}/api/list/latestUsers`;
    const params = new HttpParams().set('type', type);

    return this.httpClient.get<UserDetailsObject[]>(url, {
      params,
      withCredentials: true,
    });
  }

  likeProfile(likedUid: string): Observable<ProfileLikeResult> {
    const url = `${environment.baseUrl}/api/likes`;
    return this.httpClient.post<ProfileLikeResult>(
      url,
      { likedUid },
      { withCredentials: true },
    );
  }

  unlikeProfile(likedUid: string): Observable<ProfileLikeResult> {
    const url = `${environment.baseUrl}/api/likes/${encodeURIComponent(likedUid)}`;
    return this.httpClient.delete<ProfileLikeResult>(url, {
      withCredentials: true,
    });
  }

  getActivity(): Observable<ActivityFeed> {
    const url = `${environment.baseUrl}/api/activity`;
    return this.httpClient.get<ActivityFeed>(url, { withCredentials: true });
  }

  visitProfile(visitedUid: string): Observable<ProfileVisitResult> {
    const url = `${environment.baseUrl}/api/visits`;
    return this.httpClient.post<ProfileVisitResult>(
      url,
      { visitedUid },
      { withCredentials: true },
    );
  }

  createInbox(inbox: any): Observable<any> {
    const url = `${environment.baseUrl}/api/chat/createInbox`;
    return this.httpClient.post<any>(url, inbox, {
      withCredentials: true,
    });
  }

  resetUnread(conversationId: any): Observable<any> {
    const url = `${environment.baseUrl}/api/chat/resetUnread`;
    return this.httpClient.post<any>(
      url,
      { conversationId },
      {
        withCredentials: true,
      },
    );
  }
}
