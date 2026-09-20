import type { PaIndefContractDraft } from './validate';
import { CLAUSE_TEMPLATES, type Clause } from './clause-templates';

export type { Clause, ContractClauseId } from './clause-templates';

const ORDINALS = [
  'PRIMERA',
  'SEGUNDA',
  'TERCERA',
  'CUARTA',
  'QUINTA',
  'SEXTA',
  'SÉPTIMA',
  'OCTAVA',
  'NOVENA',
  'DÉCIMA',
];

function ordinalFor(index: number): string {
  return ORDINALS[index] ?? `CLÁUSULA ${index + 1}`;
}

/**
 * Builds the ordered clause list for the `PA-INDEF` template. Accepts a
 * partial draft on purpose: the review step (spec §6.3, paso 3) shows a live
 * preview while fields are still being filled in, with pending fields shown
 * as `[pendiente: ...]` placeholders inside the clause text (see
 * `clause-templates.ts`). Call `validateContract` separately to know which
 * fields are still missing before treating the contract as complete.
 *
 * Optional clauses (currently: `periodo_prueba`) are only included when
 * their data is present, and every clause's ordinal (PRIMERA, SEGUNDA, ...)
 * is assigned by its position in the final, filtered list — never hardcoded
 * — so adding or omitting an optional clause never misnumbers the rest.
 */
export function buildContractClauses(data: PaIndefContractDraft): Clause[] {
  const applicable = CLAUSE_TEMPLATES.filter(
    (template) => !template.include || template.include(data),
  );
  return applicable.map((template, index) => ({
    id: template.id,
    title: `${ordinalFor(index)}: ${template.titleSuffix}`,
    text: template.build(data),
  }));
}
