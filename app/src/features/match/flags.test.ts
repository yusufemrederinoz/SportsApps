import { describe, expect, it } from 'vitest';

import { flagEmoji } from './flags';

describe('flagEmoji', () => {
  it('turns a two-letter country code into its flag', () => {
    expect(flagEmoji('TR')).toBe('\u{1F1F9}\u{1F1F7}');
    expect(flagEmoji('DE')).toBe('\u{1F1E9}\u{1F1EA}');
  });

  it('draws England, Scotland and Wales with their tag flags', () => {
    expect(flagEmoji('GB-ENG')).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
    expect(flagEmoji('GB-SCT')).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}');
    expect(flagEmoji('GB-WLS')).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}');
  });

  it('returns nothing for missing codes and parts without a flag', () => {
    expect(flagEmoji(null)).toBeNull();
    expect(flagEmoji('GB-NIR')).toBeNull();
    expect(flagEmoji('tr')).toBeNull();
  });
});
