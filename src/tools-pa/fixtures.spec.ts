/**
 * Golden fixtures (spec §5.6). Each `fixtures/*.json` file is
 * `{ name, fn, input, expected }`: `fn` names a public export of
 * `src/tools-pa/index.ts`, called with `input`, and its result must equal
 * `expected` exactly.
 *
 * These fixtures are copied to the website by
 * `scripts/sync-tools-bundle.mjs`, where `node --test` runs the same
 * `{fn, input, expected}` triples against the built bundle. Running them
 * here, against the TypeScript source, and there, against the esbuild
 * output, is what guarantees the same input produces the same figure in
 * both places — this spec is the source-side half of that guarantee.
 *
 * This file (and every other `*.spec.ts` in tools-pa) is exempt from the
 * `no-restricted-imports` purity rule in `eslint.config.mjs`: it is test
 * harness code, never bundled by `scripts/build-tools-bundle.mjs`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toolsPa from './index';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

type Fixture = {
  name: string;
  fn: keyof typeof toolsPa;
  input: unknown;
  expected: unknown;
};

function loadFixtures(): Array<{ file: string; fixture: Fixture }> {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      fixture: JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'),
      ) as Fixture,
    }));
}

describe('tools-pa golden fixtures', () => {
  const fixtures = loadFixtures();

  it('found at least one fixture per calculator (paycheck, liquidation, contract)', () => {
    const fnNames = new Set(fixtures.map(({ fixture }) => fixture.fn));
    expect(fnNames).toEqual(
      new Set([
        'calculatePaycheck',
        'calculateLiquidation',
        'validateContract',
      ]),
    );
  });

  it.each(fixtures.map(({ file, fixture }) => [file, fixture] as const))(
    '%s',
    (_file, fixture) => {
      const fn = toolsPa[fixture.fn];
      if (typeof fn !== 'function')
        throw new Error(
          `Fixture fn "${String(fixture.fn)}" is not an exported function`,
        );
      const actual = (fn as (input: unknown) => unknown)(fixture.input);
      expect(actual).toEqual(fixture.expected);
    },
  );
});
