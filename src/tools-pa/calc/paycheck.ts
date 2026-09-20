/**
 * Quincena / paycheck calculator (spec §5.3). Simple mode pays half the
 * monthly salary for a standard quincena (1st–15th, or 16th–last day of the
 * same month) and prorates by calendar days only for a non-standard range.
 * Detailed mode additionally applies overtime by day type, additional
 * income and voluntary deductions. ISR is withheld with the existing
 * progressive-bracket/periodic-withholding functions (`calc/isr.ts`),
 * reused as-is.
 *
 * This is an estimator, not a payslip engine: it has no access to the
 * employee's year-to-date history, so the ISR projection annualizes the
 * monthly salary including a full thirteenth month (× 13 total, spread over
 * 26 periods: 24 quincenas plus the three décimo payments) and treats this
 * quincena's overtime/additional income as a one-off, withholding only the
 * marginal tax those extras add — never as if they recurred all year. That
 * simplification, and its NO VERIFICADO basis (`ISR_METODO_RETENCION`,
 * `DECIMO_ISR_TRATAMIENTO`), is always disclosed as an assumption.
 */
import { Decimal, money, toDecimal } from '../money';
import {
  calculatePanamaDaySurcharge,
  calculatePanamaOvertimePay,
} from './overtime';
import {
  calculatePeriodicIsrWithholding,
  calculateProgressivePanamaIsr,
  type IsrBracket,
} from './isr';
import { calculateEmployerCost } from './employer-cost';
import { resolveRule } from '../rules/resolveRules';
import {
  appliedRuleFromResolved,
  asToolRule,
  buildToolResult,
  type AppliedRule,
  type ResultLine,
  type ToolResult,
} from '../tool-result';

const ISR_BRACKET_CODES = ['ISR_BRACKET_1', 'ISR_BRACKET_2', 'ISR_BRACKET_3'];
// 24 quincenas + the three décimo payments share the annual tax burden.
const DEFAULT_REMAINING_PERIODS = 26;
const DEFAULT_WEEKLY_HOURS = '48'; // jornada ordinaria diurna, Art. 31 CT

export type PaycheckOvertimeWorkPeriod = 'DAY' | 'NIGHT' | 'MIXED_NIGHT';
export type PaycheckOvertimeDayType =
  | 'ORDINARY'
  | 'WEEKLY_REST'
  | 'COMPENSATORY_REST'
  | 'HOLIDAY';

export type PaycheckOvertimeEntry = {
  dayType: PaycheckOvertimeDayType;
  /** Only meaningful when dayType is 'ORDINARY'; defaults to 'DAY'. */
  workPeriod?: PaycheckOvertimeWorkPeriod;
  hours: string;
};

export type PaycheckAmountEntry = { concept: string; amount: string };

export type PaycheckInput = {
  monthlySalary: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  periodStart: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  periodEnd: string;
  mode: 'SIMPLE' | 'DETAILED';
  /** Detailed mode only. */
  overtime?: PaycheckOvertimeEntry[];
  /** Detailed mode only. */
  additionalIncome?: PaycheckAmountEntry[];
  /** Detailed mode only. */
  voluntaryDeductions?: PaycheckAmountEntry[];
  /** ISR already withheld so far this fiscal year. Defaults to '0'. */
  incomeTaxAlreadyWithheld?: string;
  /** Pay periods remaining in the fiscal year, including this one. Defaults to 26 (24 quincenas + 3 décimo payments). */
  remainingPeriods?: number;
  /** Employer's professional-risk rate, if known — see `calc/employer-cost.ts`. */
  employerRiskRate?: string;
  /** Weekly ordinary hours used to derive the hourly rate for overtime. Defaults to '48' (Art. 31 CT, jornada diurna). */
  weeklyHours?: string;
};

export type PaycheckValue = {
  periodDays: number;
  baseSalary: string;
  overtimeTotal: string;
  additionalIncomeTotal: string;
  gross: string;
  cssEmployee: string;
  educationEmployee: string;
  isrWithholding: string;
  voluntaryDeductionsTotal: string;
  totalDeductions: string;
  net: string;
  /** Informational only — never deducted from the employee's net pay. */
  employerCost: string;
};

function parseIsoDate(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`${name} must be an ISO date (YYYY-MM-DD)`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()))
    throw new Error(`${name} is not a valid date`);
  return date;
}

