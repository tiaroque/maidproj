import { OnDestroy, Directive, ElementRef, EventEmitter, Output, inject } from '@angular/core';
import { IntersectionWatcherDirective } from './intersection-watcher';

@Directive({
  standalone: true,
  selector: '[intersectionItem]',
})
export class IntersectionItemDirective implements OnDestroy {
  private readonly watcher = inject(IntersectionWatcherDirective);
  private readonly elementRef = inject(ElementRef);

  @Output() elementEntryRemoved = new EventEmitter<ElementRef<any>>();
  constructor() {
    this.watcher.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    // console.log('ngOnDestroy observer: ', this.elementRef.nativeElement);
    this.watcher.observer.unobserve(this.elementRef.nativeElement);
    this.elementEntryRemoved.emit(this.elementRef);
  }
}
