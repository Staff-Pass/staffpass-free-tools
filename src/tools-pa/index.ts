/**
 * `tools-pa` — public API.
 *
 * Pure TypeScript, no `@nestjs/*`, `@prisma/*` or `node:*` imports, and no
 * imports from outside this folder. `scripts/check-architecture.mjs` enforces
 * that boundary. The package build and the standalone browser application
 * consume this same public entry point so formulas remain single-source.
 *
 * See `README.md` and `docs/RULES_AND_LIMITATIONS.md` for integration,
 * provenance, legal status and versioning guidance.
 */

// ---------------------------------------------------------------------------
// Version constants (also read by scripts/build-tools-bundle.mjs)
// ---------------------------------------------------------------------------
export { TOOLS_PA_VERSION, RULES_VERSION } from './version';

// ---------------------------------------------------------------------------
// Money: the one decimal/rounding policy every calculation shares
// ---------------------------------------------------------------------------
export {
  Decimal,
  money,
  quantity,
  toDecimal,
  type DecimalInput,
} from './money';

// ---------------------------------------------------------------------------
// Tool-mode result envelope (spec §5.2)
// ---------------------------------------------------------------------------
export {
  buildToolResult,
  asToolRule,
  appliedRuleFromResolved,
  type ToolResult,
  type ResultLine,
  type AppliedRule,
} from './tool-result';

// ---------------------------------------------------------------------------
// Rules: the catalog and effective-date resolution
// ---------------------------------------------------------------------------
export {
  resolveRules,
  resolveRule,
  resolveCssEmployerCode,
  toIsoDate,
  type ResolvedRule,
} from './rules/resolveRules';
export {
  PANAMA_RULE_SEEDS,
  PANAMA_ISR_BRACKET_SEEDS,
  PANAMA_CONTRIBUTION_SEEDS,
  PANAMA_OVERTIME_SEEDS,
  PANAMA_HOLIDAY_SEEDS,
  type PanamaRuleSeed,
  type PanamaIsrSeed,
  type PanamaContributionSeed,
} from './rules/catalog';

// ---------------------------------------------------------------------------
// Calc: formal, throwing formulas (used as-is by payroll/domain adapters,
// and internally by the tool-mode calculators below via asToolRule)
// ---------------------------------------------------------------------------
export {
  classifyPanamaWorkday,
  calculatePanamaDaySurcharge,
  calculatePanamaOvertimePay,
  PANAMA_NIGHT_MINUTES_PER_DAY,
  type PanamaWorkPeriod,
  type PanamaDayType,
  type WorkInterval,
  type OvertimeRuleInput,
  type PanamaSurchargeRuleInput,
  type OvertimePayInput,
} from './calc/overtime';
export { calculateThirteenthMonth } from './calc/thirteenth';
export {
  calculateVacationAccrual,
  calculateVacationCompensation,
} from './calc/vacation';
export { calculateSeniorityPremium } from './calc/seniority';
export { calculateIndemnity } from './calc/indemnity';
export { calculateContributions } from './calc/contributions';
export {
  calculateProgressivePanamaIsr,
  calculatePeriodicIsrWithholding,
  type IsrBracket,
} from './calc/isr';
export {
  calculateMonthlyProvisions,
  type MonthlyProvisionInput,
  type PanamaMoneyLine,
} from './calc/provisions';
export {
  calculatePayroll,
  summarizePayrollLines,
  annualPanamaIncomeTax,
  decimal as payrollDecimal,
  type PayrollKind,
  type PayrollRules,
  type PayrollLine,
  type PayrollInput,
  type PayrollLineCalculation,
  type PayrollLineSummary,
  type PayrollCalculationOptions,
} from './calc/payroll';

// ---------------------------------------------------------------------------
// Tool-mode calculators (spec §5.3): never throw LEGAL_RULE_UNVERIFIED,
// always return a ToolResult with estimate/assumptions/rules populated.
// ---------------------------------------------------------------------------
export {
  calculatePaycheck,
  DEFAULT_REMAINING_PERIODS,
  type PaycheckInput,
  type PaycheckValue,
  type PaycheckOvertimeEntry,
  type PaycheckOvertimeDayType,
  type PaycheckOvertimeWorkPeriod,
  type PaycheckAmountEntry,
} from './calc/paycheck';
export {
  calculateEmployerCost,
  type EmployerCostInput,
  type EmployerCostValue,
} from './calc/employer-cost';

// ---------------------------------------------------------------------------
// Liquidación (spec §5.4)
// ---------------------------------------------------------------------------
export {
  calculateLiquidation,
  MITRADEL_LIQUIDATION_URL,
  LIQUIDATION_SUPPORTED_CAUSES,
  LIQUIDATION_SUPPORTED_CONTRACT_TYPE,
  type LiquidationInput,
  type LiquidationValue,
  type LiquidationConceptResult,
  type LiquidationResult,
  type UnsupportedLiquidation,
  type LiquidationCause,
} from './liquidation';
export {
  checkApplicability,
  type LiquidationConceptKey,
} from './liquidation/applicability';

// ---------------------------------------------------------------------------
// Contrato PA-INDEF (spec §5.5)
// ---------------------------------------------------------------------------
export * from './contract';
