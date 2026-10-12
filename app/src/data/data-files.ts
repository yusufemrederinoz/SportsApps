import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';

import { BUNDLED_DATA_VERSION, DATA_SCHEMA_VERSION, databaseName, type StoredDataChoice } from './data-version';

const DATABASE_FOLDER = 'SQLite';
const CHOICE_FILE = 'football-data.json';
const PARTIAL_SUFFIX = '.partial';
const DATABASE_FILE = /^football-(\d{14})\.db/;
const UNPACKED = { headers: { 'Accept-Encoding': 'identity' } };
const FILE_SCHEME = 'file://';

function folder(): Directory {
  const directory = new Directory(Paths.document, DATABASE_FOLDER);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  return directory;
}

export function dataDirectory(): string {
  return folder().uri.slice(FILE_SCHEME.length);
}

export function readStoredChoice(): StoredDataChoice | null {
  try {
    const file = new File(folder(), CHOICE_FILE);
    return file.exists ? (JSON.parse(file.textSync()) as StoredDataChoice) : null;
  } catch {
    return null;
  }
}

export function storeChoice(dataVersion: string): void {
  try {
    const choice: StoredDataChoice = { bundled: BUNDLED_DATA_VERSION, version: dataVersion };
    new File(folder(), CHOICE_FILE).write(JSON.stringify(choice));
  } catch {
    return;
  }
}

export function forgetChoice(): void {
  try {
    const file = new File(folder(), CHOICE_FILE);
    if (file.exists) {
      file.delete();
    }
  } catch {
    return;
  }
}

export function isDownloaded(dataVersion: string): boolean {
  try {
    const file = new File(folder(), databaseName(dataVersion));
    return file.exists && file.size > 0;
  } catch {
    return false;
  }
}

async function schemaOf(name: string): Promise<number | null> {
  const database = await openDatabaseAsync(name, { useNewConnection: true }, dataDirectory());
  try {
    const row = await database.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'");
    const players = await database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM players');
    return row && players && players.total > 0 ? Number(row.value) : null;
  } finally {
    await database.closeAsync();
  }
}

async function fetchInto(partial: File, url: string, expectedSize: number | null, options?: typeof UNPACKED) {
  if (partial.exists) {
    partial.delete();
  }
  await File.downloadFileAsync(url, partial, options);
  if (expectedSize !== null && partial.size !== expectedSize) {
    throw new Error('downloaded data has the wrong size');
  }
  if ((await schemaOf(partial.name)) !== DATA_SCHEMA_VERSION) {
    throw new Error('downloaded data cannot be read');
  }
}

export async function downloadData(dataVersion: string, url: string, expectedSize: number | null): Promise<void> {
  const directory = folder();
  const partialName = `${databaseName(dataVersion)}${PARTIAL_SUFFIX}`;
  try {
    const partial = new File(directory, partialName);
    await fetchInto(partial, url, expectedSize).catch(() => fetchInto(partial, url, expectedSize, UNPACKED));
    const target = new File(directory, databaseName(dataVersion));
    if (target.exists) {
      target.delete();
    }
    partial.moveSync(target);
  } finally {
    const leftover = new File(directory, partialName);
    if (leftover.exists) {
      leftover.delete();
    }
  }
}

export function discardOtherData(keep: readonly string[]): void {
  try {
    for (const entry of folder().list()) {
      const version = entry instanceof File ? DATABASE_FILE.exec(entry.name)?.[1] : undefined;
      if (version && !keep.includes(version)) {
        entry.delete();
      }
    }
  } catch {
    return;
  }
}
