import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await Promise.all([
  rm('dist', { recursive: true, force: true }),
  rm('dist-web', { recursive: true, force: true }),
]);
await Promise.all([mkdir('dist', { recursive: true }), mkdir('dist-web/assets', { recursive: true })]);

await build({
  entryPoints: ['src/tools-pa/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2023',
  external: ['decimal.js'],
  sourcemap: true,
});

await build({
  entryPoints: ['app/main.ts'],
  outfile: 'dist-web/assets/app.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  sourcemap: true,
});

await Promise.all([
  cp('app/index.html', 'dist-web/index.html'),
  cp('app/styles.css', 'dist-web/assets/styles.css'),
  cp('app/brand', 'dist-web/assets/brand', { recursive: true }),
  cp('licenses', 'dist-web/licenses', { recursive: true }),
  cp('LICENSE', 'dist-web/LICENSE'),
  cp('NOTICE', 'dist-web/NOTICE'),
  cp('THIRD_PARTY_NOTICES.md', 'dist-web/THIRD_PARTY_NOTICES.md'),
]);
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });

console.log('Built package in dist/ and standalone web app in dist-web/.');
