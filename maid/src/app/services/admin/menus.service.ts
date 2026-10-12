import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TemplatePortal } from '@angular/cdk/portal';
import { effect, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map, Subject, tap } from 'rxjs';

export interface MenuStructure {
  url: string;
  page: string;
  selected?: boolean;
  tabIndex: number;
  // subMenus?: string[]
}

@Injectable({
  providedIn: 'root',
})
export class MenusService {
  private openMenuSubject = new BehaviorSubject<boolean>(false);
  openMenu$ = this.openMenuSubject.asObservable();
  readonly breakpointObserver = inject(BreakpointObserver);
  readonly isDesktop$ = this.breakpointObserver
    .observe(['(min-width: 768px)'])
    .pipe(
      tap((val: BreakpointState) => {
        if (val.matches) {
          this.openMenuSubject.next(true);
        } else {
          this.openMenuSubject.next(false);
        }
      }),
      map((val: BreakpointState) => val.matches),
    );
  readonly isDesktop = toSignal(this.isDesktop$);

  private activePortal = new Subject<TemplatePortal>();
  readonly portal$ = this.activePortal.asObservable();

  constructor() {
    effect(() => {
      this.isDesktop();
    });
  }

  setPortal(portal: TemplatePortal) {
    this.activePortal.next(portal);
  }

  // private tabAnimationSubject = new BehaviorSubject<string>('200ms');
  // readonly tabAnimation$ = this.tabAnimationSubject.asObservable();

  // toggleTabAnimation(set: 'enable' | 'disable') {
  //   if (set === 'enable') {
  //     this.tabAnimationSubject.next('200ms');
  //   }
  //   if (set === 'disable') {
  //     this.tabAnimationSubject.next('0ms');
  //   }
  // }

  toggleMenu(value: boolean) {
    if (!this.isDesktop()) {
      this.openMenuSubject.next(value);
    }
  }
}
