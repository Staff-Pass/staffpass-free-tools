/**
 * Liquidación de contrato por tiempo indefinido (spec §5.4). Only the three
 * supported causes produce a calculated result; anything else — a
 * different contract type, or a cause outside the supported three — comes
 * back `unsupported` with a link to MITRADEL's own calculator, per spec.
 *
 * See `applicability.ts` for the per-concept applicability matrix and its
 * legal basis.
 */
import { Decimal, money, toDecimal } from '../money';
import {
  calculateVacationAccrual,
  calculateVacationCompensation,
} from '../calc/vacation';
import { calculateSeniorityPremium } from '../calc/seniority';
import { calculateIndemnity } from '../calc/indemnity';
import { calculateThirteenthMonth } from '../calc/thirteenth';
import { resolveRule } from '../rules/resolveRules';
import {
  appliedRuleFromResolved,
  asToolRule,
  buildToolResult,
  type AppliedRule,
  type ResultLine,
  type ToolResult,
} from '../tool-result';
import {
  SUPPORTED_CAUSES,
  SUPPORTED_CONTRACT_TYPE,
  checkApplicability,
  type LiquidationCause,
  type LiquidationConceptKey,
} from './applicability';

export const MITRADEL_LIQUIDATION_URL =
  'https://appstrabajo.mitradel.gob.pa/prestaciones/';

export type LiquidationInput = {
  contractType: string;
  cause: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  /** ISO date (YYYY-MM-DD). */
  endDate: string;
  lastMonthlySalary: string;
  /** Declared average monthly salary (Art. 226 CT: últimos 5 años). Takes priority over salaryHistory. */
  averageMonthlySalary?: string;
  /** Monthly salaries to average when averageMonthlySalary is not declared directly. */
  salaryHistory?: string[];
  /**
   * Accrued, unused vacation days at termination, if known. When omitted,
   * they are computed proportionally (días ÷ 11) from `vacationAccrualFrom`
   * (or its own default) to `endDate`, assuming every earlier 11-month
   * cycle was already enjoyed.
   */
  pendingVacationDays?: string;
  /**
   * ISO date the current, still-unenjoyed vacation cycle started. Defaults
   * to the start of the 11-month cycle in progress at `endDate` (or
   * `startDate` itself, if the whole service is under 11 months). Only used
   * when `pendingVacationDays` is not declared.
   */
  vacationAccrualFrom?: string;
  /**
   * ISO date through which the thirteenth month was last paid. Defaults to
   * the most recent 15-abr/15-ago/15-dic cut-off before `endDate` (never
   * earlier than `startDate`), assuming every earlier installment was paid
   * on time.
   */
  thirteenthPaidThrough?: string;
  /** Unpaid wages already earned but not yet paid. Defaults to '0'. */
  pendingSalaryAmount?: string;
};

export type LiquidationConceptResult = {
  concept: string;
  amount: string;
  applies: boolean;
  reason: string;
  ruleCodes: string[];
};

export type LiquidationValue = {
  pendingSalary: LiquidationConceptResult;
  vacations: LiquidationConceptResult;
  thirteenthProportional: LiquidationConceptResult;
  seniorityPremium: LiquidationConceptResult;
  indemnity: LiquidationConceptResult;
  total: string;
};

export type UnsupportedLiquidation = {
  status: 'unsupported';
  reason: string;
  officialUrl: string;
};

export type LiquidationResult =
  | ToolResult<LiquidationValue>
  | UnsupportedLiquidation;

function unsupported(reason: string): UnsupportedLiquidation {
  return {
    status: 'unsupported',
    reason,
    officialUrl: MITRADEL_LIQUIDATION_URL,
  };
}

function parseIsoDate(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`${name} must be an ISO date (YYYY-MM-DD)`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()))
    throw new Error(`${name} is not a valid date`);
  return date;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * The start of the 11-month vacation cycle in progress at `end` (Art. 54-1
 * CT: "30 días por cada 11 meses continuos"). Starts counting at `start`
 * and advances by whole 11-month cycles; any cycle that fully elapsed
 * before `end` is assumed already enjoyed, so only the current, still
 * incomplete cycle counts toward the proportional accrual.
 */
