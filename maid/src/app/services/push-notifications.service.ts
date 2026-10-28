import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type PushKind = 'chat' | 'likes' | 'visits';
export type PushPrefs = Record<PushKind, boolean>;

export type PushState = 'unsupported' | 'denied' | 'disabled' | 'enabled';

const WORKER_URL = '/sw-push.js';

const urlBase64ToUint8Array = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = `${environment.baseUrl}/api/push`;

  readonly state = signal<PushState>('disabled');

  isSupported() {
    return (
      this.isBrowser &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async refreshState() {
    if (!this.isSupported()) {
      this.state.set('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      this.state.set('denied');
      return;
    }
    const subscription = await this.currentSubscription();
    this.state.set(
      subscription && Notification.permission === 'granted'
        ? 'enabled'
        : 'disabled',
    );
  }

  // Must run from a user gesture, or browsers refuse the permission prompt.
  async enable(): Promise<boolean> {
    if (!this.isSupported()) {
      this.state.set('unsupported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      this.state.set(permission === 'denied' ? 'denied' : 'disabled');
      return false;
    }

    await this.subscribe();
    this.state.set('enabled');
    return true;
  }

  async disable() {
    const subscription = await this.currentSubscription();
    if (subscription) {
      await firstValueFrom(
        this.http.post<void>(
          `${this.baseUrl}/unsubscribe`,
          { endpoint: subscription.endpoint },
          { withCredentials: true },
        ),
      ).catch(() => undefined);
      await subscription.unsubscribe();
    }
    await this.refreshState();
  }

  // Subscriptions can be rotated by the browser, so a granted one is re-sent
  // whenever the signed-in area loads.
  async resync() {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      await this.refreshState();
      return;
    }
    try {
      if (await this.currentSubscription()) {
        await this.subscribe();
      }
    } catch (error) {
      console.error('Push re-sync failed', error);
    }
    await this.refreshState();
  }

  // Unsubscribes this browser and returns the endpoint, so the logout request
  // can remove it while the session is still valid.
  async detachForLogout(): Promise<string | undefined> {
    const subscription = await this.currentSubscription().catch(
      () => undefined,
    );
    if (!subscription) {
      return undefined;
    }
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => undefined);
    this.state.set('disabled');
    return endpoint;
  }

  getPrefs() {
    return this.http.get<PushPrefs>(`${this.baseUrl}/prefs`, {
      withCredentials: true,
    });
  }

  updatePrefs(prefs: Partial<PushPrefs>) {
    return this.http.put<PushPrefs>(`${this.baseUrl}/prefs`, prefs, {
      withCredentials: true,
    });
  }

  private async registration() {
    return navigator.serviceWorker.register(WORKER_URL, { scope: '/' });
  }

  private async currentSubscription() {
    if (!this.isSupported()) {
      return null;
    }
    const registration =
      await navigator.serviceWorker.getRegistration(WORKER_URL);
    return (await registration?.pushManager.getSubscription()) ?? null;
  }

  private async subscribe() {
    const registration = await this.registration();
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { publicKey } = await firstValueFrom(
        this.http.get<{ publicKey: string }>(
          `${this.baseUrl}/vapid-public-key`,
        ),
      );
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = subscription.toJSON();
    await firstValueFrom(
      this.http.post<void>(
        `${this.baseUrl}/subscribe`,
        { endpoint: json.endpoint, keys: json.keys },
        { withCredentials: true },
      ),
    );
  }
}
