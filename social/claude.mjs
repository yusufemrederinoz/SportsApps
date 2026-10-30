import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ARGUMENT = /^[\w\-./:\\]+$/;

export function askClaude({ systemFile, prompt, cwd, tools = [], model = 'sonnet', timeoutMs = 180_000 }) {
  const args = [
    '-p',
    '--output-format',
    'json',
    '--model',
    model,
    '--tools',
    tools.length > 0 ? tools.join(',') : '""',
    '--setting-sources',
    'local',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--system-prompt-file',
    fileURLToPath(systemFile),
  ];
  for (const arg of args) {
    if (arg !== '""' && !ARGUMENT.test(arg)) throw new Error(`unsafe argument: ${arg}`);
  }
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, shell: true, windowsHide: true });
    let output = '';
    let errors = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('claude timed out'));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      errors += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const payload = JSON.parse(output);
        if (payload.is_error) {
          reject(new Error(`claude error: ${payload.result ?? payload.subtype}`));
          return;
        }
        resolve(payload.result);
      } catch {
        reject(new Error(`claude exited ${code}: ${(errors || output).slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt);
  });
}

export function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON in reply');
  return JSON.parse(text.slice(start, end + 1));
}
