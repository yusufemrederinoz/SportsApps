import { API_PREFIX, PLAY_PROTOCOL_VERSION, dataFilePath } from '@sportapps/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api, apiUrl } from '@/api';
import { discardOtherData, downloadData, isDownloaded, storeChoice } from '@/data/data-files';
import {
  BUNDLED_DATA_VERSION,
  DATA_SCHEMA_VERSION,
  activateDataVersion,
  activeDataVersion,
} from '@/data/data-version';

import { decideUpdate } from './requirement';

export type SyncStatus = 'current' | 'update-app' | 'downloading' | 'failed';

export interface DataSync {
  status: SyncStatus;
  retry: () => void;
  postpone: () => void;
}

async function synchronize(onDownload: () => void): Promise<SyncStatus | null> {
  const required = await api.version().catch(() => null);
  if (!required) {
    return null;
  }
  const decision = decideUpdate(
    {
      protocol: PLAY_PROTOCOL_VERSION,
      schemaVersion: DATA_SCHEMA_VERSION,
      bundledDataVersion: BUNDLED_DATA_VERSION,
      activeDataVersion: activeDataVersion(),
    },
    required,
    isDownloaded,
  );
  if (decision.action === 'update-app') {
    return 'update-app';
  }
  if (decision.action === 'keep') {
    return 'current';
  }
  if (decision.action === 'download') {
    onDownload();
    const url = `${apiUrl}${API_PREFIX}${dataFilePath(decision.dataVersion)}`;
    const downloaded = await downloadData(decision.dataVersion, url, required.dataSize ?? null).then(
      () => true,
      () => false,
    );
    if (!downloaded) {
      return 'failed';
    }
  }
  storeChoice(decision.dataVersion);
  activateDataVersion(decision.dataVersion);
  discardOtherData([decision.dataVersion, BUNDLED_DATA_VERSION]);
  return 'current';
}

export function useDataSync(): DataSync {
  const [status, setStatus] = useState<SyncStatus>('current');
  const busy = useRef(false);

  const run = useCallback(() => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    void synchronize(() => setStatus('downloading'))
      .then((next) => {
        if (next) {
          setStatus(next);
        }
      })
      .finally(() => {
        busy.current = false;
      });
  }, []);

  useEffect(() => {
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        run();
      }
    });
    return () => subscription.remove();
  }, [run]);

  return { status, retry: run, postpone: () => setStatus('current') };
}
