import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MailAudience = 'one' | 'all' | 'cleaners' | 'clients';

export interface MailPreview {
  count: number;
  name?: string;
  email?: string;
}

export interface MailSendResult {
  sent: number;
  failed: number;
  total: number;
}

export interface MailDraft {
  audience: MailAudience;
  email?: string;
  subject: string;
  message: string;
  cta?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminMailService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/admin/mail`;

  preview(audience: MailAudience, email?: string): Observable<MailPreview> {
    let params = new HttpParams().set('audience', audience);
    if (audience === 'one' && email) {
      params = params.set('email', email);
    }
    return this.httpClient.get<MailPreview>(`${this.baseUrl}/preview`, {
      params,
      withCredentials: true,
    });
  }

  send(draft: MailDraft): Observable<MailSendResult> {
    return this.httpClient.post<MailSendResult>(this.baseUrl, draft, {
      withCredentials: true,
    });
  }
}
