import { NgOptimizedImage } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  UserDetailsObject,
  UserType,
} from '../../../services/admin/interfaces/user.interface';
import { MenusService } from '../../../services/admin/menus.service';
import { ListFilteringComponent } from '../left-nav/list-filtering/list-filtering.component';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { FilteringComponent } from './filtering/filtering.component';
import { Subject, Subscription } from 'rxjs';
import { userTypes } from '../../../services/user.service';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatStore } from '../../../services/admin/signals/store';
import {
  filtersIcon,
  FilterType,
  ItemFilter,
} from '../../../services/admin/interfaces/common';
import { ListFilterService } from '../../../services/admin/list-filter.service';
import { NgxResizeObserverModule } from 'ngx-resize-observer';
import { DatingCardComponent } from './dating-card/dating-card.component';
import { ListSkeletonComponent } from './list-skeleton/list-skeleton.component';
import { InfiniteScroll2Component } from '../../../shared/infinite-scroll-natham/infinite-scroll-nathan.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    ListFilteringComponent,
    PortalModule,
    FilteringComponent,
    TranslatePipe,
    InfiniteScroll2Component,
    NgxResizeObserverModule,
    DatingCardComponent,
    ListSkeletonComponent,
    MatIcon,
  ],
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
  private listFilterService = inject(ListFilterService);
  private menuService = inject(MenusService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly templatePortal = viewChild.required(CdkPortal);

  resizedMarkerSubject = new Subject<any>();

  readonly userProfile = input<UserDetailsObject>();

  storeChat = inject(ChatStore);

  list = computed(() => this.storeChat.listEntities());
  shownCount = computed(() => {
    const metadata = this.storeChat.metadata();
    return metadata.totalCount || metadata.count;
  });

  // Back/forward navigation shows the list as it was left (loaded pages,
  // search terms and scroll offset) instead of searching again. When
  // MainComponent is recreated, its outlet only activates this component after
  // the navigation has ended, so the finished navigation is checked as well.
  private readonly restoreState =
    (this.router.currentNavigation() ?? this.router.lastSuccessfulNavigation())
      ?.trigger === 'popstate' && this.storeChat.listEntities().length > 0;
  private scrollTop = 0;
  private restoreFrame = 0;

  opositeUserType: UserType | null = null;
  subscription = new Subscription();
  filtersIcon: Record<FilterType, string>;

  // Fast responses skip the skeleton entirely so the grid doesn't flash.
  readonly skeletonDelayMs = 300;
  showSkeleton = signal(false);
  private skeletonTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Runs before the template creates FilteringComponent, which seeds its
    // chips from these terms.
    if (!this.restoreState) {
      this.storeChat.setListSearchTerms([]);
      this.storeChat.setListScrollTop(0);
    }

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.skeletonTimer = setTimeout(
        () => this.showSkeleton.set(true),
        this.skeletonDelayMs,
      );

      // The container's DOM may already be detached when this component is
      // destroyed, so the offset is tracked while scrolling.
      const container = this.host.nativeElement.closest<HTMLElement>(
        '[data-scroll-container]',
      );
      if (!container) {
        return;
      }
      const onScroll = () => (this.scrollTop = container.scrollTop);
      container.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => {
        container.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(this.restoreFrame);
      });

      if (this.restoreState) {
        this.restoreScroll(container, this.storeChat.listScrollTop());
      }
    });
  }

  ngOnInit(): void {
    this.filtersIcon = filtersIcon;
    if (!this.restoreState) {
      this.searchUsers();
    }
    // Promise.resolve().then(() => this.menuService.setTopMenu('admin/list'));
  }

  // The grid renders through @defer, so wait until the container is tall
  // enough to reach the saved offset before applying it.
  private restoreScroll(container: HTMLElement, top: number, frames = 0) {
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll >= top || frames >= 60) {
      container.scrollTop = top;
      this.scrollTop = container.scrollTop;
      return;
    }
    this.restoreFrame = requestAnimationFrame(() =>
      this.restoreScroll(container, top, frames + 1),
    );
  }

  fetchMore() {
    // throw new Error('Method not implemented.');
    this.searchUsers(false);
  }

  removedChip(filter: ItemFilter) {
    const filterForm = this.listFilterService.filterForm;
    // Removing a chip applies immediately, so it must not enable Apply, but
    // pending edits made before the removal should keep it enabled.
    const hadPendingChanges = filterForm().dirty();
    this.listFilterService.clearRemovedFilter(filter);
    if (!hadPendingChanges) {
      filterForm().reset();
    }
    this.searchUsers();
  }

  // Called from top filter menu (dreams and offers)
  searchTerms(searchTerms: string[]) {
    this.storeChat.setListSearchTerms(searchTerms);
    this.searchUsers();
  }

  // Main Entry method for searching users
  async searchUsers(resetList = true) {
    const me = this.storeChat.me();

    const userType = me.user.userType;

    const opositeUsersTypes = userTypes.filter((type) => type !== userType);
    this.opositeUserType = opositeUsersTypes[0];

    this.getNextPage(resetList);
  }

  private async getNextPage(resetList: boolean) {
    const globalFilters = this.storeChat.appliedFiltersList();

    const filtersStringMap =
      this.listFilterService.generateGlobalFiltersMap(globalFilters);

    await this.storeChat.loadNextListPage(
      this.opositeUserType as UserType,
      this.storeChat.listSearchTerms(),
      filtersStringMap,
      resetList,
    );
  }

  // randomClick() {
  //   this.router.navigate(['/admin', 'list', Math.floor(Math.random() * 9)]);
  // }

  // ngAfterViewInit() {

  // const elem = this.container()?.nativeElement!;

  // // RESIZE OBSERVER
  // const observer = new ResizeObserver((entries) => {
  //   entries.forEach((entry) => {
  //     this.checkScrollSubject.next();
  //   });
  // });

  // observer.observe(elem);

  // // MUTATION OBSERVER
  // const elem = this.container()?.nativeElement!;
  // const options = {
  //   characterData: true,
  //   childList: true, // listen to listen to children being added or removed
  //   attributes: false, // listen to attributes changes
  //   subtree: false, // omit or set to false to observe only changes to the parent node
  // };
  // const callback: MutationCallback = (
  //   mutationList: MutationRecord[],
  //   observer: MutationObserver,
  // ) => {
  //   mutationList.forEach((mutation) => {
  //   });
  // };
  // const observer = new MutationObserver(callback);
  // observer.observe(elem, options);
  // this.menuService.setPortal(this.templatePortal);
  // }

  ngAfterViewInit(): void {
    this.templatePortal().context = 'admin/list';
    this.menuService.setPortal(this.templatePortal());
  }

  ngOnDestroy(): void {
    clearTimeout(this.skeletonTimer);
    this.storeChat.setListScrollTop(this.scrollTop);
    if (this.templatePortal().isAttached) {
      this.templatePortal().detach();
    }

    this.subscription.unsubscribe();
  }
}
