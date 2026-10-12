import { Injectable, Inject, Optional } from '@angular/core';
import {
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { Request } from 'express';

// case insensitive check against config and value
const startsWithAny =
  (arr: string[] = []) =>
  (value = '') => {
    return arr.some((test) =>
      value.toLowerCase().startsWith(test.toLowerCase())
    );
  };

// http, https, protocol relative
const isAbsoluteURL = startsWithAny(['http', '//']);

// export const relativePathInterceptor: HttpInterceptorFn = (req, next) => {
//   const request = inject<Request>(REQUEST);

//   if (request && !isAbsoluteURL(req.url)) {
//     console.log("Entrei no absolute")
//     const protocolHost = `${request.protocol}://${request.get(
//       'host'
//     )}`;
//     const pathSeparator = !req.url.startsWith('/') ? '/' : '';
//     const url = protocolHost + pathSeparator + req.url;
//     const serverRequest = req.clone({ url });
//     return next(serverRequest);
//   } else {
//     console.log("Entrei no relative")
//     return next(req);
//   }
// };

@Injectable()
export class UniversalRelativeInterceptor implements HttpInterceptor {
  constructor(@Optional() @Inject('REQUEST') protected request: Request) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    console.log('URL: ', req.url);

    if (this.request && !isAbsoluteURL(req.url)) {
      console.log('Entrei no absolute');
      const protocolHost = `${this.request.protocol}://${this.request.get(
        'host'
      )}`;
      const pathSeparator = !req.url.startsWith('/') ? '/' : '';
      const url = protocolHost + pathSeparator + req.url;
      const serverRequest = req.clone({ url });
      return next.handle(serverRequest);
    } else {
      console.log('Entrei no relative');
      return next.handle(req);
    }
  }
}
