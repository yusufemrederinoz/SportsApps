import { readFileSync } from 'node:fs';

import { createResendMailer, type Mailer } from './mailer';

export function loadMailer(environment: NodeJS.ProcessEnv = process.env): Mailer | undefined {
  const { RESEND_API_KEY_PATH, MAIL_FROM } = environment;
  if (!RESEND_API_KEY_PATH || !MAIL_FROM) {
    return undefined;
  }
  return createResendMailer({ apiKey: readFileSync(RESEND_API_KEY_PATH, 'utf8').trim(), from: MAIL_FROM });
}