function currentVacationCycleStart(start: Date, end: Date): Date {
  let cycleStart = start;
  for (let i = 0; i < 1000; i += 1) {
    const next = addMonthsUtc(cycleStart, 11);
    if (next > end) return cycleStart;
    cycleStart = next;
  }
  return cycleStart;
}

/**
 * The most recent décimo cut-off (15 abril, 15 agosto o 15 diciembre —
 * Decreto de Gabinete 221/1971) strictly before `end`. Assumes every
 * earlier installment was paid on time; the caller clamps this to
 * `startDate` when the employee was hired after that cut-off.
 */
function lastThirteenthBoundaryBefore(end: Date): Date {
  const year = end.getUTCFullYear();
  const candidates: number[] = [];
  for (const y of [year - 1, year]) {
    candidates.push(Date.UTC(y, 3, 15)); // 15 abril
    candidates.push(Date.UTC(y, 7, 15)); // 15 agosto
    candidates.push(Date.UTC(y, 11, 15)); // 15 diciembre
  }
  const before = candidates.filter((time) => time < end.getTime());
  return new Date(Math.max(...before));
}

function resolveAverageSalary(input: LiquidationInput): {
  value: Decimal;
  assumption: string;
} {
  if (input.averageMonthlySalary)
    return {
      value: toDecimal(input.averageMonthlySalary, 'averageMonthlySalary'),
      assumption:
        'Se usó el promedio salarial declarado directamente como base de cálculo (Art. 226 Código de Trabajo).',
    };
  if (input.salaryHistory?.length) {
    const sum = input.salaryHistory.reduce(
      (acc, value, index) =>
        acc.plus(toDecimal(value, `salaryHistory[${index}]`)),
      new Decimal(0),
    );
    const average = sum.div(input.salaryHistory.length);
    return {
      value: average,
      assumption: `Se calculó el promedio de ${input.salaryHistory.length} salario(s) mensuales declarados en el historial, siguiendo el criterio de promedio de los últimos 5 años del Art. 226 Código de Trabajo.`,
    };
  }
  return {
    value: toDecimal(input.lastMonthlySalary, 'lastMonthlySalary'),
    assumption:
      'No se declaró historial salarial ni promedio; se usó el último salario mensual como aproximación del promedio de los últimos 5 años (Art. 226 Código de Trabajo). Si el salario varió, declare el historial para un cálculo más preciso.',
  };
}

