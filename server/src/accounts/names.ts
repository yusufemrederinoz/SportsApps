import blocked from './blocked-names.json' with { type: 'json' };

const LOOKALIKES: Readonly<Record<string, string>> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', ı: 'i', ß: 'ss' };
const SEPARATORS = /[_\d]+/;

function folded(value: string): string {
  return Array.from(value.toLowerCase().normalize('NFKD'))
    .filter((character) => !/\p{M}/u.test(character))
    .map((character) => LOOKALIKES[character] ?? character)
    .join('');
}

export function isAllowedUsername(value: string): boolean {
  const plain = folded(value).replaceAll('_', '');
  if (blocked.anywhere.some((term) => plain.includes(term))) {
    return false;
  }
  const words = value.toLowerCase().split(SEPARATORS).map(folded);
  return !blocked.whole.some((term) => plain === term || words.includes(term));
}
