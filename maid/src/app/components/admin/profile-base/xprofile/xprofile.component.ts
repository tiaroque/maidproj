import {
  afterNextRender,
  Component,
  inject,
  OnInit,
  TemplateRef,
  viewChild,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { UserService } from '../../../../services/user.service';
import { DetailsComponent } from './details/details.component';
import { WorkComponent } from './work/work.component';
import { form } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest, Observable, of, switchMap } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { UtilsService } from '../../../../services/utils.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ThemeService } from '../../../../services/theme.service';
import { AboutComponent } from './about/about.component';
import { BirthdateComponent } from './birthdate/birthdate.component';
import { TitleCasePipe, NgOptimizedImage } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ProfileAvatarComponent } from '../../../../shared/profile-avatar/profile-avatar.component';
import { S3UrlPipe } from '../../../../utils/s3-url';
import { format, parse, subMinutes } from 'date-fns';
import { AuthService } from '../../../../services/auth.service';
import { ChatStore } from '../../../../services/admin/signals/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  defaultProfileForm,
  profileFormSchema,
} from '../../../../forms/profile-form';
import { LanguageService } from '../../../../services/shared/language-service.service';

@Component({
  selector: 'app-xprofile',
  templateUrl: './xprofile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    DetailsComponent,
    WorkComponent,
    AboutComponent,
    BirthdateComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinner,
    ProfileAvatarComponent,
    TitleCasePipe,
    TranslatePipe,
    S3UrlPipe,
    RouterLink,
  ],
})
export class XprofileComponent implements OnInit {
  private usersService = inject(UserService);
  private utilsService = inject(UtilsService);
  private themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);
  dialog = inject(MatDialog);

  readonly templateConfirmSave = viewChild.required<TemplateRef<any>>(
    'templateConfirmSave',
  );
  translateService = inject(TranslateService);
  authService = inject(AuthService);
  storeChat = inject(ChatStore);
  lang = inject(LanguageService).defaultLang;

  detailsLoading = false;

  loading = false;

  isDark = signal(false);

  readonly profileModel = signal(defaultProfileForm());
  readonly profileForm = form(
    this.profileModel,
    profileFormSchema(this.storeChat),
  );
  private readonly baseline = signal(defaultProfileForm());
  readonly canSave = computed(() => this.hasUnsavedChanges());

  readonly meUser = computed(() => this.storeChat.me()?.user);
  readonly myUserId = computed(() => this.meUser()?.uid ?? '');
  readonly isCleaner = computed(() => this.storeChat.userType() === 'Cleaner');
  readonly countryLabel = computed(() => {
    const code = this.profileModel().details.country;
    if (!code) {
      return '';
    }
    return (
      this.storeChat.nationalityEntities().find((item) => item.value === code)
        ?.name ?? code
    );
  });
  readonly locationLine = computed(() => {
    const city = this.profileModel().details.locationName;
    const country = this.countryLabel();
    if (city && country) {
      return `${city}, ${country}`;
    }
    return city || country || '';
  });

  readonly profileImage = computed(() => {
    const user = this.meUser();
    if (user?.avatar) {
      return null;
    }
    const images = user?.images ?? [];
    return images.find((image) => image.isProfile) ?? images[0] ?? null;
  });

  readonly progress = computed(() => {
    const model = this.profileModel();
    const photoCount = this.meUser()?.images?.length ?? 0;
    type Item = string | readonly unknown[] | undefined;
    const filled = (value: Item) =>
      Array.isArray(value) ? value.length > 0 : !!value?.toString().trim();

    const cleaner = this.isCleaner();
    const detailsItems = [
      model.details.country,
      model.details.location,
      ...(cleaner ? [model.details.experienceYears?.toString()] : []),
    ];
    const workItems = [
      model.work.services,
      model.work.hourlyRate?.toString(),
      model.work.availability,
      ...(cleaner ? [model.work.areasCovered] : []),
    ];
    const aboutItems = [model.about.languages, model.about.description];
    const requiredItems = [
      model.details.country,
      model.details.location,
      model.birthDate,
      model.work.services,
    ];
    const allItems = [
      ...detailsItems,
      model.birthDate,
      ...workItems,
      ...aboutItems,
      photoCount > 0 ? 'photos' : '',
    ];

    const countFilled = (items: Item[]) =>
      items.filter(filled).length;

    const filledCount = countFilled(allItems);
    const total = allItems.length;
    const requiredMissing = requiredItems.length - countFilled(requiredItems);

    return {
      filled: filledCount,
      total,
      percent: Math.round((filledCount / total) * 100),
      requiredMissing,
      detailsFilled: countFilled(detailsItems),
      detailsTotal: detailsItems.length,
      dobFilled: filled(model.birthDate) ? 1 : 0,
      workFilled: countFilled(workItems),
      workTotal: workItems.length,
      aboutFilled: countFilled(aboutItems),
      aboutTotal: aboutItems.length,
      photoCount,
    };
  });

  onKeydown($event: KeyboardEvent) {
    if ($event.keyCode === 13) {
      return false;
    }
    return true;
  }

  constructor() {
    afterNextRender(() => {
      this.captureBaseline();
      // The router's anchor scrolling only moves the window, not the admin scroll container.
      const fragment = this.route.snapshot.fragment;
      if (fragment) {
        document
          .getElementById(fragment)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  ngOnInit(): void {
    this.themeService.isDarkTheme.subscribe((isDark) => {
      this.isDark.set(isDark);
    });

    this.getDetailsData();
  }

  canExit(): boolean | Observable<boolean> {
    if (!this.hasChanges) {
      return true;
    }

    if (this.dialog.openDialogs.length) {
      return false;
    }

    const dialogRef = this.dialog.open(this.templateConfirmSave(), {
      hasBackdrop: true,
      disableClose: true,
    });

    return dialogRef.afterClosed().pipe(
      switchMap((confirmed) => {
        if (!confirmed) {
          return of(false);
        }
        return this.saveChanges(false);
      }),
    );
  }

  opened($event: void) {
    console.log($event);
  }

  get hasChanges() {
    return this.hasUnsavedChanges();
  }

  private hasUnsavedChanges(): boolean {
    return this.sectionChanged(this.profileModel(), this.baseline());
  }

  private captureBaseline(): void {
    this.baseline.set(structuredClone(this.profileModel()));
  }

  private sectionChanged(current: unknown, baseline: unknown): boolean {
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }

  getDetailsData() {
    this.detailsLoading = true;

    // Store state is frozen, and signal forms tag every array item they track.
    const result = structuredClone(this.storeChat.me().user);

    this.profileModel.update((model) => ({
      ...model,
      gender: result.userType || model.gender,
      details: {
        country: result.country || '',
        location: result.location || '',
        locationName: result.locationName || '',
        profileName: result.profileName || result.name || '',
        experienceYears: result.experienceYears ?? null,
      },
      birthDate: result.birthDateStr
        ? format(new Date(result.birthDateStr), 'dd/MM/yyyy')
        : '',
      work: {
        services: result.services ?? [],
        hourlyRate: result.hourlyRate ?? null,
        availability: result.availability ?? [],
        areasCovered: result.areasCovered ?? [],
        openToRelocate: result.openToRelocate === true,
      },
      about: {
        languages: result.languages || [],
        description: result.description || '',
      },
    }));

    this.profileForm().reset();
    this.captureBaseline();
    this.detailsLoading = false;
  }

  onSubmit(showInvalidData = true) {
    const close = this.translateService.instant('buttonClose');
    const saved = this.translateService.instant('saved');

    this.saveChanges(showInvalidData).subscribe((ok) => {
      if (ok && showInvalidData) {
        this.utilsService.alert(saved, close);
      }
    });
  }

  private saveChanges(showInvalidData: boolean): Observable<boolean> {
    const close = this.translateService.instant('buttonClose');
    const calls = [];
    const current = this.profileModel();
    const baseline = this.baseline();

    if (this.sectionChanged(current.details, baseline.details)) {
      const { experienceYears, ...details } = this.profileForm.details().value();
      calls.push(
        this.usersService.createProfileDetails(
          experienceYears === null ? details : { ...details, experienceYears },
        ),
      );
    }

    if (this.sectionChanged(current.birthDate, baseline.birthDate)) {
      const raw = this.profileForm.birthDate().value();
      if (raw && this.profileForm.birthDate().valid()) {
        const localBirthday = parse(raw, 'dd/MM/yyyy', new Date());
        const birthdayIso = subMinutes(
          localBirthday,
          localBirthday.getTimezoneOffset(),
        ).toISOString();
        calls.push(this.usersService.createDateOfBirth(birthdayIso));
      }
    }

    if (this.sectionChanged(current.work, baseline.work)) {
      if (!this.profileForm.work().valid()) {
        this.profileForm.work().markAsTouched();
        return of(false);
      }
      const { hourlyRate, ...work } = this.profileForm.work().value();
      calls.push(
        this.usersService.createProfileWork(
          hourlyRate === null ? work : { ...work, hourlyRate },
        ),
      );
    }

    if (this.sectionChanged(current.about, baseline.about)) {
      calls.push(
        this.usersService.createProfileAbout(this.profileForm.about().value()),
      );
    }

    if (calls.length === 0) {
      if (showInvalidData) {
        const invalidData = this.translateService.instant('invalidData');
        this.utilsService.alert(invalidData, close);
      }
      return of(false);
    }

    const saveError = this.translateService.instant('saveError');
    return combineLatest(calls).pipe(
      switchMap(() => this.authService.getUser()),
      tap((user) => {
        this.storeChat.addMeUser(user);
        this.profileForm().reset();
        this.captureBaseline();
      }),
      map(() => true),
      catchError(() => {
        this.utilsService.alert(saveError, close);
        return of(false);
      }),
    );
  }
}
