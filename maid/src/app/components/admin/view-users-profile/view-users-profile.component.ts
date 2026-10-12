import {
  Component,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UserDetailsObject } from '../../../services/admin/interfaces/user.interface';
import { ImageViewerService } from '../../../services/admin/image-viewer.service';
import { ProfileViewComponent } from '../../../shared/profile-view/profile-view.component';
import { LanguageLinksComponent } from '../../../shared/language-links/language-links.component';

@Component({
  selector: 'app-view-users-profile',
  imports: [ProfileViewComponent, LanguageLinksComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-users-profile.component.html',
})
export class ViewUsersProfileComponent {
  imageViewerService = inject(ImageViewerService);
  userProfileDetails = input.required<UserDetailsObject>();
}
