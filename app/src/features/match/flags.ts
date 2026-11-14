const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);
const BLACK_FLAG = 0x1f3f4;
const TAG_OFFSET = 0xe0061 - 'a'.charCodeAt(0);
const CANCEL_TAG = 0xe007f;
const SUBDIVISION_FLAGS = new Set(['GB-ENG', 'GB-SCT', 'GB-WLS']);

export function flagEmoji(countryCode: string | null): string | null {
  if (countryCode && SUBDIVISION_FLAGS.has(countryCode)) {
    const tag = countryCode.replace('-', '').toLowerCase();
    return String.fromCodePoint(BLACK_FLAG, ...Array.from(tag, (letter) => letter.charCodeAt(0) + TAG_OFFSET), CANCEL_TAG);
  }
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return null;
  }
  return String.fromCodePoint(...Array.from(countryCode, (letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
}
