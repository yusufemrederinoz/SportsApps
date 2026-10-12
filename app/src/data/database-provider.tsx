import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import databaseAsset from '@/assets/data/football.db';

import { dataDirectory, forgetChoice, isDownloaded, readStoredChoice } from './data-files';
import {
  BUNDLED_DATA_VERSION,
  activateDataVersion,
  databaseName,
  startingDataVersion,
  useDataVersion,
} from './data-version';

activateDataVersion(startingDataVersion(BUNDLED_DATA_VERSION, readStoredChoice(), isDownloaded));

async function confirmReadable(database: SQLiteDatabase): Promise<void> {
  await database.getFirstAsync('SELECT value FROM meta LIMIT 1');
}

function returnToBundledData(): void {
  forgetChoice();
  activateDataVersion(BUNDLED_DATA_VERSION);
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  const dataVersion = useDataVersion();
  const name = databaseName(dataVersion);

  return dataVersion === BUNDLED_DATA_VERSION ? (
    <SQLiteProvider key={name} databaseName={name} assetSource={{ assetId: databaseAsset }}>
      {children}
    </SQLiteProvider>
  ) : (
    <SQLiteProvider
      key={name}
      databaseName={name}
      directory={dataDirectory()}
      onInit={confirmReadable}
      onError={returnToBundledData}
    >
      {children}
    </SQLiteProvider>
  );
}
