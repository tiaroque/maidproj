import { inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ChatStore } from '../services/admin/signals/store';

export const addMeResolver = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const storeChat = inject(ChatStore);
  return authService.getUser().pipe(tap((user) => storeChat.addMeUser(user)));
};
