import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';
// import { InputMonitorDirective } from './input-monitor.directive';

@Directive({
  selector: '[apphighlight]',
  exportAs: 'highlighted',
  standalone: true,
})
export class HighlightDirective {
  @Output() isMouseInside: EventEmitter<boolean> = new EventEmitter();

  mouseInside = false;

  // @Input('highlight') hoverClass: any;
  // @Input('input') input: HTMLInputElement;

  constructor(public elementRef: ElementRef<HTMLDivElement>) {}

  @HostListener('mouseenter') onMouseEnter() {
    // this.elementRef.nativeElement.classList.add(this.hoverClass);
    this.mouseInside = true;
    this.isMouseInside.emit(this.mouseInside);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.mouseInside = false;
    this.isMouseInside.emit(this.mouseInside);
  }
}
