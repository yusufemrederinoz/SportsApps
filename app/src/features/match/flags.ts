const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);

export function flagEmoji(countryCode: string | null): string | null {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return null;
  }
  return String.fromCodePoint(...Array.from(countryCode, (letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
}
