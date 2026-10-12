import { inject, Pipe, PipeTransform } from '@angular/core';
import { UtilsService } from '../../services/utils.service';

@Pipe({
  name: 'datetransform',
  pure: true,
  standalone: true,
})
export class DateTransformPipe implements PipeTransform {
  utilsService = inject(UtilsService);
  transform(value: string | undefined, ...args: string[]): string {
    if (!value) {
      return '';
    }
    const [locale = 'en', mode = 'weekDays'] = args;
    return this.utilsService.manageDateFormat(new Date(value), mode);
  }
}
