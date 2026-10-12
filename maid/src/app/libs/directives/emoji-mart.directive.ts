import { Directive, effect, ElementRef, inject, input, output } from '@angular/core';
import data from '@emoji-mart/data';
import { Picker } from 'emoji-mart';

@Directive({ selector: '[appEmojiMart]', standalone: true })
export class EmojiMartDirective {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  clickedEmoji = output<any>();
  locale = input<string | undefined>();
  theme = input<'light' | 'dark' | 'auto'>('auto');

  constructor() {
    effect(() => {
      const picker = new Picker({
        data,
        onEmojiSelect: (emoji: any) => this.clickedEmoji.emit(emoji),
        previewPosition: 'none',
        searchPosition: 'none',
        locale: this.locale() || 'en',
        theme: this.theme(),
        dynamicWidth: true,
      });

      this.elementRef.nativeElement.replaceChildren(picker as unknown as Node);
    });
  }
}
