import {
  Component,
  computed,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UserModel } from '../../services/admin/interfaces/user.interface';
import { avatarSrc } from '../../utils/avatar';

@Component({
  selector: 'app-profile-avatar',
  imports: [],
  templateUrl: './profile-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
})
export class ProfileAvatarComponent {
  user = input<Partial<UserModel>>();
  avatarSrc = computed(() => {
    const user = this.user();
    return avatarSrc(user?.uid, user?.avatar);
  });
  // widthHeight = input('w-10 h-10');

  // constructor() {
  //   effect((t) => {
  //     let v = this.user();
  //     debugger;
  //   });
  // }
}
