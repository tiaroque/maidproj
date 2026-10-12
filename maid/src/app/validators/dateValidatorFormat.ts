export function invalidDateFormatError(value: string) {
  if (!value) {
    return undefined;
  }

  const isValidFormat =
    /^(3[01]|[12][0-9]|0?[1-9])(\/|-)(1[0-2]|0?[1-9])\2([0-9]{4})$/.test(
      value,
    );

  return isValidFormat ? undefined : { kind: 'invalidDateFormat' as const };
}
