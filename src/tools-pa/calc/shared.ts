/**
 * Shared helpers for the calc/ formulas, extracted verbatim (numerically)
 * from `payroll/domain/panama-legal-calculator.ts`. `requireVerified` is the
 * formal, throwing gate used by payroll (`legal.mode === 'formal'` in
 * `resolveRules.ts` and by direct calls from the payroll adapters). Tool
 * mode never calls it — see `tool-result.ts`.
 */
export type VerifiableRule = { code: string; verified: boolean };

export function requireVerified(rule: VerifiableRule): void {
  if (!rule.verified) throw new Error(`LEGAL_RULE_UNVERIFIED:${rule.code}`);
}
