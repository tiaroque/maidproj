import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { catchError, of, Subject } from 'rxjs';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../services/shared/language-service.service';
import { HeaderComponent } from '../header/header.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { ListService } from '../../../services/admin/list.service';
import { DatingCardComponent } from '../../admin/list/dating-card/dating-card.component';
import { QuickSearchComponent } from '../../../shared/quick-search/quick-search.component';
import { FooterComponent } from '../footer/footer.component';
import {
  UserDetailsObject,
  UserModel,
} from '../../../services/admin/interfaces/user.interface';
import { avatarSrc } from '../../../utils/avatar';
import { S3UrlPipe } from '../../../utils/s3-url';
import { SliceDescriptionPipe } from '../../../utils/pipes/sliceDescription.pipe';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [
    TranslatePipe,
    RouterLink,
    HeaderComponent,
    DatingCardComponent,
    QuickSearchComponent,
    FooterComponent,
    NgOptimizedImage,
    S3UrlPipe,
    SliceDescriptionPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  private renderer = inject(Renderer2);

  readonly languageService = inject(LanguageService);
  lang = this.languageService.defaultLang;
  readonly showPricing = false;
  readonly partnerCountries = [
    'landing.partnerCountryPt',
    'landing.partnerCountryDe',
    'landing.partnerCountryFr',
    'landing.partnerCountryEs',
    'landing.partnerCountryIt',
    'landing.partnerCountryCh',
    'landing.partnerCountryNl',
    'landing.partnerCountryGb',
  ];
  readonly whyReasons = [
    { titleKey: 'landing.reason1Title', bodyKey: 'landing.reason1Body' },
    { titleKey: 'landing.reason2Title', bodyKey: 'landing.reason2Body' },
    { titleKey: 'landing.reason3Title', bodyKey: 'landing.reason3Body' },
    { titleKey: 'landing.reason4Title', bodyKey: 'landing.reason4Body' },
  ];
  listService = inject(ListService);
  readonly router = inject(Router);
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  map = new Map<string, string | undefined>([['type', 'Cleaner']]);

  isOpen = false;

  protected componentDestroyed$ = new Subject();

  listPaging = toSignal(
    this.listService.getListAnonymous(this.map).pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  list = computed(() => this.listPaging() ?? []);

  latestOffers = toSignal(
    this.listService
      .getLatestOffersAnonymous()
      .pipe(catchError(() => of([] as UserDetailsObject[]))),
    { initialValue: [] as UserDetailsObject[] },
  );

  offerAvatar(user: UserModel) {
    return avatarSrc(user.uid, user.avatar);
  }

  readonly profileSlider = viewChild<ElementRef<HTMLElement>>('profileSlider');
  canPrevProfiles = signal(false);
  canNextProfiles = signal(false);
  readonly profilesScrollable = computed(
    () => this.canPrevProfiles() || this.canNextProfiles(),
  );

  private sliderResizeObserver?: ResizeObserver;
  private observedSlider?: HTMLElement;

  constructor() {
    afterRenderEffect(() => {
      this.list();
      const slider = this.profileSlider()?.nativeElement;
      if (!this.isBrowser || !slider) {
        return;
      }
      this.watchSliderSize(slider);
      this.updateProfileSliderNav(slider);
    });
  }

  // The quick-search panel beside the slider is deferred until it scrolls into
  // view, which narrows the slider long after the first measurement. Without
  // watching for that the arrows stay stuck on "nothing to scroll".
  private watchSliderSize(slider: HTMLElement) {
    if (this.observedSlider === slider) {
      return;
    }
    this.sliderResizeObserver?.disconnect();
    this.observedSlider = slider;
    this.sliderResizeObserver = new ResizeObserver(() =>
      this.updateProfileSliderNav(slider),
    );
    this.sliderResizeObserver.observe(slider);
  }

  scrollProfiles(direction: -1 | 1) {
    const slider = this.profileSlider()?.nativeElement;
    if (!slider) {
      return;
    }
    const slide = slider.querySelector('.profile-slide') as HTMLElement | null;
    const step = (slide?.offsetWidth ?? 280) + 16;
    slider.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  // The page scrolls inside the app shell, not the window, so router
  // fragment scrolling cannot reach this section. The deferred quick search
  // renders mid-scroll and pushes the section down, hence the second pass.
  scrollToVerification() {
    const section = document.getElementById('verification');
    if (!section) {
      return;
    }
    const scrollTo = () =>
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    scrollTo();
    document.addEventListener('scrollend', scrollTo, {
      capture: true,
      once: true,
    });
  }

  onProfileSliderScroll(event: Event) {
    this.updateProfileSliderNav(event.target as HTMLElement);
  }

  private updateProfileSliderNav(el?: HTMLElement) {
    const slider = el ?? this.profileSlider()?.nativeElement;
    if (!slider) {
      return;
    }
    this.canPrevProfiles.set(slider.scrollLeft > 8);
    this.canNextProfiles.set(
      slider.scrollLeft + slider.clientWidth < slider.scrollWidth - 8,
    );
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.renderer.removeClass(document.body, 'unicorn-dark-theme');
    }
  }

  ngOnDestroy() {
    this.sliderResizeObserver?.disconnect();
    this.componentDestroyed$.next(undefined);
    this.componentDestroyed$.complete();
  }
}
