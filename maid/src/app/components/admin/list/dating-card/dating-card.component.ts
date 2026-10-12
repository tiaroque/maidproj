import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { S3UrlPipe } from '../../../../utils/s3-url';
import { Router, RouterLink } from '@angular/router';
import { SliceDescriptionPipe } from '../../../../utils/pipes/sliceDescription.pipe';
import { UserDetailsObject } from '../../../../services/admin/interfaces/user.interface';
import {
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';
import { ListService } from '../../../../services/admin/list.service';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { avatarSrc } from '../../../../utils/avatar';
import { currencyForCountry } from '../../../../services/admin/interfaces/service-catalog';
import { VerifiedBadgeComponent } from '../../../../shared/verified-badge/verified-badge.component';

@Component({
  selector: 'app-dating-card',
  imports: [
    RouterLink,
    SliceDescriptionPipe,
    TranslatePipe,
    S3UrlPipe,
    NgOptimizedImage,
    NgTemplateOutlet,
    VerifiedBadgeComponent,
  ],
  templateUrl: './dating-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex w-full min-w-0 flex-1 flex-col' },
})
export class DatingCardComponent {
  userDating = input.required<UserDetailsObject>();
  isAnonymous = input.required<boolean>();
  imagePriority = input(false);
  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  listService = inject(ListService);
  private readonly injector = inject(Injector);
  router = inject(Router);
  public lang = this.languageService.defaultLang;
  private destroyRef = inject(DestroyRef);
  liked = linkedSignal(() => this.userDating().likedByMe === true);
  likePending = signal(false);
  visited = computed(() => this.userDating().visitedByMe === true);

  avatarSrc = computed(() => {
    const user = this.userDating().user;
    return avatarSrc(user.uid, user.avatar);
  });

  services = computed(() => this.userDating().user.services ?? []);

  rateLabel = computed(() => {
    const user = this.userDating().user;
    if (user.hourlyRate == null) {
      return '';
    }
    const currency = user.currency || currencyForCountry(user.country);
    return `${user.hourlyRate} ${currency}/h`;
  });

  featuredOffer = computed(() => {
    const user = this.userDating().user;
    return user.offer?.offer || user.offers?.[0]?.offer || '';
  });

  profileLink = computed(() => {
    if (this.isAnonymous()) {
      return ['/', this.lang(), 'profile-view', this.userDating().user.uid];
    } else {
      return [
        '/',
        this.lang(),
        'admin',
        'profile-view',
        this.userDating().user.uid,
      ];
    }
  });

  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.isAnonymous() || this.likePending()) {
      return;
    }

    const next = !this.liked();
    const uid = this.userDating().user.uid;
    this.liked.set(next);
    this.likePending.set(true);

    const request = next
      ? this.listService.likeProfile(uid)
      : this.listService.unlikeProfile(uid);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.likePending.set(false),
      error: () => {
        this.liked.set(!next);
        this.likePending.set(false);
        const close = this.translateService.instant('buttonClose') as string;
        const message = this.translateService.instant('likeFailed') as string;
        this.alert(message, close);
      },
    });
  }

  // UtilsService pulls in the snackbar, CDK overlay and date-fns locales.
  // The card is on the landing page, so they are only loaded for an error.
  private async alert(message: string, close: string) {
    const { UtilsService } = await import('../../../../services/utils.service');
    this.injector.get(UtilsService).alert(message, close);
  }

  openChat(userTo: UserDetailsObject) {
    const close = this.translateService.instant('buttonClose') as string;
    const userUnavaliable = this.translateService.instant('userUnavaliable');

    this.listService
      .createInbox({
        userIdTo: userTo.user.uid,
        userToName: userTo.user.name,
      })
      .subscribe({
        next: () => {
          this.router.navigate([this.lang(), 'admin', 'chat'], {
            queryParams: {
              uid: userTo.user.uid,
            },
          });
        },
        error: () => {
          this.alert(userUnavaliable, close);
        },
      });
  }
}
