import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'slicedescription',
  standalone: true,
})
export class SliceDescriptionPipe implements PipeTransform {
  transform(value: string | undefined, ...args: number[]): string {
    if (!value) {
      return '';
    }

    const [numChars = 10] = args;

    return value.length > numChars ? value.slice(0, numChars) + '...' : value;
  }
}
