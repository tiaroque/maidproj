import {
  Component,
  computed,
  inject,
  input,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Observable } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { SlicePipe, NgOptimizedImage } from '@angular/common';
import { s3Url } from '../../../utils/s3-url';
import {
  UserModel,
  UserDetailsObject,
  UserType,
} from '../../../services/admin/interfaces/user.interface';
import { ChatStore } from '../../../services/admin/signals/store';
import { ProfileAvatarComponent } from '../../../shared/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-profile-icon',
  templateUrl: './profile-icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    NgOptimizedImage,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    ProfileAvatarComponent,
    SlicePipe,
  ],
})
export class ProfileIconComponent implements OnInit {
  formatName = input<boolean>(true);

  isDarkTheme: Observable<boolean>;
  @Input() userProfile: UserDetailsObject;
  user: UserModel;
  // profilePicUrl: string | null;
  name: string;
  userId: string;
  userType: UserType = 'Client';
  readonly storeChat = inject(ChatStore);

  readonly profilePhotoLocation = computed(() => {
    const user = this.storeChat.me();
    const profileImg = user.user?.images?.find(
      (image) => image.isProfile,
    )?.keyRezised;

    return profileImg ? s3Url(profileImg) : null;
  });

  ngOnInit(): void {
    const userProfile: UserDetailsObject = this.storeChat.me();

    this.user = userProfile.user;
    this.name = userProfile.user?.name;
    this.userId = userProfile.user?.uid;
  }
}
