import { differenceInYears, parse } from 'date-fns';

export function invalidAgeError(value: string) {
  if (!value) {
    return undefined;
  }

  const dateBirthday = parse(value, 'dd/MM/yyyy', new Date());
  const difference = differenceInYears(new Date(), dateBirthday);
  if (difference < 18) {
    return { kind: 'ageInvalid' as const };
  }

  return undefined;
}
