import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ActivityFeed,
  ListService,
} from '../../../services/admin/list.service';
import { MenusService } from '../../../services/admin/menus.service';
import { DatingCardComponent } from '../list/dating-card/dating-card.component';

const emptyActivity: ActivityFeed = { likes: [], myLikes: [], visits: [] };

type ActivitySectionKey = keyof ActivityFeed;

interface ActivitySection {
  key: ActivitySectionKey;
  label: string;
  empty: string;
}

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [
    PortalModule,
    TranslatePipe,
    DatingCardComponent,
    MatButtonToggleModule,
  ],
})
export class ActivityComponent implements AfterViewInit, OnDestroy {
  private listService = inject(ListService);
  private menuService = inject(MenusService);
  readonly templatePortal = viewChild.required(CdkPortal);

  readonly activity = toSignal(
    this.listService.getActivity().pipe(catchError(() => of(emptyActivity))),
    { initialValue: undefined },
  );

  readonly sections: ActivitySection[] = [
    { key: 'likes', label: 'activity.likedYou', empty: 'activity.emptyLikes' },
    { key: 'myLikes', label: 'activity.youLiked', empty: 'activity.emptyYouLiked' },
    { key: 'visits', label: 'activity.visitedYou', empty: 'activity.emptyVisits' },
  ];

  readonly selectedSection = signal<ActivitySectionKey>('likes');

  readonly currentSection = computed(() =>
    this.sections.find((s) => s.key === this.selectedSection()),
  );

  ngAfterViewInit(): void {
    this.templatePortal().context = 'admin/activity';
    this.menuService.setPortal(this.templatePortal());
  }

  ngOnDestroy(): void {
    if (this.templatePortal().isAttached) {
      this.templatePortal().detach();
    }
  }
}
