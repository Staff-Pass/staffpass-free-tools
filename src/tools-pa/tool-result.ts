/**
 * The tool-mode result envelope (spec §5.2). Every public calculation in
 * `tools-pa` that is meant to be shown directly to an end user (paycheck,
 * liquidation, employer cost) returns a `ToolResult<T>` built with
 * `buildToolResult`, so the website and the admin panel render the same
 * "¿Cómo se calculó?" breakdown from the same shape.
 *
 * Formal payroll (`payroll/domain/*.ts` adapters) does NOT use this file:
 * it calls the `calc/*.ts` formulas directly with the caller's own
 * `{ code, verified }` rule objects and lets `LEGAL_RULE_UNVERIFIED` throw
 * when a rule has not been reviewed. `asToolRule` below is what makes tool
 * mode different — it is the one place that turns off that throw.
 */
import type { ResolvedRule } from './rules/resolveRules';

/** One line of a result breakdown: a concept, its amount, and the base/rate/rule that produced it. */
export type ResultLine = {
  concept: string;
  amount: string;
  base?: string;
  rate?: string;
  ruleCode?: string;
};

/**
 * A catalog rule as applied to one calculation, with enough metadata to show
 * "fuente y vigencia" — using the catalog's own public-facing source note
 * and URL (see `rules/catalog.ts`'s `source()` helper), never an internal
 * repo path.
 */
export type AppliedRule = {
  code: string;
  value: unknown;
  effectiveFrom: string;
  effectiveTo: string | null;
  legalBasis: string;
  documentStatus: 'VERIFICADO' | 'NO_VERIFICADO';
  sourceNote: string;
  sourceUrl: string | null;
  verified: boolean;
};

export type ToolResult<T> = {
  /** The calculation's totals — the shape is specific to each tool. */
  value: T;
  /** Line-by-line breakdown: concepto, monto, base, tasa, regla usada. */
  lines: ResultLine[];
  /** Assumptions applied, in Spanish, meant to be shown to the end user. */
  assumptions: string[];
  /** Every catalog rule this calculation used. */
  rules: AppliedRule[];
  /** True when any rule used is not verified — drives the "Estimación" badge. */
  estimate: boolean;
};

/**
 * `verified: false` rows never block a tool-mode calculation (spec §5.2:
 * "en modo herramienta, el módulo no lanza LEGAL_RULE_UNVERIFIED"). This
 * always reports `verified: true` to the underlying `calc/*.ts` formula so
 * `requireVerified` never throws; the row's real, unverified status is kept
 * in `AppliedRule.verified` via `appliedRuleFromResolved`, which is what
 * `buildToolResult` inspects to set `estimate: true`.
 */
export function asToolRule(resolved: ResolvedRule): {
  code: string;
  verified: true;
} {
  return { code: resolved.code, verified: true };
}

export function appliedRuleFromResolved(resolved: ResolvedRule): AppliedRule {
  const note = resolved.source.note;
  const url = resolved.source.url;
  return {
    code: resolved.code,
    value: resolved.value,
    effectiveFrom: resolved.effectiveFrom,
    effectiveTo: resolved.effectiveTo,
    legalBasis: resolved.legalBasis,
    documentStatus: resolved.documentStatus,
    sourceNote: typeof note === 'string' ? note : '',
    sourceUrl: typeof url === 'string' ? url : null,
    verified: resolved.verified,
  };
}

export function buildToolResult<T>(params: {
  value: T;
  lines: ResultLine[];
  assumptions: string[];
  rules: AppliedRule[];
}): ToolResult<T> {
  return {
    value: params.value,
    lines: params.lines,
    assumptions: params.assumptions,
    rules: params.rules,
    estimate: params.rules.some((rule) => !rule.verified),
  };
}
