import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// Traits that stay put across browser updates, zoom and monitor changes, so
// the same browser keeps producing the same hash.
const collectTraits = () => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return [
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.languages?.join(',') ?? nav.language,
    nav.platform,
    nav.hardwareConcurrency,
    nav.deviceMemory ?? '',
    nav.maxTouchPoints,
    screen.colorDepth,
    canvasTrait(),
    webglTrait(),
  ].join('|');
};

const canvasTrait = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Sugrit, fingerprint \u{1F36C}', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Sugrit, fingerprint \u{1F36C}', 4, 17);
    return canvas.toDataURL();
  } catch {
    return '';
  }
};

const webglTrait = () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) {
      return '';
    }
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info
      ? `${gl.getParameter(info.UNMASKED_VENDOR_WEBGL)}~${gl.getParameter(info.UNMASKED_RENDERER_WEBGL)}`
      : `${gl.getParameter(gl.VENDOR)}~${gl.getParameter(gl.RENDERER)}`;
  } catch {
    return '';
  }
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
};

@Injectable({ providedIn: 'root' })
export class DeviceFingerprintService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private fingerprint?: Promise<string | null>;
  private reported = false;

  get(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId) || !globalThis.crypto?.subtle) {
      return Promise.resolve(null);
    }
    return (this.fingerprint ??= sha256Hex(collectTraits()).catch(() => null));
  }

  /** Links the signed-in account to this browser, once per page load. */
  async report() {
    if (this.reported || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.reported = true;
    const fp = await this.get();
    this.http
      .post<void>(
        `${environment.baseUrl}/api/users/device`,
        { fp },
        { withCredentials: true },
      )
      .subscribe({ error: () => (this.reported = false) });
  }
}
