export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${(Array.from(part)[0] ?? '').toLocaleUpperCase()}.`)
    .join(' ');
}

export function surnameOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).at(-1) ?? name;
}
