import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ClusterSignal = 'device' | 'fingerprint';

export interface ClusterAccount {
  uid: string;
  email: string;
  profileName?: string;
  userType?: string;
  verified?: boolean;
  emailVerified?: boolean;
  deleted?: boolean;
  removedByModerator?: boolean;
  deletedAt?: string;
  creationDate?: string;
}

export interface MultiAccountCluster {
  signal: ClusterSignal;
  key: string;
  lastSeenAt: string;
  /** An active account was created after a moderator removed one in this group. */
  returning: boolean;
  accounts: ClusterAccount[];
}

@Injectable({
  providedIn: 'root',
})
export class MultiAccountService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/moderation`;

  clusters(signal: ClusterSignal): Observable<MultiAccountCluster[]> {
    return this.httpClient.get<MultiAccountCluster[]>(
      `${this.baseUrl}/multi-accounts`,
      { params: { signal }, withCredentials: true },
    );
  }

  dismiss(cluster: MultiAccountCluster): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}/multi-accounts/dismiss`,
      {
        signal: cluster.signal,
        key: cluster.key,
        uids: cluster.accounts.map((account) => account.uid),
      },
      { withCredentials: true },
    );
  }

  remove(uid: string, reason: string): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}/users/${encodeURIComponent(uid)}/remove`,
      { reason },
      { withCredentials: true },
    );
  }
}
