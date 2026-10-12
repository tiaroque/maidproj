import {
  Component,
  inject,
  AfterViewInit,
  OnDestroy,
  OnInit,
  computed,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenusService } from '../../../services/admin/menus.service';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../services/shared/language-service.service';
import { ChatStore } from '../../../services/admin/signals/store';

@Component({
  selector: 'app-profile-base',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PortalModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-base.component.html',
})
export class ProfileBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private menuService = inject(MenusService);

  readonly languageService = inject(LanguageService);
  private readonly storeChat = inject(ChatStore);
  lang = this.languageService.defaultLang;
  readonly offersDreamsKey = computed(() =>
    this.storeChat.userType() === 'Cleaner'
      ? 'posts.cleanerTitle'
      : 'posts.clientTitle',
  );
  menuOpened = signal(true);

  readonly templatePortal = viewChild.required(CdkPortal);

  ngOnInit(): void {

    this.menuService.openMenu$.subscribe((isOpen) => {
      this.menuOpened.set(isOpen);
    });

    // Promise.resolve().then(() => this.menuService.setTopMenu('admin/profile'));
  }

  ngAfterViewInit(): void {
    this.templatePortal().context = 'admin/profile';
    this.menuService.setPortal(this.templatePortal());
  }

  toggleMenu() {
    this.menuService.toggleMenu(false);
  }

  ngOnDestroy(): void {
    if (this.templatePortal().isAttached) {
      this.templatePortal().detach();
    }
  }
}
