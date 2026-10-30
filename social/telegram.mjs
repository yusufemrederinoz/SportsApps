import { writeFileSync } from 'node:fs';

export function createTelegram(token) {
  const base = `https://api.telegram.org/bot${token}`;

  async function call(method, body = {}) {
    const response = await fetch(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(`${method}: ${payload.description}`);
    return payload.result;
  }

  async function download(fileId, target) {
    const file = await call('getFile', { file_id: fileId });
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!response.ok) throw new Error(`download: ${response.status}`);
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }

  return { call, download };
}
