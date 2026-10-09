import { PLAY_PROTOCOL_VERSION } from '@sportapps/protocol';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api';
import type { ApiClient } from '@/api/client';
import version from '@/assets/data/version.json';

import { needsUpdate, type InstalledVersion } from './requirement';

const INSTALLED: InstalledVersion = { protocol: PLAY_PROTOCOL_VERSION, dataVersion: version.dataVersion };

export function useUpdateRequired(client: Pick<ApiClient, 'version'> = api): boolean {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () => {
      client
        .version()
        .then((requirement) => {
          if (active) {
            setRequired(needsUpdate(INSTALLED, requirement));
          }
        })
        .catch(() => undefined);
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [client]);

  return required;
}
