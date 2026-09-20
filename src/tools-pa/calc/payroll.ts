/**
 * Extracted, without any numeric change, from
 * `payroll/domain/payroll-calculator.ts`. See `calc/overtime.ts` for the
 * Decimal.js/Prisma.Decimal note.
 *
 * `decimal()` here is intentionally stricter than `money.ts`'s `toDecimal`:
 * it only accepts a plain, non-negative, non-scientific decimal string (the
 * shape a priced pay line amount must already have), matching the original
 * `payroll-calculator.ts` behaviour exactly (payroll adapters and their
 * specs depend on this exact validation, e.g. rejecting `'1e3'`).
 */
import { Decimal, money } from '../money';

export type PayrollKind = 'REGULAR' | 'THIRTEENTH' | 'VACATION';
export interface PayrollRules {
  currency: 'USD';
  employeeCssRate: string;
  employerCssRate: string;
  employeeEducationRate: string;
  employerEducationRate: string;
  employerRiskRate: string;
  thirteenthEmployeeCssRate: string;
  thirteenthEmployerCssRate: string;
  attendanceValuation?: {
    monthlyHoursDivisor?: string;
    dailyHours?: string;
    weeklyHoursSource: 'COMPENSATION';
    compensationBoundary: 'CLOCK_IN_LOCAL_DATE';
    costAllocation: 'ELIGIBLE_MINUTES_BY_LOCATION';
    weeklyRestWeekdays?: number[];
    cssTaxable: boolean;
    educationTaxable: boolean;
    riskTaxable: boolean;
  };
}
export const PAYROLL_LINE_CATEGORIES = [
  'REGULAR_SALARY',
  'OVERTIME',
  'COMMISSION',
  'BONUS',
  'OTHER_EARNING',
  'LEGAL_DEDUCTION',
  'LOAN',
  'ADVANCE',
  'CREDITOR',
  'OTHER_DEDUCTION',
] as const;
export type PayrollLineCategory = (typeof PAYROLL_LINE_CATEGORIES)[number];
export interface PayrollLine {
  lineId?: string;
  noveltyId?: string;
  label: string;
  kind: 'EARNING' | 'DEDUCTION';
  /** Optional only for persisted legacy inputs; calculations always emit one. */
  category?: PayrollLineCategory;
  quantity: string;
  unitAmount: string;
  multiplier: string;
  cssTaxable: boolean;
  educationTaxable: boolean;
  riskTaxable: boolean;
}
export interface PayrollInput {
  lines: PayrollLine[];
  annualTaxableIncome: string;
  incomeTaxAlreadyWithheld: string;
  remainingWithholdings: number;
  basisNote: string;
}
export type PayrollLineCalculation = PayrollLine & { amount: string };
export type PayrollLineSummary = {
  lines: PayrollLineCalculation[];
  gross: Decimal;
  voluntaryDeductions: Decimal;
  cssBase: Decimal;
  educationBase: Decimal;
  riskBase: Decimal;
};
export type PayrollCalculationOptions = {
  annualIncomeTax?: string;
  incomeTax?: string;
};
const earningCategories = new Set<PayrollLineCategory>([
  'REGULAR_SALARY',
  'OVERTIME',
  'COMMISSION',
  'BONUS',
  'OTHER_EARNING',
]);
const deductionCategories = new Set<PayrollLineCategory>([
  'LEGAL_DEDUCTION',
  'LOAN',
  'ADVANCE',
  'CREDITOR',
  'OTHER_DEDUCTION',
]);

function normalizedCategory(line: PayrollLine): PayrollLineCategory {
  const category =
    line.category ??
    (line.kind === 'EARNING' ? 'OTHER_EARNING' : 'OTHER_DEDUCTION');
  const allowed =
    line.kind === 'EARNING' ? earningCategories : deductionCategories;
  if (!allowed.has(category))
    throw new Error('Payroll line category does not match its kind');
  return category;
}

export function decimal(value: string): Decimal {
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(value)) {
    throw new Error('Invalid nonnegative decimal');
  }
  return new Decimal(value);
}

export { money };

/**
 * Validates and prices the employee-provided earning/deduction lines without
 * applying any contribution or ISR policy. The Panama legal engine uses this
 * summary as the immutable bases for its versioned formulas.
 */
