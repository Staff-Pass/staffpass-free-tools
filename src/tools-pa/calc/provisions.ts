/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (monthly accounting
 * provisions — see `docs/panama-legal-rules.md` §8; these are prorateo
 * formulas, not standalone legal text). See `calc/overtime.ts` for the
 * Decimal.js note.
 */
import { Decimal, ZERO, money, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export type MonthlyProvisionInput = {
  monthlySalary: string;
  averageMonthlySalary?: string;
  indemnityRate?: string;
  riskRate?: string;
  rules: Array<
    VerifiableRule & {
      formula:
        | 'MONTHLY_DIVISOR'
        | 'MONTHLY_TIMES_RATE'
        | 'MONTHLY_TIMES_NUMERATOR_OVER_DENOMINATOR';
      divisor?: string;
      rate?: string;
      numerator?: string;
      denominator?: string;
    }
  >;
};

export type PanamaMoneyLine = {
  code: string;
  rawAmount: string;
  amount: string;
};

export function calculateMonthlyProvisions(input: MonthlyProvisionInput) {
  const monthlySalary = toDecimal(input.monthlySalary, 'monthlySalary');
  const averageSalary = toDecimal(
    input.averageMonthlySalary ?? input.monthlySalary,
    'averageMonthlySalary',
  );
  const lines: PanamaMoneyLine[] = input.rules.map((rule) => {
    requireVerified(rule);
    let raw: Decimal;
    switch (rule.formula) {
      case 'MONTHLY_DIVISOR': {
        const divisor = toDecimal(rule.divisor ?? '', `${rule.code}.divisor`);
        if (divisor.isZero())
          throw new Error(`${rule.code}.divisor must be greater than zero`);
        raw = monthlySalary.div(divisor);
        break;
      }
      case 'MONTHLY_TIMES_RATE':
        raw = monthlySalary.mul(
          toDecimal(rule.rate ?? '', `${rule.code}.rate`),
        );
        break;
      case 'MONTHLY_TIMES_NUMERATOR_OVER_DENOMINATOR': {
        const numerator = toDecimal(
          rule.numerator ?? '',
          `${rule.code}.numerator`,
        );
        const denominator = toDecimal(
          rule.denominator ?? '',
          `${rule.code}.denominator`,
        );
        if (denominator.isZero())
          throw new Error(`${rule.code}.denominator must be greater than zero`);
        raw = averageSalary.mul(numerator).div(denominator);
        break;
      }
    }
    return { code: rule.code, rawAmount: raw.toString(), amount: money(raw) };
  });
  const total = lines.reduce((sum, line) => sum.plus(line.amount), ZERO);
  return {
    lines,
    total: money(total),
    rounding: 'HALF_UP_PER_COMPONENT_2_DECIMALS' as const,
  };
}
