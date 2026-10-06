import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import databaseAsset from '@/assets/data/football.db';
import version from '@/assets/data/version.json';

const DATABASE_NAME = `football-${version.dataVersion}.db`;

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} assetSource={{ assetId: databaseAsset }}>
      {children}
    </SQLiteProvider>
  );
}
