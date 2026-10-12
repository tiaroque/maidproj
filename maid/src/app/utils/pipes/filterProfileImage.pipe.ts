import { Pipe, PipeTransform } from '@angular/core';
import { UserModel } from '../../services/admin/interfaces/user.interface';
@Pipe({
  name: 'featuredItemsImpure',
  pure: false,
  standalone: true,
})
export class FilterProfileImage implements PipeTransform {
  transform(user: UserModel): UserModel {
    // let msg = `My custom transformation of ${value}.`;
    // if (format === 'uppercase') {
    //   return msg.toUpperCase();
    // } else {
    //   return msg;
    // }
    return user;
  }
}
