import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ignored = new Set(['node_modules', 'dist', 'dist-web', '.git', 'pnpm-lock.yaml']);
async function files(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else output.push(path);
  }
  return output;
}
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /sk_(?:live|test)_[0-9A-Za-z]{20,}/,
  /gh[ps]_[0-9A-Za-z]{30,}/,
];
const hits = [];
for (const file of await files('.')) {
  const source = await readFile(file, 'utf8').catch(() => '');
  if (patterns.some((pattern) => pattern.test(source))) hits.push(file);
}
if (hits.length) {
  console.error(`Possible secrets found:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log('Secret pattern scan OK.');
