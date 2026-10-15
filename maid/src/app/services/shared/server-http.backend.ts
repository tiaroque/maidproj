import {
  FetchBackend,
  HttpBackend,
  HttpEvent,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, REQUEST, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isApiRequest } from '../../utils/api-url';
import { CookiesSSRDecoderService } from './cookies-ssr-decode.service';

// SSR fetch of a relative URL uses the public host from the incoming request.
// The container cannot call that address back, so translations stall for the
// TCP timeout. Loopback hits this same Node process, which already serves
// /assets and proxies /api.
const toLoopbackUrl = (url: string, request: Request | null) => {
  let requestUrl: URL | undefined;
  try {
    requestUrl = request?.url ? new URL(request.url) : undefined;
  } catch {
    requestUrl = undefined;
  }

  // ng serve listens on localhost:4102, and only on IPv6. 127.0.0.1:4000
  // refuses the connection (status 0). Production listens on 0.0.0.0:PORT.
  const port =
    requestUrl?.port ||
    (environment.production ? process.env['PORT'] || '4000' : '4102');
  const host = environment.production ? '127.0.0.1' : 'localhost';
  const loopback = `http://${host}:${port}`;

  if (url.startsWith('/') && !url.startsWith('//')) {
    return `${loopback}${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!requestUrl || parsed.hostname !== requestUrl.hostname) {
      return url;
    }
    return `${loopback}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
};

// Rewriting to loopback and forwarding the visitor's cookies happen here rather
// than in an interceptor because Angular runs application interceptors *before*
// its own transfer-cache interceptor. From an interceptor, both changes are
// already baked into the request the cache sees, which then refuses to store it
// (cookie header) under a key the browser could match (loopback origin). The
// browser would refetch every SSR request during hydration.
@Injectable()
export class ServerHttpBackend implements HttpBackend {
  private readonly fetchBackend = inject(FetchBackend);
  private readonly cookies = inject(CookiesSSRDecoderService);
  private readonly request = inject(REQUEST, { optional: true });

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    let serverReq = req;

    const cookieHeader = this.cookies.getCookies();
    if (cookieHeader && isApiRequest(req.url)) {
      serverReq = serverReq.clone({ setHeaders: { Cookie: cookieHeader } });
    }

    const url = toLoopbackUrl(req.url, this.request);
    if (url !== req.url) {
      serverReq = serverReq.clone({ url });
    }

    return this.fetchBackend.handle(serverReq);
  }
}
