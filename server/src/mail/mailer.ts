export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type Mailer = (mail: Mail) => Promise<void>;

export interface ResendSettings {
  apiKey: string;
  from: string;
}

const RESEND_URL = 'https://api.resend.com/emails';

export function createResendMailer(settings: ResendSettings, fetcher: typeof fetch = fetch): Mailer {
  return async (mail) => {
    const response = await fetcher(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: settings.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!response.ok) {
      throw new Error(`mail service answered ${response.status}`);
    }
  };
}
