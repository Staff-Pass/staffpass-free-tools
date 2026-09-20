/**
 * `resolveRules(date)` — picks, for a calculation date, the catalog row that
 * is effective on that date for each rule code (spec §5.2: "resolveRules
 * (fecha) elige la versión vigente de cada regla según la fecha del período
 * calculado, por ejemplo los escalones de la cuota patronal de la CSS").
 *
 * The catalog (`rules/catalog.ts`) has at most one row per `ruleCode` today,
 * except the CSS employer contribution, which is modeled as three
 * *different* codes (`CSS_CUOTA_PATRONAL_TRAMO{1,2,3}`) each with its own
 * validity window (Ley 462/2025's phase-in). `resolveCssEmployerCode` picks
 * the right one for a date, matching
 * `PanamaLegalEngineService.ruleCodesForOperation`'s `CONTRIBUTIONS` branch
 * exactly, so the formal engine and tools-pa agree on which tramo applies.
 *
 * Every row in this catalog carries `verified: false` (see `catalog.ts`):
 * none of it has passed attorney review yet. `resolveRules` surfaces that
 * as-is; it is `tool-result.ts` (via `asToolRule`) that decides what to do
 * with an unverified rule in tool mode versus formal payroll mode.
 */
import { PANAMA_RULE_SEEDS, type PanamaRuleSeed } from './catalog';

export type ResolvedRule = {
  code: string;
  value: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  legalBasis: string;
  documentStatus: 'VERIFICADO' | 'NO_VERIFICADO';
  verified: boolean;
  source: Record<string, unknown>;
};

/** Accepts a Date or an ISO-ish string ('YYYY-MM-DD' or a full ISO datetime). */
export function toIsoDate(date: string | Date): string {
  if (typeof date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}/.test(date))
      throw new Error('date must be an ISO date (YYYY-MM-DD)');
    return date.slice(0, 10);
  }
  if (Number.isNaN(date.getTime()))
    throw new Error('date must be a valid Date');
  return date.toISOString().slice(0, 10);
}

function isEffective(seed: PanamaRuleSeed, isoDate: string): boolean {
  return (
    seed.effectiveFrom <= isoDate &&
    (!seed.effectiveTo || isoDate < seed.effectiveTo)
  );
}

function toResolved(seed: PanamaRuleSeed): ResolvedRule {
  const documentStatus = seed.source.documentStatus;
  return {
    code: seed.ruleCode,
    value: seed.valueJson,
    effectiveFrom: seed.effectiveFrom,
    effectiveTo: seed.effectiveTo ?? null,
    legalBasis: seed.legalBasis,
    documentStatus:
      documentStatus === 'VERIFICADO' ? 'VERIFICADO' : 'NO_VERIFICADO',
    verified: seed.verified,
    source: seed.source,
  };
}

/**
 * Returns every catalog rule effective on `date`, keyed by `ruleCode`. If a
 * code somehow has more than one row effective at once, the row with the
 * latest `effectiveFrom` wins (most specific/most recent supersedes).
 */
export function resolveRules(date: string | Date): Map<string, ResolvedRule> {
  const isoDate = toIsoDate(date);
  const result = new Map<string, ResolvedRule>();
  for (const seed of PANAMA_RULE_SEEDS) {
    if (!isEffective(seed, isoDate)) continue;
    const existing = result.get(seed.ruleCode);
    if (!existing || seed.effectiveFrom > existing.effectiveFrom)
      result.set(seed.ruleCode, toResolved(seed));
  }
  return result;
}

/** Resolves a single rule code, or throws if it has no row effective on `date`. */
export function resolveRule(code: string, date: string | Date): ResolvedRule {
  const rule = resolveRules(date).get(code);
  if (!rule) throw new Error(`LEGAL_RULE_NOT_FOUND:${code}:${toIsoDate(date)}`);
  return rule;
}

/**
 * The CSS employer-contribution code effective on `date`, stepping through
 * Ley 462/2025's three tramos exactly like
 * `PanamaLegalEngineService.ruleCodesForOperation`'s `CONTRIBUTIONS` case.
 */
export function resolveCssEmployerCode(date: string | Date): string {
  const isoDate = toIsoDate(date);
  if (isoDate >= '2029-03-01') return 'CSS_CUOTA_PATRONAL_TRAMO3';
  if (isoDate >= '2027-03-01') return 'CSS_CUOTA_PATRONAL_TRAMO2';
  return 'CSS_CUOTA_PATRONAL_TRAMO1';
}
