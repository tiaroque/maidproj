import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private elementRef = inject(ElementRef);

  @Output() clickOutside = new EventEmitter<void>();
  @Input() exception: HTMLElement[];

  @HostListener('document:click', ['$event.target'])
  public onClick(target: any) {
    const clickedInside =
      this.elementRef.nativeElement.contains(target) ||
      this.exception?.some((elem) => elem.contains(target));

    if (!clickedInside) {
      // console.log('outside click xx');
      this.clickOutside.emit();
    }
  }
}