function inclusiveDayCount(start: Date, end: Date): number {
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff + 1;
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * A standard quincena is the 1st–15th, or the 16th–last day of the same
 * calendar month. Panama pays a monthly-salaried employee exactly half the
 * monthly salary for either half, regardless of how many calendar days it
 * spans (28–31). Anything else (a new hire's first partial period, a
 * termination mid-period, a custom range) is prorated by calendar days.
 */
function isStandardQuincena(start: Date, end: Date): boolean {
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  if (!sameMonth) return false;
  if (start.getUTCDate() === 1 && end.getUTCDate() === 15) return true;
  return (
    start.getUTCDate() === 16 &&
    end.getUTCDate() ===
      daysInMonth(start.getUTCFullYear(), start.getUTCMonth())
  );
}

function isrBrackets(date: string | Date): {
  brackets: IsrBracket[];
  rules: AppliedRule[];
} {
  const resolved = ISR_BRACKET_CODES.map((code) => resolveRule(code, date));
  return {
    brackets: resolved.map((rule) => ({
      annualFrom: rule.value.annualFrom as string,
      annualTo: (rule.value.annualTo as string | null) ?? null,
      rate: rule.value.rate as string,
    })),
    rules: resolved.map(appliedRuleFromResolved),
  };
}

export function calculatePaycheck(
  input: PaycheckInput,
): ToolResult<PaycheckValue> {
  const start = parseIsoDate(input.periodStart, 'periodStart');
  const end = parseIsoDate(input.periodEnd, 'periodEnd');
  if (end < start) throw new Error('periodEnd must not be before periodStart');
  const periodDays = inclusiveDayCount(start, end);
  const monthlySalary = toDecimal(input.monthlySalary, 'monthlySalary');
  const weeklyHours = toDecimal(
    input.weeklyHours ?? DEFAULT_WEEKLY_HOURS,
    'weeklyHours',
  );
  const hourlyRate = monthlySalary.mul(12).div(52).div(weeklyHours);
  const standardQuincena = isStandardQuincena(start, end);
  const baseSalaryRaw = standardQuincena
    ? monthlySalary.div('2')
    : monthlySalary.div('30').mul(periodDays);
  const baseSalary = money(baseSalaryRaw);

  const assumptions: string[] = [
    standardQuincena
      ? `Quincena estándar: la mitad del salario mensual (B/.${monthlySalary.toString()} ÷ 2), sin importar los días calendario del período.`
      : `Período no estándar (no coincide con el 1–15 ni con el 16–fin de mes): se prorrateó el salario mensual con una base de 30 días por mes: B/.${monthlySalary.toString()} ÷ 30 × ${periodDays} día(s) del período.`,
  ];
  const rulesUsed = new Map<string, AppliedRule>();
  const lines: ResultLine[] = [
    { concept: 'Salario base de la quincena', amount: baseSalary },
  ];

  const detailed = input.mode === 'DETAILED';
  let overtimeTotal = new Decimal(0);
  if (detailed && input.overtime?.length) {
    assumptions.push(
      `Salario por hora = salario mensual × 12 ÷ 52 ÷ ${weeklyHours.toString()} h semanales (Art. 31 Código de Trabajo, jornada ordinaria diurna).`,
      'Cada tipo de hora extra se calculó de forma independiente, sin acumular los topes diarios y semanales entre distintos tipos de recargo (Art. 36 CT); para un cálculo exacto por día trabajado, use el módulo de nómina.',
    );
    for (const entry of input.overtime) {
      const hours = toDecimal(entry.hours, 'overtime.hours');
      if (hours.isZero()) continue;
      if (entry.dayType === 'ORDINARY') {
        const workPeriod = entry.workPeriod ?? 'DAY';
        const code =
          workPeriod === 'NIGHT'
            ? 'HORA_EXTRA_NOCTURNA'
            : workPeriod === 'MIXED_NIGHT'
              ? 'HORA_EXTRA_MIXTA_NOCTURNA'
              : 'HORA_EXTRA_DIURNA';
        const rule = resolveRule(code, input.periodEnd);
        const dailyCap = resolveRule('TOPE_HORA_EXTRA_DIARIO', input.periodEnd);
        const weeklyCap = resolveRule(
          'TOPE_HORA_EXTRA_SEMANAL',
          input.periodEnd,
        );
        const excess = resolveRule('RECARGO_EXCEDENTE_TOPE', input.periodEnd);
        const result = calculatePanamaOvertimePay({
          baseHourlyRate: hourlyRate.toString(),
          overtimeHours: entry.hours,
          overtimeHoursTodayBefore: '0',
          overtimeHoursWeekBefore: '0',
          dailyCapHours: dailyCap.value.maximumHours as string,
          weeklyCapHours: weeklyCap.value.maximumHours as string,
          excessRule: {
            ...asToolRule(excess),
            rate: excess.value.rate as string,
          },
          rule: { ...asToolRule(rule), rate: rule.value.rate as string },
        });
        for (const r of [rule, dailyCap, weeklyCap, excess])
          rulesUsed.set(r.code, appliedRuleFromResolved(r));
        overtimeTotal = overtimeTotal.plus(result.total);
        lines.push({
          concept: `Horas extra (${workPeriod === 'NIGHT' ? 'nocturna' : workPeriod === 'MIXED_NIGHT' ? 'mixta prolongada' : 'diurna'}, ${result.requestedHours} h)`,
          amount: result.total,
          rate: rule.value.rate as string,
          ruleCode: rule.code,
        });
        continue;
      }
      const code =
        entry.dayType === 'WEEKLY_REST'
          ? 'RECARGO_DIA_DESCANSO'
          : entry.dayType === 'COMPENSATORY_REST'
            ? 'RECARGO_DIA_COMPENSATORIO'
            : 'RECARGO_DIA_FERIADO_TRABAJADO';
      const rule = resolveRule(code, input.periodEnd);
      const rate = rule.value.rate;
      const dayLabel =
        entry.dayType === 'WEEKLY_REST'
          ? 'día de descanso semanal'
          : entry.dayType === 'COMPENSATORY_REST'
            ? 'día compensatorio'
            : 'día feriado';
      if (typeof rate !== 'string') {
        assumptions.push(
          `No se calculó el recargo por trabajo en ${dayLabel} (${code}): el catálogo de reglas de StaffPass aún no tiene una tasa oficial confirmada. Revise ese monto manualmente.`,
        );
        rulesUsed.set(rule.code, appliedRuleFromResolved(rule));
        continue;
      }
      const result = calculatePanamaDaySurcharge({
        baseHourlyRate: hourlyRate.toString(),
        hours: entry.hours,
        rule: { ...asToolRule(rule), rate },
      });
      rulesUsed.set(rule.code, appliedRuleFromResolved(rule));
      overtimeTotal = overtimeTotal.plus(result.total);
      lines.push({
        concept: `Trabajo en ${dayLabel} (${result.hours} h)`,
        amount: result.total,
        rate,
        ruleCode: rule.code,
      });
    }
  }

  let additionalIncomeTotal = new Decimal(0);
  if (detailed && input.additionalIncome?.length) {
    for (const entry of input.additionalIncome) {
      const amount = toDecimal(
        entry.amount,
        `additionalIncome.${entry.concept}`,
      );
      additionalIncomeTotal = additionalIncomeTotal.plus(amount);
      lines.push({ concept: entry.concept, amount: money(amount) });
    }
  }

  const gross = money(
    baseSalaryRaw.plus(overtimeTotal).plus(additionalIncomeTotal),
  );

  const cssEmployeeRule = resolveRule('CSS_CUOTA_EMPLEADO', input.periodEnd);
  const educationEmployeeRule = resolveRule(
    'SEGURO_EDUCATIVO_EMPLEADO',
    input.periodEnd,
  );
  const cssEmployee = money(
    toDecimal(gross, 'gross').mul(cssEmployeeRule.value.rate as string),
  );
  const educationEmployee = money(
    toDecimal(gross, 'gross').mul(educationEmployeeRule.value.rate as string),
  );
  rulesUsed.set(cssEmployeeRule.code, appliedRuleFromResolved(cssEmployeeRule));
  rulesUsed.set(
    educationEmployeeRule.code,
    appliedRuleFromResolved(educationEmployeeRule),
  );
  lines.push(
    {
      concept: 'Cuota de la Caja de Seguro Social (empleado)',
      amount: cssEmployee,
      base: gross,
      rate: cssEmployeeRule.value.rate as string,
      ruleCode: cssEmployeeRule.code,
    },
    {
      concept: 'Cuota de seguro educativo (empleado)',
      amount: educationEmployee,
      base: gross,
      rate: educationEmployeeRule.value.rate as string,
      ruleCode: educationEmployeeRule.code,
    },
  );

  const remainingPeriods = input.remainingPeriods ?? DEFAULT_REMAINING_PERIODS;
  const { brackets, rules: bracketRules } = isrBrackets(input.periodEnd);
  for (const rule of bracketRules) rulesUsed.set(rule.code, rule);
  const isrMethodRule = resolveRule('ISR_METODO_RETENCION', input.periodEnd);
  const thirteenthIsrRule = resolveRule(
    'DECIMO_ISR_TRATAMIENTO',
    input.periodEnd,
  );
  rulesUsed.set(isrMethodRule.code, appliedRuleFromResolved(isrMethodRule));
  rulesUsed.set(
    thirteenthIsrRule.code,
    appliedRuleFromResolved(thirteenthIsrRule),
  );

  // Regular withholding: annual salary + a full thirteenth month, spread
  // over `remainingPeriods` (26 by default), same parameterization as
  // before (incomeTaxAlreadyWithheld/remainingPeriods).
  const regular = calculatePeriodicIsrWithholding({
    projectedRegularIncome: money(monthlySalary.mul(12)),
    projectedThirteenthIncome: money(monthlySalary),
    incomeTaxAlreadyWithheld: input.incomeTaxAlreadyWithheld ?? '0',
    remainingPeriods,
    brackets,
  });

  // This quincena's overtime/additional income is treated as a one-off:
  // only the marginal tax it adds to the annual projection is withheld,
  // entirely in this quincena, on top of the regular withholding.
  const extrasThisPeriod = overtimeTotal.plus(additionalIncomeTotal);
  let extraWithholding = new Decimal(0);
  let isrBase = regular.projectedTaxableIncome;
  if (!extrasThisPeriod.isZero()) {
    const withoutExtras = calculateProgressivePanamaIsr(
      regular.projectedTaxableIncome,
      brackets,
    );
    const withExtrasTaxable = money(
      toDecimal(regular.projectedTaxableIncome, 'projectedTaxableIncome').plus(
        extrasThisPeriod,
      ),
    );
    const withExtras = calculateProgressivePanamaIsr(
      withExtrasTaxable,
      brackets,
    );
    extraWithholding = Decimal.max(
      toDecimal(withExtras.annualTax, 'withExtras').minus(
        withoutExtras.annualTax,
      ),
      0,
    );
    isrBase = withExtrasTaxable;
  }

  const isrWithholding = money(
    toDecimal(regular.currentWithholding, 'regularWithholding').plus(
      extraWithholding,
    ),
  );
  assumptions.push(
    `El ISR se proyectó anualizando el salario mensual (× 12) más un décimo tercer mes completo (${money(monthlySalary)} adicional), dividiendo el saldo entre ${remainingPeriods} períodos (24 quincenas + las tres partidas del décimo). Las horas extra e ingresos adicionales de esta quincena se trataron como no recurrentes: solo se retuvo el impuesto marginal que agregan a esa proyección anual, completo en esta quincena, sin acumularlo al resto del año.`,
    'El método de retención proyectada (ISR_METODO_RETENCION) y el tratamiento de ISR sobre el décimo tercer mes (DECIMO_ISR_TRATAMIENTO) no están confirmados contra una resolución oficial de la DGI; este monto es una estimación.',
  );
  lines.push({
    concept: 'Impuesto sobre la renta (ISR) retenido',
    amount: isrWithholding,
    base: isrBase,
  });

  let voluntaryDeductionsTotal = new Decimal(0);
  if (detailed && input.voluntaryDeductions?.length) {
    for (const entry of input.voluntaryDeductions) {
      const amount = toDecimal(
        entry.amount,
        `voluntaryDeductions.${entry.concept}`,
      );
      voluntaryDeductionsTotal = voluntaryDeductionsTotal.plus(amount);
      lines.push({ concept: entry.concept, amount: `-${money(amount)}` });
    }
  }

  const totalDeductions = money(
    toDecimal(cssEmployee, 'cssEmployee')
      .plus(educationEmployee)
      .plus(isrWithholding)
      .plus(voluntaryDeductionsTotal),
  );
  const net = money(toDecimal(gross, 'gross').minus(totalDeductions));
  if (toDecimal(net, 'net', true).lt(0))
    throw new Error('Deductions exceed earnings');

  const employerCostResult = calculateEmployerCost({
    grossSalary: gross,
    date: input.periodEnd,
    riskRate: input.employerRiskRate,
  });
  for (const rule of employerCostResult.rules) rulesUsed.set(rule.code, rule);
  assumptions.push(...employerCostResult.assumptions);
  lines.push({
    concept: 'Costo total del empleador (informativo)',
    amount: employerCostResult.value.employerCost,
  });

  return buildToolResult({
    value: {
      periodDays,
      baseSalary,
      overtimeTotal: money(overtimeTotal),
      additionalIncomeTotal: money(additionalIncomeTotal),
      gross,
      cssEmployee,
      educationEmployee,
      isrWithholding,
      voluntaryDeductionsTotal: money(voluntaryDeductionsTotal),
      totalDeductions,
      net,
      employerCost: employerCostResult.value.employerCost,
    },
    lines,
    assumptions,
    rules: [...rulesUsed.values()],
  });
}

export { DEFAULT_REMAINING_PERIODS };
