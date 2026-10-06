const DEVELOPMENT_PORT = 4000;

export function resolveApiUrl(
  configured: string | undefined,
  developmentHost: string | null | undefined,
  development: boolean,
): string | null {
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  const host = developmentHost?.split(':')[0];
  return development && host ? `http://${host}:${DEVELOPMENT_PORT}` : null;
}
