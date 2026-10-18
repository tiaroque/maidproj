import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { NavigationEnd, Params, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_LOCALES } from '../../../locale/compiled-locale';
import { LanguageService } from '../../services/shared/language-service.service';
import { localeSwitchHref } from '../../utils/locale-href';
import { FlagComponent } from '../flag/flag.component';

interface LanguageItem {
  code: string;
  name: string;
}

@Component({
  selector: 'app-language-links',
  imports: [FlagComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './language-links.component.html',
  host: { class: 'block w-full' },
})
export class LanguageLinksComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  clickedLinkEvent = output<Event>();
  readonly justify = input('justify-center');
  readonly pageUrl = signal('');
  readonly queryParams = signal<Params>({});

  readonly languages = computed<LanguageItem[]>(() => {
    return this.languageService
      .getLanguagesMenu()
      .filter((lang) =>
        this.languageService.currentLanguages.includes(lang.value),
      )
      .map((lang) => ({ code: lang.value, name: lang.name }));
  });

  constructor() {}

  ngOnInit(): void {
    this.fillPage(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      )
      .subscribe((event) => this.fillPage(event.urlAfterRedirects));
  }

  fillPage(rawUrl: string) {
    const tree = this.router.parseUrl(rawUrl);
    this.queryParams.set(tree.queryParams);

    const segments = (tree.root.children[PRIMARY_OUTLET]?.segments ?? []).map(
      (segment) => segment.path,
    );
    const first = segments[0];
    const pageSegments =
      first && (APP_LOCALES as readonly string[]).includes(first)
        ? segments.slice(1)
        : segments;

    this.pageUrl.set(pageSegments.join('/'));
  }

  hrefFor(lang: string): string {
    const page = this.pageUrl();
    return localeSwitchHref(
      lang,
      page ? page.split('/') : [],
      this.queryParams(),
    );
  }

  clickedLink(event: Event) {
    this.clickedLinkEvent.emit(event);
  }

  isCurrent(lang: string) {
    return this.languageService.defaultLang() === lang;
  }

  readonly navClass = computed(
    () =>
      `flex flex-wrap items-center ${this.justify()} gap-1 sm:gap-1.5 w-full text-xs`,
  );

  linkClass(lang: string) {
    const isCurrent = this.isCurrent(lang);
    const base =
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs no-underline transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--mat-sys-primary) [&_svg]:shrink-0';
    const active =
      'bg-(--mat-sys-primary)/10 text-[color-mix(in_srgb,var(--mat-sys-primary)_75%,var(--mat-sys-on-surface))] font-semibold ring-1 ring-(--mat-sys-primary)/25 shadow-xs';
    const inactive =
      'text-(--mat-sys-on-surface-variant) hover:text-(--mat-sys-on-surface) hover:bg-(--mat-sys-surface-container-high)/60';
    return `${base} ${isCurrent ? active : inactive}`;
  }
}
