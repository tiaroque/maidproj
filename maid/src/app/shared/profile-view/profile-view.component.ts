import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage, TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';
import {
  Photo,
  UserDetailsObject,
  UserModel,
} from '../../services/admin/interfaces/user.interface';
import { S3UrlPipe } from '../../utils/s3-url';
import { ChatStore } from '../../services/admin/signals/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UtilsService } from '../../services/utils.service';
import { Router, RouterLink } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import {
  currencyForCountry,
  DayKey,
  DAYS,
  SERVICE_ICONS,
  SlotKey,
  SLOTS,
  slotsForDay,
} from '../../services/admin/interfaces/service-catalog';
import { ImageViewerService } from '../../services/admin/image-viewer.service';
import { LanguageService } from '../../services/shared/language-service.service';
import { ListService } from '../../services/admin/list.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

export type UserProfileModel = UserModel & { locationName: string } & {
  countryName: string;
} & { languagesNames: string[] };

export interface ProfileFact {
  labelKey: string;
  value: string;
  group: 'work' | 'schedule';
}

export interface ProfileNextStep {
  labelKey: string;
  link: string[];
}

export interface ProfilePhotoSlot {
  index: number;
  photo: Photo | null;
}

@Component({
  selector: 'app-profile-view',
  imports: [
    ProfileAvatarComponent,
    TranslatePipe,
    S3UrlPipe,
    NgOptimizedImage,
    TitleCasePipe,
    MatButtonModule,
    MatIcon,
    RouterLink,
    VerifiedBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-view.component.html',
  host: { class: 'block' },
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  storeChat = inject(ChatStore);
  utilsService = inject(UtilsService);
  languageService = inject(LanguageService);
  translateService = inject(TranslateService);
  imageViewerService = inject(ImageViewerService);
  listService = inject(ListService);
  router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private recordedVisitUid = '';

  userProfileDetails = input.required<UserDetailsObject>();
  isAnonymous = input(false);
  sub: Subscription = new Subscription();
  lang = this.languageService.defaultLang;

  readonly user = computed<UserProfileModel>(() => {
    const user = this.userProfileDetails().user;
    const countries = this.storeChat.nationalityEntities();
    const country = countries.find((item) => item.value === user.country);
    const languages = this.languageService.getLanguagesMenu();
    const userLanguages = languages
      .filter((lang) => user.languages?.includes(lang.value))
      .map((item) => item.name);

    return {
      ...user,
      locationName: user.locationName ?? '',
      countryName: country?.name || '',
      languagesNames: userLanguages,
    };
  });

  readonly maxPhotos = 5;
  readonly maxBioChars = 500;
  readonly serviceIcons = SERVICE_ICONS;
  readonly allDays = DAYS;
  readonly allSlots = SLOTS;

  readonly listPhotos = computed(() => this.user().images ?? []);

  readonly photoSlots = computed<ProfilePhotoSlot[]>(() => {
    const photos = this.listPhotos();
    return Array.from({ length: this.maxPhotos }, (_, index) => ({
      index,
      photo: photos[index] ?? null,
    }));
  });

  // The public page uses the same layout as the signed-in profile. Owner-only
  // prompts (edit links, next steps) stay behind isOwnProfile.
  readonly showProgress = computed(() => true);

  readonly visiblePhotoSlots = computed(() => this.photoSlots());

  readonly photosRemaining = computed(
    () => Math.max(0, this.maxPhotos - this.listPhotos().length),
  );

  readonly offerItems = computed(() => {
    const offers = this.user().offers;
    if (offers?.length) {
      return offers.map((item) => item.offer).filter(Boolean);
    }
    return this.user().offer?.offer ? [this.user().offer!.offer] : [];
  });

  readonly isCleaner = computed(() => this.user().userType === 'Cleaner');

  readonly memberTypeKey = computed(() => {
    const type = this.user().userType;
    if (type === 'Cleaner') {
      return 'profileView.roleCleaner';
    }
    if (type === 'Client') {
      return 'profileView.roleClient';
    }
    return '';
  });

  readonly postsLabelKey = computed(() =>
    this.isCleaner() ? 'posts.cleanerTitle' : 'posts.clientTitle',
  );

  readonly services = computed(() => this.user().services ?? []);
  readonly areas = computed(() => this.user().areasCovered ?? []);
  readonly availability = computed(() => this.user().availability ?? []);
  readonly hasSlot = (day: DayKey, slot: SlotKey) =>
    slotsForDay(this.availability(), day).includes(slot);

  readonly rateLabel = computed(() => {
    const rate = this.user().hourlyRate;
    if (rate == null) {
      return '';
    }
    const currency = this.user().currency || currencyForCountry(this.user().country);
    const perHour = this.translateService.instant('work.perHour');
    return `${rate} ${currency} ${perHour}`;
  });

  readonly descriptionChars = computed(
    () => this.user().description?.trim().length ?? 0,
  );

  readonly profilePic = computed(() => {
    const userImages = this.listPhotos();
    if (!this.user().avatar && userImages.length > 0) {
      return userImages.find((photo) => photo.isProfile) ?? userImages[0];
    }
    return null;
  });

  readonly isOwnProfile = computed(() => {
    const meUid = this.storeChat.me()?.user?.uid;
    return !!meUid && meUid === this.user().uid;
  });

  readonly facts = computed<ProfileFact[]>(() => {
    const profile = this.user();
    const location = [profile.locationName, profile.country]
      .filter(Boolean)
      .join(', ');

    const t = (key: string) => this.translateService.instant(key) as string;
    const experience =
      profile.experienceYears != null
        ? this.translateService.instant('profileView.yearsCount', {
            count: profile.experienceYears,
          })
        : '';
    const availabilityValue = this.availability()
      .map(
        ({ day, slots }) =>
          `${t('days.' + day)}: ${slots.map((slot) => t('slots.' + slot)).join(', ')}`,
      )
      .join(' · ');

    const facts: ProfileFact[] = [
      { labelKey: 'location', value: location, group: 'work' },
      {
        labelKey: this.isCleaner() ? 'work.hourlyRate' : 'work.budget',
        value: this.rateLabel(),
        group: 'work',
      },
      {
        labelKey: 'languages',
        value: profile.languagesNames.join(', '),
        group: 'work',
      },
      {
        labelKey: this.isCleaner() ? 'work.availableDays' : 'work.preferredDays',
        value: availabilityValue,
        group: 'schedule',
      },
    ];

    if (this.isCleaner()) {
      facts.splice(2, 0, {
        labelKey: 'work.experienceYears',
        value: experience,
        group: 'work',
      });
      facts.push({
        labelKey: 'work.openToRelocate',
        value: t(
          profile.openToRelocate
            ? 'work.openToRelocateYes'
            : 'work.openToRelocateNo',
        ),
        group: 'work',
      });
      facts.push({
        labelKey: 'work.areasCovered',
        value: this.areas()
          .map((area) => area.locationName)
          .join(', '),
        group: 'schedule',
      });
    }

    return facts;
  });

  readonly workFacts = computed(() =>
    this.facts().filter((fact) => fact.group === 'work'),
  );

  readonly scheduleFacts = computed(() =>
    this.facts().filter((fact) => fact.group === 'schedule'),
  );

  readonly factsFilled = computed(
    () => this.facts().filter((fact) => fact.value).length,
  );

  readonly completeness = computed(() => {
    const checks = [
      this.listPhotos().length > 0,
      this.descriptionChars() > 0,
      this.services().length > 0,
      this.offerItems().length > 0,
      ...this.facts().map((fact) => !!fact.value),
    ];
    const filled = checks.filter(Boolean).length;
    const total = checks.length;
    return {
      filled,
      total,
      missing: total - filled,
      percent: total ? Math.round((filled / total) * 100) : 0,
    };
  });

  readonly nextSteps = computed<ProfileNextStep[]>(() => {
    if (!this.isOwnProfile()) {
      return [];
    }
    const lang = this.lang();
    const steps: ProfileNextStep[] = [];
    if (!this.listPhotos().length) {
      steps.push({
        labelKey: 'profileView.addPhotos',
        link: ['/', lang, 'admin', 'upload'],
      });
    }
    if (!this.descriptionChars()) {
      steps.push({
        labelKey: 'profileView.addBio',
        link: ['/', lang, 'admin', 'profile'],
      });
    }
    if (!this.offerItems().length) {
      steps.push({
        labelKey: this.isCleaner()
          ? 'profileView.addAnnouncement'
          : 'profileView.addJobRequest',
        link: ['/', lang, 'admin', 'offer-dreams'],
      });
    }
    if (!this.services().length) {
      steps.push({
        labelKey: 'profileView.addServices',
        link: ['/', lang, 'admin', 'profile'],
      });
    }
    if (this.factsFilled() < this.facts().length) {
      steps.push({
        labelKey: 'profileView.addDetails',
        link: ['/', lang, 'admin', 'profile'],
      });
    }
    return steps.slice(0, 4);
  });

  readonly locationLine = computed(() => {
    const profile = this.user();
    return [profile.locationName, profile.country].filter(Boolean).join(' · ');
  });

  showViewer = signal<{ index: number }>({ index: -1 });

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || this.isAnonymous()) {
        return;
      }

      const profileUid = this.userProfileDetails().user.uid;
      const meUid = this.storeChat.me()?.user?.uid;
      if (!profileUid || !meUid || profileUid === meUid) {
        return;
      }
      if (this.recordedVisitUid === profileUid) {
        return;
      }

      this.recordedVisitUid = profileUid;
      this.listService
        .visitProfile(profileUid)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.storeChat.markProfileVisited(profileUid),
          error: () => {
            if (this.recordedVisitUid === profileUid) {
              this.recordedVisitUid = '';
            }
          },
        });
    });
  }

  async ngOnInit() {
    const lang = this.translateService.currentLang;
    await this.storeChat.loadCountries(lang);

    const sub = this.translateService.onLangChange
      .pipe(switchMap((event) => this.storeChat.loadCountries(event.lang)))
      .subscribe();
    this.sub.add(sub);
  }

  open(photo: Photo, index: number) {
    if (this.isAnonymous()) {
      return;
    }
    this.showViewer.set({ index });
    this.imageViewerService.listPhotos.set(this.listPhotos());
    this.imageViewerService.showViewer.set(this.showViewer());
  }

  openChat() {
    const close = this.translateService.instant('buttonClose') as string;
    const userUnavaliable = this.translateService.instant('userUnavaliable');
    const profile = this.userProfileDetails();

    this.listService
      .createInbox({
        userIdTo: profile.user.uid,
        userToName: profile.user.name,
      })
      .subscribe({
        next: () => {
          this.router.navigate([this.lang(), 'admin', 'chat'], {
            queryParams: { uid: profile.user.uid },
          });
        },
        error: () => {
          this.utilsService.alert(userUnavaliable, close);
        },
      });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
