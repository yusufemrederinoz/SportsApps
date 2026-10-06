const FOLDS: Readonly<Record<string, string>> = {
  ı: 'i',
  İ: 'i',
  ø: 'o',
  Ø: 'o',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  ł: 'l',
  Ł: 'l',
  ß: 'ss',
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  þ: 'th',
};

const COMBINING_MARK = /\p{M}/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

export function normalizeName(value: string): string {
  const folded = Array.from(value, (char) => FOLDS[char] ?? char)
    .join('')
    .toLowerCase()
    .normalize('NFKD');
  const kept = Array.from(folded, (char) => {
    if (COMBINING_MARK.test(char)) {
      return '';
    }
    return LETTER_OR_NUMBER.test(char) ? char : ' ';
  }).join('');
  return kept.split(' ').filter(Boolean).join(' ');
}

export function nameTokens(value: string): string[] {
  const normalized = normalizeName(value);
  return normalized ? normalized.split(' ') : [];
}
