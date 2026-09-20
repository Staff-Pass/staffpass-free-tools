/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (ISR progressive brackets and
 * periodic withholding projection). See `calc/overtime.ts` for the
 * Decimal.js note.
 */
import { Decimal, ONE, ZERO, money, toDecimal } from '../money';

export type IsrBracket = {
  annualFrom: string;
  annualTo?: string | null;
  rate: string;
};

export function calculateProgressivePanamaIsr(
  taxableIncome: string,
  brackets: IsrBracket[],
) {
  const income = toDecimal(taxableIncome, 'taxableIncome');
  if (!brackets.length) throw new Error('At least one ISR bracket is required');
  const normalized = brackets
    .map((bracket, index) => ({
      from: toDecimal(bracket.annualFrom, `brackets[${index}].annualFrom`),
      to: bracket.annualTo
        ? toDecimal(bracket.annualTo, `brackets[${index}].annualTo`)
        : null,
      rate: toDecimal(bracket.rate, `brackets[${index}].rate`),
    }))
    .sort((left, right) => left.from.comparedTo(right.from));
  let total: Decimal = ZERO;
  for (const [index, bracket] of normalized.entries()) {
    if (bracket.rate.gt(ONE))
      throw new Error('ISR rates must be fractions between 0 and 1');
    if (bracket.to && bracket.to.lte(bracket.from))
      throw new Error(`Invalid ISR bracket ${index}`);
    const upper = bracket.to ? Decimal.min(income, bracket.to) : income;
    const taxableSpan = Decimal.max(upper.minus(bracket.from), ZERO);
    total = total.plus(taxableSpan.mul(bracket.rate));
  }
  return {
    taxableIncome: money(income),
    annualTax: money(total),
    rawAnnualTax: total.toString(),
    rounding: 'HALF_UP_2_DECIMALS' as const,
  };
}

export function calculatePeriodicIsrWithholding(input: {
  projectedRegularIncome: string;
  projectedThirteenthIncome?: string;
  projectedBonusIncome?: string;
  projectedDeductions?: string;
  incomeTaxAlreadyWithheld: string;
  remainingPeriods: number;
  brackets: IsrBracket[];
}) {
  if (!Number.isInteger(input.remainingPeriods) || input.remainingPeriods < 1)
    throw new Error('remainingPeriods must be a positive integer');
  const gross = toDecimal(
    input.projectedRegularIncome,
    'projectedRegularIncome',
  )
    .plus(
      toDecimal(
        input.projectedThirteenthIncome ?? '0',
        'projectedThirteenthIncome',
      ),
    )
    .plus(toDecimal(input.projectedBonusIncome ?? '0', 'projectedBonusIncome'));
  const deductions = toDecimal(
    input.projectedDeductions ?? '0',
    'projectedDeductions',
  );
  const taxableIncome = Decimal.max(gross.minus(deductions), ZERO);
  const annual = calculateProgressivePanamaIsr(
    taxableIncome.toString(),
    input.brackets,
  );
  const alreadyWithheld = toDecimal(
    input.incomeTaxAlreadyWithheld,
    'incomeTaxAlreadyWithheld',
  );
  const remaining = Decimal.max(
    new Decimal(annual.rawAnnualTax).minus(alreadyWithheld),
    ZERO,
  );
  const current = remaining.div(input.remainingPeriods);
  return {
    projectedGross: money(gross),
    projectedDeductions: money(deductions),
    projectedTaxableIncome: money(taxableIncome),
    annualTax: annual.annualTax,
    remainingTax: money(remaining),
    currentWithholding: money(current),
    remainingPeriods: input.remainingPeriods,
  };
}
