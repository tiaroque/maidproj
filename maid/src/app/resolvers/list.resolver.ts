// import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
// import { userTypes } from '../services/user.service';
// import { AssetsService } from '../services/admin/assets.service';
// import { inject } from '@angular/core';
// import { UserDetailsObject } from '../services/admin/interfaces/user.interface';
// import { ListService } from '../services/admin/list.service';
// import { delay, map } from 'rxjs';

// export const listResolver = (
//   route: ActivatedRouteSnapshot,
//   state: RouterStateSnapshot,
// ) => {
//   const listService = inject(ListService);

//   const userProfile = route.parent?.data['userProfile'] as UserDetailsObject;

//   const opositeUsersTypes = userTypes.filter(
//     (type) => type !== userProfile.user.claims!.user,
//   );

//   return listService.getList(opositeUsersTypes[0], []).pipe(
//     // delay(6000),
//     map((users) => {
//       const array = [];
//       for (let index = 0; index < 41; index++) {
//         array.push(...users);
//       }
//       return array;
//     }),
//   );
// };
