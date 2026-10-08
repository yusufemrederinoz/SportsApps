import type { AdSettings } from './service';
import { createAdSignatureVerifier } from './signature';

export function loadAdSettings(environment: NodeJS.ProcessEnv = process.env): AdSettings {
  const units = (environment.ADMOB_AD_UNITS ?? '')
    .split(',')
    .map((unit) => unit.trim().split('/').pop() ?? '')
    .filter(Boolean);
  return { units, verify: createAdSignatureVerifier() };
}
