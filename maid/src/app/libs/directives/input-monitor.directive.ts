import { Directive, ElementRef, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';

@Directive({
  selector: '[appInputMonitor]',
  exportAs: 'inputMonitor',
  standalone: true,
})
export class InputMonitorDirective implements OnInit {
  private el = inject(ElementRef);

  @Output() inputState: EventEmitter<{ hasData: boolean; isFocused: boolean }> =
    new EventEmitter();
  public hasData = false;
  public isFocused = false;
  inputElement: HTMLInputElement;

  ngOnInit(): void {
    // console.log('ngOnInit is Empty: ', this.el.nativeElement.value);
    this.hasData = this.el.nativeElement.value.length !== 0;
    this.inputElement = this.el.nativeElement as HTMLInputElement;
  }

  @HostListener('input')
  onInput() {
    this.hasData = this.inputElement.value.length !== 0;
    this.inputState.emit({ hasData: this.hasData, isFocused: this.isFocused });
  }

  @HostListener('focus')
  onFocus() {
    this.isFocused = true;
    this.hasData = this.inputElement.value.length !== 0;
    this.inputState.emit({ hasData: this.hasData, isFocused: this.isFocused });
  }

  @HostListener('blur')
  onBlur() {
    this.isFocused = false;
    this.hasData = this.inputElement.value.length !== 0;
    this.inputState.emit({ hasData: this.hasData, isFocused: this.isFocused });
  }
}
