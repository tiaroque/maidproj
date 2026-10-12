import { Directive, ElementRef, EventEmitter, Output, inject } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[intersectionWatcher]',
})
export class IntersectionWatcherDirective {
  private readonly elementRef = inject(ElementRef);

  @Output() elementEntry = new EventEmitter<IntersectionObserverEntry>();
  public readonly observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target) {
          this.elementEntry.emit(entry);
        }
      });
    },
    {
      root: this.elementRef.nativeElement,
      rootMargin: '0px 0px 0px 0px ',
      threshold: 1,
    },
  );
}
