/**
 * Informational employer cost for one gross amount (spec §5.2/§5.3): CSS
 * employer contribution (stepped by `resolveCssEmployerCode`), seguro
 * educativo patronal, and — only if the caller supplies it — riesgos
 * profesionales, which has no catalog rate (see
 * `docs/panama-legal-rules.md` §6, `RIESGOS_PROFESIONALES_CLASE`: cifras en
 * conflicto entre fuentes, sin confirmación oficial). Omitting a risk rate
 * never blocks the calculation; it just adds an explicit assumption.
 */
import { money, toDecimal } from '../money';
import { calculateContributions } from './contributions';
import { resolveCssEmployerCode, resolveRule } from '../rules/resolveRules';
import {
  appliedRuleFromResolved,
  asToolRule,
  buildToolResult,
  type AppliedRule,
  type ResultLine,
  type ToolResult,
} from '../tool-result';

export type EmployerCostInput = {
  grossSalary: string;
  /** The date this cost applies to — picks the CSS/education rules effective then. */
  date: string | Date;
  /** Fraction, e.g. '0.0105'. Omit when the company's risk class/rate is unknown. */
  riskRate?: string;
};

export type EmployerCostValue = {
  grossSalary: string;
  cssEmployer: string;
  educationEmployer: string;
  risk: string;
  totalContributions: string;
  employerCost: string;
};

export function calculateEmployerCost(
  input: EmployerCostInput,
): ToolResult<EmployerCostValue> {
  const cssEmployerRule = resolveRule(
    resolveCssEmployerCode(input.date),
    input.date,
  );
  const educationEmployerRule = resolveRule(
    'SEGURO_EDUCATIVO_PATRONAL',
    input.date,
  );

  const assumptions: string[] = [];
  const riskRate = input.riskRate;
  if (riskRate === undefined)
    assumptions.push(
      'No se incluyó la cuota de riesgos profesionales en el costo patronal: el catálogo de reglas de StaffPass aún no tiene una tasa oficial confirmada (RIESGOS_PROFESIONALES_CLASE). Indique la tasa que la CSS asignó a su empresa para incluirla.',
    );

  const grossSalary = money(toDecimal(input.grossSalary, 'grossSalary'));
  const contributions = calculateContributions({
    base: grossSalary,
    employerRate: cssEmployerRule.value.rate as string,
    employerEducationRate: educationEmployerRule.value.rate as string,
    riskRate,
    rules: [cssEmployerRule, educationEmployerRule].map(asToolRule),
  });

  const totalContributions = money(
    toDecimal(contributions.employer, 'employer')
      .plus(contributions.educationEmployer)
      .plus(contributions.risk),
  );
  const employerCost = money(
    toDecimal(grossSalary, 'grossSalary').plus(totalContributions),
  );

  const lines: ResultLine[] = [
    { concept: 'Salario bruto', amount: grossSalary },
    {
      concept: 'Cuota patronal de CSS',
      amount: contributions.employer,
      base: contributions.base,
      rate: contributions.rates.employer,
      ruleCode: cssEmployerRule.code,
    },
    {
      concept: 'Cuota patronal de seguro educativo',
      amount: contributions.educationEmployer,
      base: contributions.educationBase,
      rate: contributions.rates.educationEmployer,
      ruleCode: educationEmployerRule.code,
    },
    {
      concept: 'Riesgos profesionales',
      amount: contributions.risk,
      base: contributions.riskBase,
      rate: contributions.rates.risk,
      ...(riskRate !== undefined
        ? { ruleCode: 'RIESGOS_PROFESIONALES_CLASE' }
        : {}),
    },
    { concept: 'Costo total del empleador', amount: employerCost },
  ];

  const rules: AppliedRule[] = [cssEmployerRule, educationEmployerRule].map(
    appliedRuleFromResolved,
  );

  return buildToolResult({
    value: {
      grossSalary,
      cssEmployer: contributions.employer,
      educationEmployer: contributions.educationEmployer,
      risk: contributions.risk,
      totalContributions,
      employerCost,
    },
    lines,
    assumptions,
    rules,
  });
}
