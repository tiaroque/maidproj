export function hasKind(
  field:
    | { errors(): readonly { kind: string }[] }
    | (() => { errors(): readonly { kind: string }[] }),
  kind: string,
): boolean {
  const state = typeof field === 'function' ? field() : field;
  return state.errors().some((error) => error.kind === kind);
}

export function emptyToNull(value: string): string | null {
  return value ? value : null;
}
