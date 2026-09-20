/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (décimo tercer mes / thirteenth
 * month). See `calc/overtime.ts` for the Decimal.js/Prisma.Decimal note.
 */
import { ZERO, money, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

export function calculateThirteenthMonth(input: {
  salaryByCuatrimestre: string[];
  partialCuatrimestre?: boolean;
  rule: VerifiableRule;
  divisor?: string;
  partialTreatment?: {
    code: string;
    mode: 'FULL_BASE' | 'PRORATE_BY_SERVICE_DAYS';
    serviceDays?: string;
    cuatrimestreDays?: string;
    verified: boolean;
  };
}) {
  requireVerified(input.rule);
  if (!input.salaryByCuatrimestre.length)
    throw new Error('A thirteenth-month calculation requires one cuatrimestre');
  if (input.partialCuatrimestre) {
    if (!input.partialTreatment)
      throw new Error('DECIMO_PRORRATEO_NO_VERIFICADO');
    requireVerified(input.partialTreatment);
    if (
      input.partialTreatment.mode !== 'FULL_BASE' &&
      input.partialTreatment.mode !== 'PRORATE_BY_SERVICE_DAYS'
    )
      throw new Error('DECIMO_PRORRATEO_MODE_INVALID');
  }
  const salary = input.salaryByCuatrimestre.reduce(
    (sum, value, index) =>
      sum.plus(toDecimal(value, `salaryByCuatrimestre[${index}]`)),
    ZERO,
  );
  const divisor = toDecimal(input.divisor ?? '12', 'thirteenthMonth.divisor');
  if (divisor.isZero())
    throw new Error('thirteenthMonth.divisor must be greater than zero');
  let raw = salary.div(divisor);
  if (
    input.partialCuatrimestre &&
    input.partialTreatment?.mode === 'PRORATE_BY_SERVICE_DAYS'
  ) {
    const serviceDays = toDecimal(
      input.partialTreatment.serviceDays ?? '',
      'partialTreatment.serviceDays',
    );
    const cuatrimestreDays = toDecimal(
      input.partialTreatment.cuatrimestreDays ?? '',
      'partialTreatment.cuatrimestreDays',
    );
    if (cuatrimestreDays.isZero())
      throw new Error(
        'partialTreatment.cuatrimestreDays must be greater than zero',
      );
    raw = raw.mul(serviceDays).div(cuatrimestreDays);
  }
  return {
    code: input.rule.code,
    eligibleSalary: salary.toString(),
    rawAmount: raw.toString(),
    amount: money(raw),
    partialTreatment: input.partialTreatment?.mode ?? null,
    rounding: 'HALF_UP_2_DECIMALS' as const,
  };
}
