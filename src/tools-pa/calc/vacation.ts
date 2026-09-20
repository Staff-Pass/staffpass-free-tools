/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (vacation accrual and
 * termination compensation). See `calc/overtime.ts` for the Decimal.js note.
 */
import { Decimal, money, quantity, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export function calculateVacationAccrual(input: {
  serviceDays: string;
  rule: VerifiableRule;
}) {
  requireVerified(input.rule);
  const serviceDays = toDecimal(input.serviceDays, 'serviceDays');
  const raw = serviceDays.div('11');
  return {
    code: input.rule.code,
    serviceDays: quantity(serviceDays),
    rawDays: raw.toString(),
    days: quantity(raw),
    fullYearEntitlement: serviceDays.gte('330'),
  };
}

export function calculateVacationCompensation(input: {
  accruedDays: string;
  averageMonthlySalary: string;
  lastMonthlySalary: string;
  rule: VerifiableRule;
}) {
  requireVerified(input.rule);
  const accruedDays = toDecimal(input.accruedDays, 'accruedDays');
  const averageSalary = toDecimal(
    input.averageMonthlySalary,
    'averageMonthlySalary',
  );
  const lastSalary = toDecimal(input.lastMonthlySalary, 'lastMonthlySalary');
  const favorableMonthlySalary = Decimal.max(averageSalary, lastSalary);
  const raw = favorableMonthlySalary.div('30').mul(accruedDays);
  return {
    code: input.rule.code,
    accruedDays: quantity(accruedDays),
    favorableMonthlySalary: money(favorableMonthlySalary),
    rawAmount: raw.toString(),
    amount: money(raw),
    basis: averageSalary.gte(lastSalary)
      ? 'AVERAGE_LAST_11_MONTHS'
      : 'LAST_MONTHLY_SALARY',
  } as const;
}