export function summarizePayrollLines(
  lines: PayrollLine[],
): PayrollLineSummary {
  if (!lines.length || lines.length > 100)
    throw new Error('Payroll needs 1-100 lines');
  let gross = new Decimal(0),
    voluntaryDeductions = new Decimal(0);
  let cssBase = new Decimal(0),
    educationBase = new Decimal(0),
    riskBase = new Decimal(0);
  const pricedLines = lines.map((line) => {
    if (line.kind !== 'EARNING' && line.kind !== 'DEDUCTION')
      throw new Error('Invalid line kind');
    const category = normalizedCategory(line);
    const multiplier = decimal(line.multiplier);
    if (multiplier.lt(1) || multiplier.gt(10))
      throw new Error('Invalid pay multiplier');
    const amount = new Decimal(
      money(
        decimal(line.quantity)
          .times(decimal(line.unitAmount))
          .times(multiplier),
      ),
    );
    if (line.kind === 'EARNING') {
      gross = gross.plus(amount);
      if (line.cssTaxable) cssBase = cssBase.plus(amount);
      if (line.educationTaxable) educationBase = educationBase.plus(amount);
      if (line.riskTaxable) riskBase = riskBase.plus(amount);
    } else {
      if (line.cssTaxable || line.educationTaxable || line.riskTaxable)
        throw new Error('Deductions cannot increase contribution bases');
      voluntaryDeductions = voluntaryDeductions.plus(amount);
    }
    return { ...line, category, amount: money(amount) };
  });
  return {
    lines: pricedLines,
    gross,
    voluntaryDeductions,
    cssBase,
    educationBase,
    riskBase,
  };
}

/** DGI annual taxable-income brackets, not a guess at the employee's tax base. */
export function annualPanamaIncomeTax(taxableIncome: string): string {
  const base = decimal(taxableIncome);
  if (base.lte(11000)) return '0.00';
  if (base.lte(50000)) return money(base.minus(11000).times('0.15'));
  return money(new Decimal(5850).plus(base.minus(50000).times('0.25')));
}

/**
 * Inputs are approved pay units, not automatically classified attendance hours.
 * Decimal operands and snapshots keep historical slips reproducible. Rates are
 * explicit fractions (0.0975 = 9.75%), governed by a dated company rule set.
 */
export function calculatePayroll(
  kind: PayrollKind,
  rules: PayrollRules,
  input: PayrollInput,
  options: PayrollCalculationOptions = {},
) {
  if (
    !Number.isInteger(input.remainingWithholdings) ||
    input.remainingWithholdings < 1 ||
    input.remainingWithholdings > 366
  ) {
    throw new Error('Invalid remaining withholding count');
  }
  for (const key of [
    'employeeCssRate',
    'employerCssRate',
    'employeeEducationRate',
    'employerEducationRate',
    'employerRiskRate',
    'thirteenthEmployeeCssRate',
    'thirteenthEmployerCssRate',
  ] as const) {
    if (decimal(rules[key]).gt(1))
      throw new Error('Rates must be fractions between 0 and 1');
  }
  if (rules.currency !== 'USD') throw new Error('Unsupported currency');
  const summary = summarizePayrollLines(input.lines);
  const {
    lines,
    gross,
    voluntaryDeductions,
    cssBase,
    educationBase,
    riskBase,
  } = summary;
  const cssEmployeeRate =
    kind === 'THIRTEENTH'
      ? rules.thirteenthEmployeeCssRate
      : rules.employeeCssRate;
  const cssEmployerRate =
    kind === 'THIRTEENTH'
      ? rules.thirteenthEmployerCssRate
      : rules.employerCssRate;
  const employeeCss = money(cssBase.times(cssEmployeeRate));
  const employerCss = money(cssBase.times(cssEmployerRate));
  const employeeEducation = money(
    educationBase.times(rules.employeeEducationRate),
  );
  const employerEducation = money(
    educationBase.times(rules.employerEducationRate),
  );
  const employerRisk = money(riskBase.times(rules.employerRiskRate));
  const annualIncomeTax = options.annualIncomeTax
    ? money(decimal(options.annualIncomeTax))
    : annualPanamaIncomeTax(input.annualTaxableIncome);
  const incomeTax = options.incomeTax
    ? money(decimal(options.incomeTax))
    : money(
        Decimal.max(
          new Decimal(annualIncomeTax).minus(
            decimal(input.incomeTaxAlreadyWithheld),
          ),
          0,
        ).div(input.remainingWithholdings),
      );
  const deductions = voluntaryDeductions
    .plus(employeeCss)
    .plus(employeeEducation)
    .plus(incomeTax);
  const net = gross.minus(deductions);
  if (net.lt(0)) throw new Error('Deductions exceed earnings');
  if (gross.gte('1000000000000'))
    throw new Error('Payroll amount exceeds supported limit');
  return {
    version: 1,
    kind,
    currency: rules.currency,
    lines,
    bases: {
      css: money(cssBase),
      education: money(educationBase),
      risk: money(riskBase),
    },
    employeeCss,
    employerCss,
    employeeEducation,
    employerEducation,
    employerRisk,
    annualIncomeTax,
    incomeTax,
    voluntaryDeductions: money(voluntaryDeductions),
    gross: money(gross),
    deductions: money(deductions),
    net: money(net),
    employerContributions: money(
      new Decimal(employerCss).plus(employerEducation).plus(employerRisk),
    ),
    employerCost: money(
      gross.plus(employerCss).plus(employerEducation).plus(employerRisk),
    ),
  };
}
