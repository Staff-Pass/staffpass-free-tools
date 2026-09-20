/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (CSS, seguro educativo y
 * riesgos profesionales). See `calc/overtime.ts` for the Decimal.js note.
 *
 * Riesgo profesional has no catalog rate (see `docs/panama-legal-rules.md`
 * §6, `RIESGOS_PROFESIONALES_CLASE`): callers pass `riskRate` explicitly, or
 * it defaults to `0` and the caller is responsible for surfacing the
 * "missing risk rate" assumption (done by `calc/employer-cost.ts` in tool
 * mode).
 */
import { ONE, money, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export function calculateContributions(input: {
  base: string;
  employeeRate?: string;
  employerRate?: string;
  educationBase?: string;
  employeeEducationRate?: string;
  employerEducationRate?: string;
  riskBase?: string;
  riskRate?: string;
  rules: VerifiableRule[];
}) {
  for (const rule of input.rules) requireVerified(rule);
  const base = toDecimal(input.base, 'contributionBase');
  const employeeRate = toDecimal(input.employeeRate ?? '0', 'employeeRate');
  const employerRate = toDecimal(input.employerRate ?? '0', 'employerRate');
  const educationBase = toDecimal(
    input.educationBase ?? input.base,
    'educationBase',
  );
  const employeeEducationRate = toDecimal(
    input.employeeEducationRate ?? '0',
    'employeeEducationRate',
  );
  const employerEducationRate = toDecimal(
    input.employerEducationRate ?? '0',
    'employerEducationRate',
  );
  const riskBase = toDecimal(input.riskBase ?? input.base, 'riskBase');
  const riskRate = toDecimal(input.riskRate ?? '0', 'riskRate');
  if (
    employeeRate.gt(ONE) ||
    employerRate.gt(ONE) ||
    employeeEducationRate.gt(ONE) ||
    employerEducationRate.gt(ONE) ||
    riskRate.gt(ONE)
  )
    throw new Error('Contribution rates must be fractions between 0 and 1');
  return {
    base: money(base),
    educationBase: money(educationBase),
    riskBase: money(riskBase),
    employee: money(base.mul(employeeRate)),
    employer: money(base.mul(employerRate)),
    educationEmployee: money(educationBase.mul(employeeEducationRate)),
    educationEmployer: money(educationBase.mul(employerEducationRate)),
    risk: money(riskBase.mul(riskRate)),
    rates: {
      employee: employeeRate.toString(),
      employer: employerRate.toString(),
      educationEmployee: employeeEducationRate.toString(),
      educationEmployer: employerEducationRate.toString(),
      risk: riskRate.toString(),
    },
  };
}
