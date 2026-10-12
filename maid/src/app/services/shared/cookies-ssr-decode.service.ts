import { Injectable, REQUEST, inject } from '@angular/core';

const decodeCookiePart = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

@Injectable({
  providedIn: 'root',
})
// Reads cookies from the incoming request during server-side rendering.
export class CookiesSSRDecoderService {
  private request = inject(REQUEST, { optional: true });

  getCookie(name: string): string {
    const cookieHeader = this.request?.headers.get('cookie');
    if (!cookieHeader) {
      return '';
    }

    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) {
        continue;
      }
      const key = decodeCookiePart(part.slice(0, separator).trim());
      if (key !== name) {
        continue;
      }
      return decodeCookiePart(part.slice(separator + 1).trim());
    }

    return '';
  }

  getCookies() {
    return this.request?.headers.get('cookie') ?? '';
  }
}
