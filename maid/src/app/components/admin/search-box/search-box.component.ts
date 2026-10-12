import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { ESCAPE } from '@angular/cdk/keycodes';
import { fromEvent, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { ClickOutsideDirective } from '../../../libs/directives/click-outside.directive';
import { InputMonitorDirective } from '../../../libs/directives/input-monitor.directive';
import { NgClass } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { LocationSearchService } from '../../../services/shared/locations-search.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-searh-box',
  templateUrl: './search-box.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CdkOverlayOrigin,
    NgClass,
    InputMonitorDirective,
    CdkConnectedOverlay,
    ClickOutsideDirective,
    MatCardModule,
    MatInput,
    MatFormField,
    MatLabel,
    MatSuffix,
    TranslatePipe,
  ],
})
export class SearchBoxComponent implements OnInit, AfterViewInit {
  @ViewChild('input', { read: ElementRef, static: true })
  private input: ElementRef;
  @ViewChildren(CdkConnectedOverlay)
  private connectedOverlays: QueryList<CdkConnectedOverlay>;
  private locationSearchService = inject(LocationSearchService);

  isOpen = false;
  inputstatus: { hasData: boolean; isFocused: boolean };
  mouseInside: boolean;

  ngOnInit(): void {
    this.searchInput();
  }

  ngAfterViewInit() {
    const overlaysList = this.connectedOverlays;
    // overlaysList.last.backdropClick.pipe(mapTo(false)).subscribe(v => {
    //   this.isOpen = v;
    // })

    overlaysList.last.overlayKeydown
      .pipe(filter(({ keyCode }) => keyCode === ESCAPE))
      .subscribe(() => {
        this.isOpen = false;
        this.input.nativeElement.blur();
      });
  }

  closeDropdown() {
    if (this.inputstatus.isFocused) {
      this.isOpen = true;
    } else {
      this.isOpen = false;
    }
  }

  inputState(inputState: { hasData: boolean; isFocused: boolean }) {
    this.inputstatus = inputState;

    // if (this.inputstatus.isFocused) {
    //   this.isOpen = true;
    // }
  }

  searchInput() {
    fromEvent(this.input.nativeElement, 'keyup')
      .pipe(
        tap(() => console.log),
        map((event: any) => event.target.value),
        filter((res) => res.length > 3),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((text: string) =>
          this.locationSearchService.searchLocations('pt', text).pipe(
            catchError(() => {
              console.log('caught search error the right way');
              return of({ results: null });
            }),
          ),
        ),
      )
      .subscribe(
        (result) => {
          console.log(result);
        },
        (error) => {
          console.log('error', error);
        },
      );
  }
}
