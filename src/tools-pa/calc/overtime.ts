/**
 * Extracted, without any numeric change, from
 * `payroll/domain/panama-legal-calculator.ts` (workday classification,
 * day/rest/holiday surcharges and overtime pay). `Prisma.Decimal` is
 * replaced by `decimal.js`'s `Decimal`; Prisma itself wraps `decimal.js`
 * with the same defaults, so the arithmetic is identical.
 */
import { Decimal, ONE, ZERO, money, quantity, toDecimal } from '../money';
import { requireVerified, type VerifiableRule } from './shared';

const DAY_MINUTES = 24 * 60;
const NIGHT_MINUTES_PER_DAY = 12 * 60;

export type PanamaWorkPeriod = 'DAY' | 'NIGHT' | 'MIXED';
export type PanamaDayType =
  | 'ORDINARY'
  | 'WEEKLY_REST'
  | 'COMPENSATORY_REST'
  | 'HOLIDAY';

export type WorkInterval = {
  startMinute: number;
  endMinute: number;
};

export type OvertimeRuleInput = VerifiableRule & { rate: string };
export type PanamaSurchargeRuleInput = OvertimeRuleInput;

export type OvertimePayInput = {
  baseHourlyRate: string;
  overtimeHours: string;
  overtimeHoursTodayBefore: string;
  overtimeHoursWeekBefore: string;
  rule: OvertimeRuleInput;
  dailyCapHours?: string;
  weeklyCapHours?: string;
  excessRate?: string;
  excessRule?: OvertimeRuleInput;
  dayRule?: PanamaSurchargeRuleInput;
  combinationRule?: { code: string; verified: boolean };
};

function validateMinute(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= DAY_MINUTES)
    throw new Error(`${name} must be an integer minute from 0 to 1439`);
}

function intervalDuration(start: number, end: number): number {
  const normalizedEnd = end <= start ? end + DAY_MINUTES : end;
  return normalizedEnd - start;
}

function nocturnalMinutesInInterval(start: number, end: number): number {
  const normalizedEnd = end <= start ? end + DAY_MINUTES : end;
  let total = 0;
  for (let day = 0; day <= 1; day += 1) {
    const dayStart = day * DAY_MINUTES;
    const dayEnd = dayStart + DAY_MINUTES;
    const overlapStart = Math.max(start, dayStart);
    const overlapEnd = Math.min(normalizedEnd, dayEnd);
    if (overlapEnd <= overlapStart) continue;
    const localStart = overlapStart - dayStart;
    const localEnd = overlapEnd - dayStart;
    total += Math.max(0, Math.min(localEnd, 360) - localStart);
    total += Math.max(0, localEnd - Math.max(localStart, 1080));
  }
  return total;
}

/** Classifies a shift using 18:00-06:00 and the strict three-hour threshold. */
export function classifyPanamaWorkday(interval: WorkInterval) {
  validateMinute(interval.startMinute, 'startMinute');
  validateMinute(interval.endMinute, 'endMinute');
  const duration = intervalDuration(interval.startMinute, interval.endMinute);
  if (duration <= 0 || duration > DAY_MINUTES)
    throw new Error('A work interval must be between 1 minute and 24 hours');
  const nocturnalMinutes = nocturnalMinutesInInterval(
    interval.startMinute,
    interval.endMinute,
  );
  const diurnalMinutes = duration - nocturnalMinutes;
  const period: PanamaWorkPeriod =
    nocturnalMinutes > 180
      ? 'NIGHT'
      : nocturnalMinutes > 0 && diurnalMinutes > 0
        ? 'MIXED'
        : 'DAY';
  const ordinaryHoursPerDay =
    period === 'NIGHT' ? '7' : period === 'MIXED' ? '7.5' : '8';
  const paidHoursPerDay = '8';
  return {
    period,
    durationMinutes: duration,
    nocturnalMinutes,
    diurnalMinutes,
    ordinaryHoursPerDay,
    paidHoursPerDay,
  } as const;
}

