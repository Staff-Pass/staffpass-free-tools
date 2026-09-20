/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (prima de antigüedad, Art. 224
 * Código de Trabajo). See `calc/overtime.ts` for the Decimal.js note.
 */
import { money, quantity, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export function calculateSeniorityPremium(input: {
  averageMonthlySalary: string;
  serviceYears: string;
  rule: VerifiableRule;
}) {
  requireVerified(input.rule);
  const monthly = toDecimal(input.averageMonthlySalary, 'averageMonthlySalary');
  const years = toDecimal(input.serviceYears, 'serviceYears');
  const weekly = monthly.mul('12').div('52');
  const raw = weekly.mul(years);
  return {
    code: input.rule.code,
    serviceYears: quantity(years),
    weeklySalary: money(weekly),
    rawAmount: raw.toString(),
    amount: money(raw),
  };
}
