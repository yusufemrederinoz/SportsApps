import { describe, expect, it } from 'vitest';

import { isAllowedUsername } from '../src/accounts/names';

describe('isAllowedUsername', () => {
  it('refuses offensive words however they are dressed up', () => {
    for (const name of ['Orospu', 'or0spu_99', 'SİKTİR', 'xFuckx', 'sh1t_head', 'Hurens0hn', 'el_cabrón', 'stronzo7']) {
      expect(isAllowedUsername(name), name).toBe(false);
    }
  });

  it('refuses short offensive words only when they stand alone', () => {
    for (const name of ['amk', 'AMK_10', 'sik', 'puta_madre', 'nazi88']) {
      expect(isAllowedUsername(name), name).toBe(false);
    }
  });

  it('keeps ordinary names that merely contain those letters', () => {
    for (const name of ['Besiktas1903', 'Beşiktaşlı', 'Kaptan10', 'Arda_10', 'Nazim', 'Klasik', 'Reputacion', 'Picasso', 'Computer', 'Scunthorpe']) {
      expect(isAllowedUsername(name), name).toBe(true);
    }
  });
});
