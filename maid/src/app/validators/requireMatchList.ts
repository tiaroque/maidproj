import { AbstractControl, ValidatorFn } from '@angular/forms';

export function RequireMatchList(list: any[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: boolean } | null => {
    if (list.map((l) => l.name).includes(control.value)) {
      return { incorrect: true };
    }

    return null;
  };
}
