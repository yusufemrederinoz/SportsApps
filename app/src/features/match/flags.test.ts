import { describe, expect, it } from 'vitest';

import { flagEmoji } from './flags';

describe('flagEmoji', () => {
  it('turns a two-letter country code into its flag', () => {
    expect(flagEmoji('TR')).toBe('\u{1F1F9}\u{1F1F7}');
    expect(flagEmoji('DE')).toBe('\u{1F1E9}\u{1F1EA}');
  });

  it('returns nothing for missing or subdivision codes', () => {
    expect(flagEmoji(null)).toBeNull();
    expect(flagEmoji('GB-ENG')).toBeNull();
    expect(flagEmoji('tr')).toBeNull();
  });
});
