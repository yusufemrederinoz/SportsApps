import type { VersionResponse } from '@sportapps/protocol';

export interface InstalledVersion {
  protocol: number;
  schemaVersion: number;
  bundledDataVersion: string;
  activeDataVersion: string;
}

export type UpdateDecision =
  | { action: 'keep' }
  | { action: 'update-app' }
  | { action: 'switch'; dataVersion: string }
  | { action: 'download'; dataVersion: string };

export function decideUpdate(
  installed: InstalledVersion,
  required: VersionResponse,
  isDownloaded: (dataVersion: string) => boolean,
): UpdateDecision {
  if (required.protocol > installed.protocol) {
    return { action: 'update-app' };
  }
  const { dataVersion, schemaVersion } = required;
  if (dataVersion === null || dataVersion === installed.activeDataVersion) {
    return { action: 'keep' };
  }
  if (schemaVersion === undefined || schemaVersion === null) {
    return dataVersion > installed.activeDataVersion ? { action: 'update-app' } : { action: 'keep' };
  }
  if (schemaVersion !== installed.schemaVersion) {
    return { action: 'update-app' };
  }
  if (dataVersion === installed.bundledDataVersion || isDownloaded(dataVersion)) {
    return { action: 'switch', dataVersion };
  }
  return { action: 'download', dataVersion };
}
