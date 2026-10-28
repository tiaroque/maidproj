import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';

import { environment } from '../../environments/environment';
import {
  UserModel,
  UserDetailsObject,
} from './admin/interfaces/user.interface';
import { CheckAuth } from './admin/signals/user.feature';
import { DeviceFingerprintService } from './device-fingerprint.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private deviceFingerprint = inject(DeviceFingerprintService);

  public isNavigated = false;

  startGoogleLogin(lang: string) {
    const params = new URLSearchParams({ lang: lang || 'en' });
    window.location.assign(
      `${environment.baseUrl}/api/users/google/start?${params.toString()}`,
    );
  }

  startFacebookLogin(lang: string) {
    const params = new URLSearchParams({ lang: lang || 'en' });
    window.location.assign(
      `${environment.baseUrl}/api/users/facebook/start?${params.toString()}`,
    );
  }

  sessionLogin(email: string, password: string, captcha = '') {
    const url = `${environment.baseUrl}/api/users/login`;
    return this.http.post<any>(
      url,
      { email, password, captcha },
      {
        withCredentials: true,
      },
    );
  }

  requestPasswordReset(email: string, lang: string, captcha: string) {
    const url = `${environment.baseUrl}/api/users/request-password-reset`;
    return this.http.post<any>(
      url,
      { email, lang, captcha },
      {
        withCredentials: true,
      },
    );
  }

  resetPassword(token: string, password: string, captcha: string) {
    const url = `${environment.baseUrl}/api/users/reset-password`;
    return this.http.post<any>(
      url,
      { token, password, captcha },
      {
        withCredentials: true,
      },
    );
  }

  sessionLogout(pushEndpoint?: string) {
    const url = `${environment.baseUrl}/api/users/sessionLogout`;
    return this.http.post<any>(
      url,
      pushEndpoint ? { pushEndpoint } : {},
      {
        withCredentials: true,
      },
    );
  }

  deleteAccount() {
    const url = `${environment.baseUrl}/api/users/me`;
    return this.http.delete<void>(url, { withCredentials: true });
  }

  checkAuth() {
    const url = `${environment.baseUrl}/api/users/check-auth`;
    return this.http.get<CheckAuth>(url, {
      withCredentials: true,
    });
  }

  getUser() {
    const url = `${environment.baseUrl}/api/users/me`;
    return this.http.get<UserDetailsObject>(url, {
      withCredentials: true,
    });
  }

  createUser(user: UserModel, lang: string, captcha: string) {
    const url = `${environment.baseUrl}/api/users/create-user`;
    return from(this.deviceFingerprint.get()).pipe(
      switchMap((fp) =>
        this.http.post<any>(
          url,
          { ...user, lang, captcha, fp },
          {
            withCredentials: true,
          },
        ),
      ),
    );
  }

  verifyEmail(token: string) {
    const url = `${environment.baseUrl}/api/users/verify-email`;
    return this.http.post<any>(url, { token }, { withCredentials: true });
  }

  resendVerificationEmail(email: string, lang: string) {
    const url = `${environment.baseUrl}/api/users/resend-verification-email`;
    return this.http.post<any>(
      url,
      { email, lang },
      {
        withCredentials: true,
      },
    );
  }

  passkeyRegisterOptions() {
    const url = `${environment.baseUrl}/api/users/passkeys/register/options`;
    return this.http.post<{
      challengeId: string;
      options: PublicKeyCredentialCreationOptionsJSON;
    }>(url, {}, { withCredentials: true });
  }

  passkeyRegisterVerify(
    challengeId: string,
    response: RegistrationResponseJSON,
  ) {
    const url = `${environment.baseUrl}/api/users/passkeys/register/verify`;
    return this.http.post<void>(
      url,
      { challengeId, response },
      { withCredentials: true },
    );
  }

  passkeyLoginOptions() {
    const url = `${environment.baseUrl}/api/users/passkeys/login/options`;
    return this.http.post<{
      challengeId: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>(url, {}, { withCredentials: true });
  }

  passkeyLoginVerify(
    challengeId: string,
    response: AuthenticationResponseJSON,
  ) {
    const url = `${environment.baseUrl}/api/users/passkeys/login/verify`;
    return this.http.post<void>(
      url,
      { challengeId, response },
      { withCredentials: true },
    );
  }

  listPasskeys() {
    const url = `${environment.baseUrl}/api/users/passkeys`;
    return this.http.get<PasskeySummary[]>(url, { withCredentials: true });
  }

  deletePasskey(credentialId: string) {
    const url = `${environment.baseUrl}/api/users/passkeys/${encodeURIComponent(credentialId)}`;
    return this.http.delete<void>(url, { withCredentials: true });
  }
}

export type PasskeySummary = {
  credentialId: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
};
