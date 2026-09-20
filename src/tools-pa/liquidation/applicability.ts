/**
 * Applicability matrix for liquidación de contrato por tiempo indefinido
 * (spec §5.4), derived from `docs/panama-legal-rules.md` and
 * `rules/catalog.ts`. Ola 1 supports exactly one contract type
 * (`INDEFINIDO`) and three termination causes.
 *
 * | Concepto                | renuncia | despido_injustificado | mutuo_acuerdo | Base legal |
 * |-------------------------|:--------:|:----------------------:|:--------------:|------------|
 * | Salarios pendientes     |    Sí    |           Sí            |       Sí        | Deuda laboral general, no depende de la causa |
 * | Vacaciones proporcionales |  Sí    |           Sí            |       Sí        | Art. 54-6 CT (`VACACIONES_COMPENSACION_TERMINO`): "pago proporcional en efectivo" al terminar la relación, cualquiera sea la causa |
 * | Décimo proporcional     |    Sí    |           Sí            |       Sí        | Decreto de Gabinete 221/1971 (`DECIMO_FORMULA_BASE`): se devenga con el tiempo trabajado, independiente de la causa de salida. El prorrateo exacto de un cuatrimestre incompleto es `DECIMO_PRORRATEO_PARCIAL`, marcado NO VERIFICADO en el documento — se muestra como estimación |
 * | Prima de antigüedad     |    Sí    |           Sí            |       Sí        | Art. 224 CT (`PRIMA_ANTIGUEDAD`): "a la terminación de todo contrato por tiempo indefinido, cualquiera sea la causa (incluida renuncia)" — el propio artículo excluye la causa como condición |
 * | Indemnización           |    No    |           Sí            |       No        | Art. 225 CT (`INDEMNIZACION_ESCALA`): la escala de semanas por año está definida para "despido injustificado"; no es una prestación de salida general. En renuncia no hay despido que indemnizar. En mutuo acuerdo no hay una obligación legal de indemnizar — cualquier pago adicional pactado es contractual, no una prestación de esta calculadora |
 *
 * Every row's document status feeds `estimate` in the `ToolResult`/concept
 * result: `NO_VERIFICADO` rows (indemnización, and the partial-cuatrimestre
 * treatment of décimo) are shown as estimates even when `applies: true`.
 */
export const SUPPORTED_CONTRACT_TYPE = 'INDEFINIDO';

export const SUPPORTED_CAUSES = [
  'renuncia',
  'despido_injustificado',
  'mutuo_acuerdo',
] as const;
export type LiquidationCause = (typeof SUPPORTED_CAUSES)[number];

export type LiquidationConceptKey =
  | 'pendingSalary'
  | 'vacations'
  | 'thirteenthProportional'
  | 'seniorityPremium'
  | 'indemnity';

const CAUSE_LABELS: Record<LiquidationCause, string> = {
  renuncia: 'renuncia',
  despido_injustificado: 'despido injustificado',
  mutuo_acuerdo: 'mutuo acuerdo',
};

/**
 * Whether `concept` applies for `cause`, and the Spanish reason to show the
 * user either way (spec §5.4: "monto, si aplica o no y por qué").
 */
export function checkApplicability(
  concept: LiquidationConceptKey,
  cause: LiquidationCause,
): { applies: boolean; reason: string } {
  switch (concept) {
    case 'pendingSalary':
      return {
        applies: true,
        reason:
          'Todo salario trabajado y no pagado se debe, sin importar la causa de terminación.',
      };
    case 'vacations':
      return {
        applies: true,
        reason:
          'Las vacaciones proporcionales se pagan en efectivo al terminar la relación laboral, cualquiera sea la causa (Art. 54-6 Código de Trabajo).',
      };
    case 'thirteenthProportional':
      return {
        applies: true,
        reason:
          'El décimo tercer mes se devenga con el tiempo trabajado y se paga proporcionalmente al terminar la relación, cualquiera sea la causa (Decreto de Gabinete 221 de 1971).',
      };
    case 'seniorityPremium':
      return {
        applies: true,
        reason:
          'La prima de antigüedad se paga a la terminación de todo contrato por tiempo indefinido, cualquiera sea la causa, incluida la renuncia (Art. 224 Código de Trabajo).',
      };
    case 'indemnity':
      if (cause === 'despido_injustificado')
        return {
          applies: true,
          reason:
            'La indemnización por despido injustificado aplica porque la causa declarada es despido injustificado (Art. 225 Código de Trabajo).',
        };
      return {
        applies: false,
        reason: `La indemnización del Art. 225 Código de Trabajo solo aplica a despidos injustificados; no aplica a ${CAUSE_LABELS[cause]}. Si el acuerdo incluye un pago adicional, es un pacto contractual y no una prestación calculada aquí.`,
      };
  }
}
