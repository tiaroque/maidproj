import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClusterAccount } from './multi-account.service';

export type LinkFlagSource = 'profile' | 'chat';

export interface LinkFlag {
  source: LinkFlagSource;
  field: string;
  excerpt: string;
  links: string[];
  count: number;
  lastSeenAt: string;
}

export interface FlaggedUser {
  uid: string;
  lastSeenAt: string;
  account: ClusterAccount;
  flags: LinkFlag[];
}

@Injectable({
  providedIn: 'root',
})
export class LinkFlagService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/moderation`;

  flaggedUsers(): Observable<FlaggedUser[]> {
    return this.httpClient.get<FlaggedUser[]>(`${this.baseUrl}/link-flags`, {
      withCredentials: true,
    });
  }

  dismiss(uid: string): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}/link-flags/${encodeURIComponent(uid)}/dismiss`,
      {},
      { withCredentials: true },
    );
  }
}
