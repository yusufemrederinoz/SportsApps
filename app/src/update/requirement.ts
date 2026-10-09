import type { VersionResponse } from '@sportapps/protocol';

export interface InstalledVersion {
  protocol: number;
  dataVersion: string;
}

export function needsUpdate(installed: InstalledVersion, required: VersionResponse): boolean {
  if (required.protocol > installed.protocol) {
    return true;
  }
  return required.dataVersion !== null && required.dataVersion > installed.dataVersion;
}
