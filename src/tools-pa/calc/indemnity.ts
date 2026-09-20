/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (indemnización por despido
 * injustificado, Art. 225 Código de Trabajo post reforma Ley 44/1995). See
 * `calc/overtime.ts` for the Decimal.js note.
 */
import { Decimal, ZERO, money, quantity, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export function calculateIndemnity(input: {
  averageMonthlySalary: string;
  serviceYears: string;
  rule: VerifiableRule;
}) {
  requireVerified(input.rule);
  const monthly = toDecimal(input.averageMonthlySalary, 'averageMonthlySalary');
  const years = toDecimal(input.serviceYears, 'serviceYears');
  const firstTen = Decimal.min(years, '10');
  const overTen = Decimal.max(years.minus('10'), ZERO);
  const weeks = firstTen.mul('3.4').plus(overTen);
  const weekly = monthly.mul('12').div('52');
  const raw = weekly.mul(weeks);
  return {
    code: input.rule.code,
    serviceYears: quantity(years),
    weeks: quantity(weeks),
    weeklySalary: money(weekly),
    rawAmount: raw.toString(),
    amount: money(raw),
  };
}
