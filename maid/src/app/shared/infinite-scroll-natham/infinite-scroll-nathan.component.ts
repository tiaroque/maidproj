import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-infinite-scroll2',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="w-full h-1 block" #endMarker></div>
  `,
})
export class InfiniteScroll2Component {
  private readonly endMarker =
    viewChild.required<ElementRef<HTMLDivElement>>('endMarker');
  readonly loading = input.required<boolean>();
  readonly hasMore = input(true);
  // Set this when the list scrolls inside its own container: rootMargin only
  // extends the root, so with the viewport as root the prefetch margin would
  // be clipped away by that container. The container must have a bounded
  // height, otherwise the marker always counts as visible.
  readonly root = input<HTMLElement | null>(null);
  readonly fetchMore = output<void>();
  private observer?: IntersectionObserver;

  constructor() {
    afterRenderEffect(() => {
      if (this.loading() || !this.hasMore()) {
        return;
      }
      this.observer ??= new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !this.loading() && this.hasMore()) {
            this.fetchMore.emit();
          }
        },
        { root: this.root(), rootMargin: '200px' },
      );
      // The observer only reports visibility changes, so a marker that stays
      // visible after a page loads has to be re-observed to be measured again.
      const marker = this.endMarker().nativeElement;
      this.observer.unobserve(marker);
      this.observer.observe(marker);
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }
}
