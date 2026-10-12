import { describe, expect, it } from 'vitest';

import { databaseName, startingDataVersion } from './data-version';

const BUNDLED = '20261012143758';
const DOWNLOADED = '20261101000000';
const available = (version: string) => version === DOWNLOADED;

describe('startingDataVersion', () => {
  it('starts from the bundled data on a fresh install', () => {
    expect(startingDataVersion(BUNDLED, null, available)).toBe(BUNDLED);
  });

  it('starts from the data downloaded under this app version', () => {
    expect(startingDataVersion(BUNDLED, { bundled: BUNDLED, version: DOWNLOADED }, available)).toBe(DOWNLOADED);
  });

  it('goes back to the bundled data when the file is gone or the app was updated', () => {
    expect(startingDataVersion(BUNDLED, { bundled: BUNDLED, version: DOWNLOADED }, () => false)).toBe(BUNDLED);
    expect(startingDataVersion(BUNDLED, { bundled: '20261009123459', version: DOWNLOADED }, available)).toBe(BUNDLED);
  });
});

describe('databaseName', () => {
  it('keeps every data version in its own file', () => {
    expect(databaseName(BUNDLED)).toBe('football-20261012143758.db');
  });
});
