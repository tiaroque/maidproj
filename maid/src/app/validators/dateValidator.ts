import { isValid, parse } from 'date-fns';

export function invalidDateError(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = parse(value, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? undefined : { kind: 'invalidDate' as const };
}
