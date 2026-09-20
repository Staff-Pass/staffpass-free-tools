/**
 * `tools-pa` is pure TypeScript: no `@nestjs/*`, `@prisma/*` or `node:*`
 * imports, and no imports from outside this folder (enforced by
 * `eslint.config.mjs`). This file is the single place that wraps
 * `decimal.js` and defines the one rounding rule every calculation in this
 * module uses, so every consumer (payroll adapters, the website bundle, the
 * admin API) rounds money exactly the same way.
 *
 * The original `payroll/domain/*.ts` formulas used `Prisma.Decimal`, which
 * itself wraps a decimal.js-shaped implementation with the same default
 * configuration (precision 20, `ROUND_HALF_UP`, verified at runtime against
 * both classes). Reusing `decimal.js` directly here reproduces that numeric
 * behaviour exactly — this is not a new rounding policy, it is the same one
 * with the Prisma wrapper removed.
 */
import Decimal from 'decimal.js';

export { Decimal };

/** Accepts the same inputs `new Prisma.Decimal(...)` accepted: string, number or Decimal. */
export type DecimalInput = string | number | Decimal;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

/**
 * Parses a decimal value the way the original calculators did: any finite
 * decimal is accepted, negative values are rejected unless explicitly
 * allowed, and a bad input throws a message naming the offending field
 * (matching the original `decimal(value, name)` helper's contract).
 */
export function toDecimal(
  value: DecimalInput,
  name: string,
  allowNegative = false,
): Decimal {
  let result: Decimal;
  try {
    result = new Decimal(value);
  } catch {
    throw new Error(`${name} must be a decimal`);
  }
  if (!result.isFinite() || (!allowNegative && result.lt(ZERO)))
    throw new Error(
      `${name} must be ${allowNegative ? 'a' : 'a non-negative'} decimal`,
    );
  return result;
}

/** Rounds to 2 decimal places, half-up — the money display format used everywhere in tools-pa. */
export function money(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/** Rounds to 4 decimal places, half-up — used for hour/day quantities, never for money. */
export function quantity(value: Decimal): string {
  return value.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}
