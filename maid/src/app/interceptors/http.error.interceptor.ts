import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { UserService } from "../services/user.service";
import { tap } from "rxjs";

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const userService = inject(UserService);
  return next(req).pipe(
    tap({
      error: error => {
        console.log(userService);
      },
    })
  );
};
