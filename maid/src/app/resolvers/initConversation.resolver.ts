// import { inject } from '@angular/core';
// import { ActivatedRouteSnapshot } from '@angular/router';

// import { ChatStore } from '../services/admin/signals/store';
// import { AuthService } from '../services/auth.service';

// export const initConversationResolver = (route: ActivatedRouteSnapshot) => {
//   const authService = inject(AuthService);
//   const storeChat = inject(ChatStore);

//   const userToId = route.params['uid'];

//   if (userToId) {
//     return storeChat.getChatConversation(userToId, authService.isNavigated);
//   }

//   return storeChat.getEmptyChatConversation();
// };