export function calculatePanamaDaySurcharge(input: {
  baseHourlyRate: string;
  hours: string;
  rule: PanamaSurchargeRuleInput;
}) {
  requireVerified(input.rule);
  const baseHourlyRate = toDecimal(input.baseHourlyRate, 'baseHourlyRate');
  const hours = toDecimal(input.hours, 'hours');
  const rate = toDecimal(input.rule.rate, 'rule.rate');
  const baseRaw = baseHourlyRate.mul(hours);
  const surchargeRaw = baseRaw.mul(rate);
  const totalRaw = baseRaw.plus(surchargeRaw);
  return {
    ruleCode: input.rule.code,
    hours: quantity(hours),
    baseAmount: money(baseRaw),
    surcharge: money(surchargeRaw),
    total: money(totalRaw),
    rawTotal: totalRaw.toString(),
    rounding: 'HALF_UP_2_DECIMALS' as const,
  };
}

/**
 * Calculates overtime in two buckets: hours within the daily/weekly caps and
 * hours beyond them. The cap and excess rates are explicit rule inputs.
 */
export function calculatePanamaOvertimePay(input: OvertimePayInput) {
  requireVerified(input.rule);
  const baseHourlyRate = toDecimal(input.baseHourlyRate, 'baseHourlyRate');
  const requestedHours = toDecimal(input.overtimeHours, 'overtimeHours');
  const todayBefore = toDecimal(
    input.overtimeHoursTodayBefore,
    'overtimeHoursTodayBefore',
  );
  const weekBefore = toDecimal(
    input.overtimeHoursWeekBefore,
    'overtimeHoursWeekBefore',
  );
  const dailyCap = toDecimal(input.dailyCapHours ?? '3', 'dailyCapHours');
  const weeklyCap = toDecimal(input.weeklyCapHours ?? '9', 'weeklyCapHours');
  if (input.dayRule) {
    requireVerified(input.dayRule);
    if (!input.combinationRule)
      throw new Error('RECARGO_COMBINACION_REGLA_REQUERIDA');
    requireVerified(input.combinationRule);
  }
  if (input.excessRule) requireVerified(input.excessRule);
  const excessRate = toDecimal(
    input.excessRule?.rate ?? input.excessRate ?? '0.75',
    'excessRate',
  );
  if (dailyCap.isZero() || weeklyCap.isZero())
    throw new Error('Overtime caps must be greater than zero');

  const dailyRemaining = Decimal.max(dailyCap.minus(todayBefore), ZERO);
  const weeklyRemaining = Decimal.max(weeklyCap.minus(weekBefore), ZERO);
  const regularHours = Decimal.min(
    requestedHours,
    dailyRemaining,
    weeklyRemaining,
  );
  const excessHours = requestedHours.minus(regularHours);
  const dayMultiplier = input.dayRule
    ? ONE.plus(toDecimal(input.dayRule.rate, 'dayRule.rate'))
    : ONE;
  const dayAdjustedHourlyRate = baseHourlyRate.mul(dayMultiplier);
  const ordinaryMultiplier = ONE.plus(toDecimal(input.rule.rate, 'rule.rate'));
  const excessMultiplier = ONE.plus(excessRate);
  const regularRaw = dayAdjustedHourlyRate
    .mul(regularHours)
    .mul(ordinaryMultiplier);
  const excessRaw = dayAdjustedHourlyRate
    .mul(excessHours)
    .mul(excessMultiplier);
  const totalRaw = regularRaw.plus(excessRaw);
  const baseRaw = baseHourlyRate.mul(requestedHours);
  const dayAdjustedRaw = dayAdjustedHourlyRate.mul(requestedHours);
  return {
    ruleCode: input.rule.code,
    requestedHours: quantity(requestedHours),
    regularHours: quantity(regularHours),
    excessHours: quantity(excessHours),
    regularAmount: money(regularRaw),
    excessAmount: money(excessRaw),
    baseAmount: money(baseRaw),
    daySurcharge: money(dayAdjustedRaw.minus(baseRaw)),
    overtimeSurcharge: money(totalRaw.minus(dayAdjustedRaw)),
    total: money(totalRaw),
    rawTotal: totalRaw.toString(),
    rounding: 'HALF_UP_2_DECIMALS' as const,
  };
}

export const PANAMA_NIGHT_MINUTES_PER_DAY = NIGHT_MINUTES_PER_DAY;
