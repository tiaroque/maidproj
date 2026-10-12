import { AsyncPipe, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ListService } from '../../../services/admin/list.service';
import { ChatStore } from '../../../services/admin/signals/store';
import { userTypes } from '../../../services/user.service';
import { UserDetailsObject } from '../../../services/admin/interfaces/user.interface';
import { Observable } from 'rxjs';
import { S3UrlPipe } from '../../../utils/s3-url';
import { TranslatePipe } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { SliceDescriptionPipe } from '../../../utils/pipes/sliceDescription.pipe';
import { ThemeService } from '../../../services/theme.service';
import { LanguageService } from '../../../services/shared/language-service.service';
import { ProfileAvatarComponent } from '../../../shared/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-right-content',
  imports: [
    NgOptimizedImage,
    AsyncPipe,
    ProfileAvatarComponent,
    TranslatePipe,
    S3UrlPipe,
    SliceDescriptionPipe,
    RouterLink,
  ],
  templateUrl: './right-content.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class RightContentComponent implements OnInit {
  public readonly listService = inject(ListService);
  storeChat = inject(ChatStore);
  router = inject(Router);
  readonly platformId = inject(PLATFORM_ID);
  readonly themeService = inject(ThemeService);
  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;

  usersList$: Observable<UserDetailsObject[]>;

  ngOnInit(): void {
    const me = this.storeChat.me();

    const userType = me.user.userType;

    const opositeUsersTypes = userTypes.filter((type) => type !== userType);
    const opositeUserType = opositeUsersTypes[0];

    this.usersList$ = this.listService.getLatestUsers(opositeUserType);

    if (isPlatformBrowser(this.platformId)) {
      this.themeService.isDarkTheme.subscribe((value) => {
        if (value) {
          document.documentElement.classList.add('cc--darkmode');
        } else {
          document.documentElement.classList.remove('cc--darkmode');
        }
      });
    }
  }

  viewAllNew() {
    if (this.router.url.includes('/admin/list')) {
      if (isPlatformBrowser(this.platformId)) {
        document.getElementById('discovery-grid')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
      return;
    }

    this.router.navigate([this.lang(), 'admin', 'list']);
  }

  openCookiePrefs() {
    import('vanilla-cookieconsent').then((cc) => cc.showPreferences());
  }
}
