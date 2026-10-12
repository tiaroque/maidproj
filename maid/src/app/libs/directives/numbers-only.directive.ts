import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[numbersOnly]',
  standalone: true,
})
export class NumbersOnlyDirective {
  // private ngControl = inject(NgControl);
  // private destroyRef = inject(DestroyRef);
  valueOnKeyDown: string = '';

  regexStr = '^[0-9]*$';

  constructor(private el: ElementRef) {}

  // ngOnInit(): void {
  //   this.ngControl.valueChanges?.subscribe((value: string) => {
  //     console.log(value);
  //   });
  // }

  // ngAfterViewInit(): void {

  //   this.ngControl.valueChanges
  //     ?.pipe(takeUntilDestroyed(this.destroyRef))
  //     .subscribe((value: string) => {
  //       const initialValue =
  //         typeof value === 'string' ? value.replace(/[^0-9]/g, '') : '';

  //       if (value !== initialValue) {
  //         this.ngControl.control?.setValue(initialValue, { emitEvent: false });
  //       }
  //     });
  // }

  @HostListener('input', ['$event']) onInput(event: InputEvent) {
    const htmlInputEl = event.target as HTMLInputElement;
    const inputText = htmlInputEl.value;
    // inputText.length === 2 ? (htmlInputEl.value += '/') : '';
    // inputText.length === 5 ? (htmlInputEl.value += '/') : '';
    console.log(htmlInputEl.selectionStart);
    const selectionStart = htmlInputEl.selectionStart;

    const getFullString = (text: string) => text.split(/[/]/).join('');
    const spliceStr = (text: string, initial: number, count: number) => {
      const newStr = text.split('');
      return newStr.splice(initial, count).join('');
    };

    const dateNoDividers = getFullString(inputText);
    console.log('dateNoDividers: ', dateNoDividers);

    const day = spliceStr(dateNoDividers, 0, 2);
    const month = spliceStr(dateNoDividers, 2, 2);
    const year = spliceStr(dateNoDividers, 4, 4);

    const dateParts = [day, month, year].filter((val) => !!val);

    [day, month, year].reduce((acumulator: string, current: string) => {
      return acumulator;
    });

    // console.log('day :>> ', day);
    // console.log('month :>> ', month);
    // console.log('year :>> ', year);

    const final = dateParts.join('/');

    console.log('final date :>> ', final);

    // const parts = inputText.split(/([/])/);
    // const parts = inputText.split(/[/]/);

    // console.log(parts);
    htmlInputEl.value = final;
    htmlInputEl.setSelectionRange(selectionStart, selectionStart);
  }

  @HostListener('keyup', ['$event']) onKeyUp(event: KeyboardEvent) {
    // console.log((event.target as HTMLInputElement).value);
    // const newValue = this.el.nativeElement.value as string;
    // console.log(
    //   'previous value: ',
    //   this.valueOnKeyDown,
    //   ' new value: ',
    //   newValue,
    // );
    // console.log(event.key);
    // if (event.key !== 'Backspace') {
    //   newValue.length === 2 ? (this.el.nativeElement.value += '/') : '';
    //   this.valueOnKeyDown.length === 2
    //     ? (this.el.nativeElement.value = `${this.valueOnKeyDown}/${event.key}`)
    //     : '';
    // }
    // const parts = newValue.split(/([/])/);
    // console.log('parts: ', parts);
    // console.log('new char: ', event.key);
    // console.log('new value: ', this.el.nativeElement.value);
    // this.el.nativeElement.value += '/';
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    const e = event;
    this.valueOnKeyDown = this.el.nativeElement.value;

    // const value = event.key;
    // const initialValue =
    //   typeof value === 'string' ? value.replace(/[^0-9]/g, '') : '';

    // if (value === initialValue) {
    //   return;
    // }

    // e.preventDefault();

    // console.log(this.el.nativeElement.value);
    // console.log(event.key);

    if (
      [46, 8, 9, 27, 13, 110, 190].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A
      (e.keyCode == 65 && e.ctrlKey === true) ||
      // Allow: Ctrl+C
      (e.keyCode == 67 && e.ctrlKey === true) ||
      // Allow: Ctrl+V
      (e.keyCode == 86 && e.ctrlKey === true) ||
      // Allow: Ctrl+X
      (e.keyCode == 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      // let it happen, don't do anything
      return;
    }

    const ch = String.fromCharCode(e.keyCode);
    const regEx = new RegExp(this.regexStr);
    if (regEx.test(ch)) return;
    else e.preventDefault();
  }
}
