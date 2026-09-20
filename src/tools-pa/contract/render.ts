/**
 * `renderContractHtml` — the in-module HTML preview renderer (spec §5.5).
 * The server's PDF (pdfkit) and DOCX (`docx`) renderers live outside
 * `tools-pa` (they need Node/`@nestjs` infrastructure) but consume the same
 * `Clause[]` this module produces, so all three renderers agree on content.
 *
 * No external dependencies, no CSS/JS libraries: every value is escaped by
 * hand and the output is a single self-contained HTML document. It always
 * carries the «Borrador para revisión» legend, the template id/version/date,
 * and a note that registration before MITRADEL is a separate procedure —
 * this file must never say the document is "legal", "aprobado" or
 * "registrado".
 */
import { TEMPLATE_DATE, TEMPLATE_ID, TEMPLATE_VERSION } from './fields';
import type { Clause } from './clause-templates';

export type ContractRenderMeta = {
  templateId?: string;
  templateVersion?: string;
  templateDate?: string;
};

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/** Escapes text and turns newlines into `<br>` — the only HTML this module ever emits for clause bodies. */
function escapeMultiline(value: string): string {
  return escapeHtml(value).split('\n').join('<br>');
}

export function renderContractHtml(
  clauses: Clause[],
  meta: ContractRenderMeta = {},
): string {
  const templateId = meta.templateId ?? TEMPLATE_ID;
  const templateVersion = meta.templateVersion ?? TEMPLATE_VERSION;
  const templateDate = meta.templateDate ?? TEMPLATE_DATE;

  const clausesHtml = clauses
    .map(
      (clause) =>
        `<section class="clause" id="${escapeHtml(clause.id)}">` +
        `<h2>${escapeHtml(clause.title)}</h2>` +
        `<p>${escapeMultiline(clause.text)}</p>` +
        `</section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Contrato de trabajo por tiempo indefinido — borrador</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 24px 16px; line-height: 1.5; }
  .draft-banner { background: #fff3cd; border: 1px solid #d4a72c; color: #664d03; padding: 12px 16px; border-radius: 4px; font-weight: bold; margin-bottom: 16px; }
  .meta { font-size: 0.85em; color: #555; margin-bottom: 24px; }
  h1 { font-size: 1.3em; text-align: center; }
  h2 { font-size: 1.05em; margin-top: 1.5em; }
  .registration-note { font-size: 0.85em; color: #555; margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; }
</style>
</head>
<body>
<div class="draft-banner">Borrador para revisión — no constituye asesoría legal ni un documento aprobado o registrado</div>
<div class="meta">Plantilla ${escapeHtml(templateId)}, versión ${escapeHtml(templateVersion)} (${escapeHtml(templateDate)})</div>
<h1>Contrato de trabajo por tiempo indefinido</h1>
${clausesHtml}
<p class="registration-note">El registro de este contrato ante el Ministerio de Trabajo y Desarrollo Laboral (MITRADEL) es un trámite independiente, que debe realizarse por separado; este documento por sí solo no lo sustituye.</p>
</body>
</html>`;
}
