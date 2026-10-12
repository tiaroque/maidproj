import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { form, FormField, maxLength } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { catchError, debounceTime, filter, of, switchMap, tap } from 'rxjs';
import { UserService, userTypes } from '../../../../services/user.service';
import {
  UserDetailsObject,
  UserModel,
} from '../../../../services/admin/interfaces/user.interface';
import { ChatStore } from '../../../../services/admin/signals/store';
import { S3UrlPipe } from '../../../../utils/s3-url';
import { RouterLink } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { UtilsService } from '../../../../services/utils.service';
import { LanguageService } from '../../../../services/shared/language-service.service';
import { ProfileAvatarComponent } from '../../../../shared/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-filtering',
  imports: [
    NgOptimizedImage,
    MatAutocompleteModule,
    FormField,
    ProfileAvatarComponent,
    RouterLink,
    MatProgressSpinner,
    MatButtonModule,
    TranslatePipe,
    S3UrlPipe,
  ],
  templateUrl: './filtering.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilteringComponent implements OnDestroy {
  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;
  readonly autocompleteTrigger = viewChild(MatAutocompleteTrigger);
  readonly userProfile = input<UserDetailsObject>();

  searchTerms = output<string[]>();

  readonly storeChat = inject(ChatStore);
  readonly userService = inject(UserService);
  readonly utilsService = inject(UtilsService);
  readonly loading = signal(false);
  readonly offerModel = signal({ currentOffer: '' });
  readonly offerForm = form(this.offerModel, (p) => {
    maxLength(p.currentOffer, 80);
  });
  readonly currentOffer$ = toObservable(
    computed(() => this.offerForm.currentOffer().value()),
  );

  // represents the chips list
  readonly offersDreams = signal<string[]>(this.storeChat.listSearchTerms());

  opositeUsersTypes = userTypes.filter(
    (type) => type !== this.storeChat.me().user.claims!['user'],
  );

  getLatestOffers = signal<UserModel[]>([]);
  readonly recentOfferLabels = computed(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const user of this.getLatestOffers()) {
      const offer = user.offer?.offer?.trim();
      if (!offer || seen.has(offer)) {
        continue;
      }
      seen.add(offer);
      labels.push(offer);
      if (labels.length === 3) {
        break;
      }
    }
    return labels;
  });
  getLatestOffers$ = this.currentOffer$
    .pipe(
      filter((c) => c.length === 0),
      tap((offer) => {
        // console.log('latest offer: ', offer);
        this.search.set([]);
        this.loading.set(true);
      }),
      switchMap((c) =>
        this.userService.getLatestOffers(this.opositeUsersTypes[0]).pipe(
          // tap((offers) => console.log(offers)),
          catchError((error) => {
            console.error(error);
            return of([]);
          }),
        ),
      ),
      tap(() => this.loading.set(false)),
      // tap((offers) => console.log('setting latest offers: ', offers)),
      tap((offers) => this.getLatestOffers.set(offers)),
    )
    .subscribe();

  search = signal<UserModel[]>([]);
  search$ = this.currentOffer$
    .pipe(
      filter((c) => c.length >= 3),
      tap(() => {
        // this.getLatestOffers.set([]);
        this.loading.set(true);
      }),
      debounceTime(800),
      switchMap((c) => {
        return this.userService
          .getGroupedOffers(this.opositeUsersTypes[0], c)
          .pipe(
            tap(() => this.loading.set(false)),
            catchError((error) => {
              console.error(error);
              // this.getLatestOffers.set([]);
              this.loading.set(false);
              return of<UserModel[]>([]);
            }),
          );
      }),
      tap((users) => this.search.set(users)),
    )
    .subscribe();

  // search = toSignal(this.search$, {
  //   initialValue: [],
  // });

  searchOffers(
    publicSearchBox: HTMLInputElement,
    autocompleteTrigger: MatAutocompleteTrigger,
  ) {
    const value = this.offerForm.currentOffer().value().trim().toLowerCase();
    this.tryAddOffer(value);
    autocompleteTrigger.closePanel();
  }

  addFromCompact(event: Event, inputEl: HTMLInputElement) {
    event.preventDefault();
    const value = this.offerForm.currentOffer().value().trim();
    if (this.tryAddOffer(value)) {
      inputEl.value = '';
    }
  }

  applyRecent(offer: string) {
    const value = offer.trim();
    if (!value) {
      return;
    }
    this.offersDreams.update((offers) =>
      offers.includes(value) ? offers : [...offers, value],
    );
    this.searchTerms.emit(this.offersDreams());
  }

  private tryAddOffer(value: string): boolean {
    if (!value) {
      return false;
    }
    if (!this.offerForm().valid()) {
      this.offerForm.currentOffer().markAsTouched();
      return false;
    }

    this.offersDreams.update((offers) => [...offers, value]);
    this.offerForm.currentOffer().value.set('');
    this.searchTerms.emit(this.offersDreams());
    return true;
  }

  remove(offer: string): void {
    this.offersDreams.update((offers) => {
      const index = offers.indexOf(offer);
      if (index < 0) {
        return offers;
      }

      offers.splice(index, 1);
      return [...offers];
    });

    this.searchTerms.emit(this.offersDreams());
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    // this.offersDreams.update((offers) => [...offers, event.option.viewValue]);
    // const user = event.option.value;
    // this.currentOffer.set('');
    // event.option.deselect();
  }

  ngOnDestroy(): void {
    this.getLatestOffers$.unsubscribe();
  }
}
