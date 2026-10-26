import { differenceInYears, parse } from 'date-fns';

// Keep aligned with MAX_AGE in wish-backend-ts/src/validators/xprofile.validators.ts.
export const MIN_AGE = 18;
export const MAX_AGE = 99;

export function invalidAgeError(value: string) {
  if (!value) {
    return undefined;
  }

  const dateBirthday = parse(value, 'dd/MM/yyyy', new Date());
  const difference = differenceInYears(new Date(), dateBirthday);
  if (difference < MIN_AGE) {
    return { kind: 'ageInvalid' as const };
  }
  if (difference > MAX_AGE) {
    return { kind: 'ageTooOld' as const };
  }

  return undefined;
}
