import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else output.push(path);
  }
  return output;
}

const forbidden = [/^@nestjs\//, /^@prisma\//, /firebase/, /public-tools/, /^node:/];
const violations = [];
for (const file of await files('src/tools-pa')) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const source = await readFile(file, 'utf8');
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/g)].map((match) => match[2]);
  for (const specifier of imports) {
    for (const pattern of forbidden) if (pattern.test(specifier)) violations.push(`${file}: forbidden import ${specifier}`);
  }
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Architecture boundary OK: the calculation engine is private-backend independent.');
