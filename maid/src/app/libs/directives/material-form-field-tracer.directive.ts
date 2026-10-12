import { Directive, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { debounceTime, distinctUntilChanged, exhaustMap, iif, of, Subject, takeUntil, tap } from 'rxjs';

@Directive({
  selector: '[appInputMonitor]',
  standalone: true,
})
export class InputMonitorDirective implements OnInit, OnDestroy {
  @Input()
  public debounceTime: number = 100;

  @Input()
  public numberOfChars: number = 10;

  @Output()
  public event: EventEmitter<any>;

  protected emitEvent$: Subject<string>;
  protected subscription$: Subject<void>;

  @HostListener('keyup', ['$event.target'])
  onKeyup(input: HTMLInputElement) {
    this.emitEvent$.next(input.value);
  }

  constructor() {
    this.debounceTime = 500;
    this.event = new EventEmitter<any>();
    this.emitEvent$ = new Subject<any>();
    this.subscription$ = new Subject<void>();
  }

  ngOnInit() {
    // const init$ = this.emitEvent$.pipe(
    //   debounceTime(this.debounceTime),
    //   filter(value => value.length === this.numberOfChars),
    //   tap(() => this.event.emit(true))
    // );

    // Not doing this on the moment
    // // Only starts emitting after the valid number of characters are met,
    // // then starts emitting if is either valid or invalid
    this.emitEvent$
      .pipe(
        // skipUntil(init$),
        takeUntil(this.subscription$),
        exhaustMap(value => iif(() => value.length === this.numberOfChars, of(value), of(false))),
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(val => this.event.emit(val))
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.subscription$.next();
    this.subscription$.complete();
  }
}
