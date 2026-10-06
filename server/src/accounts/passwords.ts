import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCHEME = 'scrypt';
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAXIMUM_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallelization: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelization, maxmem: MAXIMUM_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION);
  return [SCHEME, COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, blockSize, parallelization, salt, key] = stored.split('$');
  if (scheme !== SCHEME || !cost || !blockSize || !parallelization || !salt || !key) {
    return false;
  }
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), Number(cost), Number(blockSize), Number(parallelization));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
