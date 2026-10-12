import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type VerificationStatusValue = 'none' | 'pending' | 'approved' | 'rejected';

export interface VerificationStatus {
  status: VerificationStatusValue;
  verified: boolean;
  hasProfilePhoto: boolean;
  rejectReason?: string;
  isModerator: boolean;
}

export interface VerificationQueueItem {
  id: string;
  uid: string;
  challengeId: string;
  photoKey: string;
  createdAt: string;
  selfieUrl: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/verification`;

  // Last status fetched for the signed-in user, shared by the photos page and the global banner.
  readonly current = signal<VerificationStatus | null>(null);

  status(): Observable<VerificationStatus> {
    return this.httpClient
      .get<VerificationStatus>(`${this.baseUrl}/status`, {
        withCredentials: true,
      })
      .pipe(tap((status) => this.current.set(status)));
  }

  challenge(): Observable<{ challengeId: string }> {
    return this.httpClient.post<{ challengeId: string }>(
      `${this.baseUrl}/challenge`,
      {},
      { withCredentials: true },
    );
  }

  submit(file: File): Observable<{ status: VerificationStatusValue }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<{ status: VerificationStatusValue }>(
      `${this.baseUrl}/submit`,
      formData,
      { withCredentials: true },
    );
  }

  queue(): Observable<VerificationQueueItem[]> {
    return this.httpClient.get<VerificationQueueItem[]>(`${this.baseUrl}/queue`, {
      withCredentials: true,
    });
  }

  approve(id: string): Observable<{ verified: boolean }> {
    return this.httpClient.post<{ verified: boolean }>(
      `${this.baseUrl}/${id}/approve`,
      {},
      { withCredentials: true },
    );
  }

  reject(id: string, reason: string): Observable<{ status: string }> {
    return this.httpClient.post<{ status: string }>(
      `${this.baseUrl}/${id}/reject`,
      { reason },
      { withCredentials: true },
    );
  }
}