export function calculateLiquidation(
  input: LiquidationInput,
): LiquidationResult {
  if (input.contractType !== SUPPORTED_CONTRACT_TYPE)
    return unsupported(
      `Esta calculadora solo cubre contratos por tiempo indefinido. El tipo de contrato declarado ("${input.contractType}") no está soportado; use la calculadora oficial de MITRADEL.`,
    );
  if (!(SUPPORTED_CAUSES as readonly string[]).includes(input.cause))
    return unsupported(
      `Esta calculadora solo cubre las causas de terminación renuncia, despido injustificado y mutuo acuerdo. La causa declarada ("${input.cause}") no está soportada; use la calculadora oficial de MITRADEL.`,
    );
  const cause = input.cause as LiquidationCause;

  const start = parseIsoDate(input.startDate, 'startDate');
  const end = parseIsoDate(input.endDate, 'endDate');
  if (end < start) throw new Error('endDate must not be before startDate');
  const serviceDays = daysBetween(start, end);
  const serviceYears = new Decimal(serviceDays).div(365);

  const { value: averageSalary, assumption: averageSalaryAssumption } =
    resolveAverageSalary(input);
  const lastMonthlySalary = toDecimal(
    input.lastMonthlySalary,
    'lastMonthlySalary',
  );

  const assumptions = [
    averageSalaryAssumption,
    `Los años de servicio se calcularon como días entre las fechas declaradas ÷ 365: ${serviceDays} día(s) ≈ ${serviceYears.toDecimalPlaces(4).toString()} año(s).`,
    'Esta calculadora no incluye el preaviso (Art. 212 Código de Trabajo) ni beneficios contractuales o de convención colectiva; solo cubre las prestaciones legales listadas.',
  ];
  const rulesUsed = new Map<string, AppliedRule>();
  const lines: ResultLine[] = [];

  function concept(
    key: LiquidationConceptKey,
    label: string,
    amount: string,
    ruleCodes: string[],
  ): LiquidationConceptResult {
    const { applies, reason } = checkApplicability(key, cause);
    const effectiveAmount = applies ? amount : '0.00';
    lines.push({
      concept: label,
      amount: effectiveAmount,
      ruleCode: ruleCodes[0],
    });
    return {
      concept: label,
      amount: effectiveAmount,
      applies,
      reason,
      ruleCodes,
    };
  }

  // Salarios pendientes — declared amount, no catalog rule involved.
  const pendingSalaryAmount = money(
    toDecimal(input.pendingSalaryAmount ?? '0', 'pendingSalaryAmount'),
  );
  const pendingSalary = concept(
    'pendingSalary',
    'Salarios pendientes',
    pendingSalaryAmount,
    [],
  );

  // Vacaciones proporcionales — Art. 54-6 CT.
  const vacationRule = resolveRule('VACACIONES_COMPENSACION_TERMINO', end);
  rulesUsed.set(vacationRule.code, appliedRuleFromResolved(vacationRule));
  const vacationRuleCodes = [vacationRule.code];
  let accruedVacationDays: string;
  if (input.pendingVacationDays !== undefined) {
    accruedVacationDays = input.pendingVacationDays;
    assumptions.push(
      `Se usaron los ${input.pendingVacationDays} día(s) de vacaciones pendientes declarados directamente.`,
    );
  } else {
    const accrualFrom = input.vacationAccrualFrom
      ? parseIsoDate(input.vacationAccrualFrom, 'vacationAccrualFrom')
      : currentVacationCycleStart(start, end);
    if (accrualFrom > end)
      throw new Error('vacationAccrualFrom must not be after endDate');
    const vacationAccrualRule = resolveRule('VACACIONES_PROPORCIONAL', end);
    rulesUsed.set(
      vacationAccrualRule.code,
      appliedRuleFromResolved(vacationAccrualRule),
    );
    vacationRuleCodes.push(vacationAccrualRule.code);
    const accrual = calculateVacationAccrual({
      serviceDays: String(daysBetween(accrualFrom, end)),
      rule: asToolRule(vacationAccrualRule),
    });
    accruedVacationDays = accrual.days;
    assumptions.push(
      `No se declararon días de vacaciones pendientes: se calcularon proporcionalmente (días ÷ 11, Art. 54-3 CT) desde el ${isoOf(accrualFrom)} — inicio del ciclo de 11 meses en curso — hasta la terminación, asumiendo que los ciclos completos anteriores ya se disfrutaron. Si conoce el saldo exacto, declárelo directamente para un cálculo más preciso.`,
    );
  }
  const vacationResult = calculateVacationCompensation({
    accruedDays: accruedVacationDays,
    averageMonthlySalary: averageSalary.toString(),
    lastMonthlySalary: lastMonthlySalary.toString(),
    rule: asToolRule(vacationRule),
  });
  const vacations = concept(
    'vacations',
    'Vacaciones proporcionales',
    vacationResult.amount,
    vacationRuleCodes,
  );

  // Décimo proporcional — Decreto de Gabinete 221/1971. Earned-since-last-
  // payment ÷ 12, per DECIMO_FORMULA_BASE; the partial-cuatrimestre
  // treatment itself is DECIMO_PRORRATEO_PARCIAL, marked NO_VERIFICADO.
  const thirteenthRule = resolveRule('DECIMO_FORMULA_BASE', end);
  const thirteenthPartialRule = resolveRule('DECIMO_PRORRATEO_PARCIAL', end);
  rulesUsed.set(thirteenthRule.code, appliedRuleFromResolved(thirteenthRule));
  rulesUsed.set(
    thirteenthPartialRule.code,
    appliedRuleFromResolved(thirteenthPartialRule),
  );
  let thirteenthPaidThrough: Date;
  if (input.thirteenthPaidThrough) {
    thirteenthPaidThrough = parseIsoDate(
      input.thirteenthPaidThrough,
      'thirteenthPaidThrough',
    );
  } else {
    const boundary = lastThirteenthBoundaryBefore(end);
    thirteenthPaidThrough = boundary < start ? start : boundary;
    assumptions.push(
      `Se asumió que el décimo se pagó puntualmente hasta el ${isoOf(thirteenthPaidThrough)}; solo se calcula el cuatrimestre en curso.`,
    );
  }
  const daysSincePaid = daysBetween(thirteenthPaidThrough, end);
  if (daysSincePaid < 0)
    throw new Error('thirteenthPaidThrough must not be after endDate');
  const earnedSinceLastPayment = lastMonthlySalary.div('30').mul(daysSincePaid);
  assumptions.push(
    `El décimo proporcional se calculó sobre el salario devengado desde ${isoOf(thirteenthPaidThrough)} hasta la terminación (${daysSincePaid} día(s) × último salario ÷ 30), dividido entre 12; el tratamiento exacto de un cuatrimestre incompleto no está confirmado en la fuente (DECIMO_PRORRATEO_PARCIAL), así que este monto se muestra como estimación.`,
  );
  const thirteenthResult = calculateThirteenthMonth({
    salaryByCuatrimestre: [earnedSinceLastPayment.toString()],
    rule: asToolRule(thirteenthRule),
    divisor: thirteenthRule.value.divisor as string,
  });
  const thirteenthProportional = concept(
    'thirteenthProportional',
    'Décimo tercer mes proporcional',
    thirteenthResult.amount,
    [thirteenthRule.code, thirteenthPartialRule.code],
  );

  // Prima de antigüedad — Art. 224 CT, aplica a toda causa incluida renuncia.
  const seniorityRule = resolveRule('PRIMA_ANTIGUEDAD', end);
  rulesUsed.set(seniorityRule.code, appliedRuleFromResolved(seniorityRule));
  const seniorityResult = calculateSeniorityPremium({
    averageMonthlySalary: averageSalary.toString(),
    serviceYears: serviceYears.toString(),
    rule: asToolRule(seniorityRule),
  });
  const seniorityPremium = concept(
    'seniorityPremium',
    'Prima de antigüedad',
    seniorityResult.amount,
    [seniorityRule.code],
  );

  // Indemnización — Art. 225 CT, solo despido injustificado.
  const indemnityApplicability = checkApplicability('indemnity', cause);
  let indemnityAmount = '0.00';
  let indemnityRuleCodes: string[] = [];
  if (indemnityApplicability.applies) {
    const indemnityRule = resolveRule('INDEMNIZACION_ESCALA', end);
    rulesUsed.set(indemnityRule.code, appliedRuleFromResolved(indemnityRule));
    const indemnityResult = calculateIndemnity({
      averageMonthlySalary: averageSalary.toString(),
      serviceYears: serviceYears.toString(),
      rule: asToolRule(indemnityRule),
    });
    indemnityAmount = indemnityResult.amount;
    indemnityRuleCodes = [indemnityRule.code];
  }
  const indemnity = concept(
    'indemnity',
    'Indemnización por despido injustificado',
    indemnityAmount,
    indemnityRuleCodes,
  );

  const total = money(
    toDecimal(pendingSalary.amount, 'pendingSalary')
      .plus(vacations.amount)
      .plus(thirteenthProportional.amount)
      .plus(seniorityPremium.amount)
      .plus(indemnity.amount),
  );
  lines.push({ concept: 'Total de la liquidación', amount: total });

  return buildToolResult({
    value: {
      pendingSalary,
      vacations,
      thirteenthProportional,
      seniorityPremium,
      indemnity,
      total,
    },
    lines,
    assumptions,
    rules: [...rulesUsed.values()],
  });
}

export {
  MITRADEL_LIQUIDATION_URL as LIQUIDATION_UNSUPPORTED_URL,
  SUPPORTED_CAUSES as LIQUIDATION_SUPPORTED_CAUSES,
  SUPPORTED_CONTRACT_TYPE as LIQUIDATION_SUPPORTED_CONTRACT_TYPE,
};
export type { LiquidationCause };
