/**
 * `renderContractText` — the plain-text counterpart of `renderContractHtml`
 * (spec §5.5). The server's PDF (pdfkit) and DOCX (`docx`) renderers, and
 * the contract-delivery email's plain-text alternative, all build their
 * copy from this exact wording so every format the contract is delivered in
 * agrees.
 */
import { TEMPLATE_DATE, TEMPLATE_ID, TEMPLATE_VERSION } from './fields';
import type { Clause } from './clause-templates';
import type { ContractRenderMeta } from './render';

export function renderContractText(
  clauses: Clause[],
  meta: ContractRenderMeta = {},
): string {
  const templateId = meta.templateId ?? TEMPLATE_ID;
  const templateVersion = meta.templateVersion ?? TEMPLATE_VERSION;
  const templateDate = meta.templateDate ?? TEMPLATE_DATE;

  const lines = [
    'BORRADOR PARA REVISIÓN — no constituye asesoría legal ni un documento aprobado o registrado',
    `Plantilla ${templateId}, versión ${templateVersion} (${templateDate})`,
    '',
    'CONTRATO DE TRABAJO POR TIEMPO INDEFINIDO',
    '',
    ...clauses.flatMap((clause) => [clause.title, clause.text, '']),
    'El registro de este contrato ante el Ministerio de Trabajo y Desarrollo Laboral (MITRADEL) es un trámite independiente, que debe realizarse por separado; este documento por sí solo no lo sustituye.',
  ];
  return lines.join('\n');
}
