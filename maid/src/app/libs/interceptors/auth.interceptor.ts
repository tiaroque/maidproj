// import { Injectable } from '@angular/core';
// import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { tap } from 'rxjs/operators';
// import { Router } from '@angular/router';
// import { LocalstorageService } from '../../utils/localstorage.service';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//   constructor(private router: Router,
//     private localstorage: LocalstorageService,) { }

//   intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

//     console.log('Running interceptor');
//     const idToken = this.localstorage.getItem('id_token');

//     if (idToken) {
//       const cloned = request.clone({
//         headers: request.headers.set('Authorization', 'Bearer ' + idToken),
//       });

//       return next.handle(cloned).pipe(
//         tap(
//           () => { },
//           (err: any) => {
//             if (err instanceof HttpErrorResponse) {
//               if (err.status !== 401) {
//                 return;
//               }
//               this.localstorage.removeItem('id_token');
//               this.router.navigate(['home']);
//             }
//           }
//         )
//       );
//     } else {
//       return next.handle(request);
//     }
//   }
// }
