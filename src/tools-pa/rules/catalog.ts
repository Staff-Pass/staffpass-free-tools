/**
 * Extracted, without any data change, from
 * `payroll/domain/panama-legal-catalog.ts`. This is the "seed" shape used to
 * populate `LegalRuleVersion` rows in the formal payroll engine
 * (`prisma/seed-panama-legal.ts`, via the `payroll/domain` adapter) and,
 * here, the source data `resolveRules()` reads for tool mode.
 *
 * Every row's `verified` stays `false` and every `source.documentStatus`
 * reflects `docs/panama-legal-rules.md` exactly — see that document for the
 * legal basis and confidence of each code. Nothing in this file is legal
 * advice; it is a transcription of a research draft pending attorney review.
 */
export type PanamaRuleSeed = {
  ruleCode: string;
  valueJson: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo?: string | null;
  legalBasis: string;
  source: Record<string, unknown>;
  // The document is a draft and no attorney has approved these rows. Keeping
  // every seed inactive makes the activation boundary explicit and fail-closed.
  verified: false;
};

const source = (
  documentStatus: 'VERIFICADO' | 'NO_VERIFICADO',
  note: string,
  url?: string,
) => ({
  document: 'docs/panama-legal-rules.md',
  documentStatus,
  activationStatus: 'REQUIRES_LEGAL_REVIEW',
  note,
  ...(url ? { url } : {}),
});

export const PANAMA_RULE_SEEDS: PanamaRuleSeed[] = [
  {
    ruleCode: 'JORNADA_DIURNA',
    valueJson: {
      period: 'DAY',
      startsAt: '06:00',
      endsAt: '18:00',
      ordinaryHoursPerDay: '8',
      ordinaryHoursPerWeek: '48',
      paidHoursPerDay: '8',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Arts. 30-31',
    source: source(
      'VERIFICADO',
      'Clasificación leída en la fuente oficial referenciada por el documento',
      'https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/c%C3%B3digo-detrabajo.pdf',
    ),
    verified: false,
  },
  {
    ruleCode: 'JORNADA_NOCTURNA',
    valueJson: {
      period: 'NIGHT',
      startsAt: '18:00',
      endsAt: '06:00',
      ordinaryHoursPerDay: '7',
      ordinaryHoursPerWeek: '42',
      paidHoursPerDay: '8',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Arts. 30-31',
    source: source(
      'VERIFICADO',
      'La jornada nocturna se paga como ocho horas según el documento',
      'https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/c%C3%B3digo-detrabajo.pdf',
    ),
    verified: false,
  },
  {
    ruleCode: 'JORNADA_MIXTA',
    valueJson: {
      period: 'MIXED',
      maximumNocturnalHours: '3',
      ordinaryHoursPerDay: '7.5',
      ordinaryHoursPerWeek: '45',
      paidHoursPerDay: '8',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Arts. 30-31',
    source: source(
      'VERIFICADO',
      'La jornada mixta pasa a nocturna cuando excede tres horas nocturnas',
      'https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/c%C3%B3digo-detrabajo.pdf',
    ),
    verified: false,
  },
  {
    ruleCode: 'HORA_EXTRA_DIURNA',
    valueJson: { rate: '0.25', multiplier: '1.25', workPeriod: 'DAY' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 33-1',
    source: source('VERIFICADO', 'Recargo de hora extra diurna'),
    verified: false,
  },
  {
    ruleCode: 'HORA_EXTRA_NOCTURNA',
    valueJson: { rate: '0.50', multiplier: '1.50', workPeriod: 'NIGHT' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 33-2',
    source: source('VERIFICADO', 'Recargo de hora extra nocturna'),
    verified: false,
  },
  {
    ruleCode: 'HORA_EXTRA_MIXTA_NOCTURNA',
    valueJson: { rate: '0.75', multiplier: '1.75', workPeriod: 'MIXED_NIGHT' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 33-3',
    source: source('VERIFICADO', 'Recargo de prolongación nocturna/mixta'),
    verified: false,
  },
  {
    ruleCode: 'TOPE_HORA_EXTRA_DIARIO',
    valueJson: { maximumHours: '3' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 36',
    source: source('VERIFICADO', 'Tope diario de horas extraordinarias'),
    verified: false,
  },
  {
    ruleCode: 'TOPE_HORA_EXTRA_SEMANAL',
    valueJson: { maximumHours: '9' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 36',
    source: source('VERIFICADO', 'Tope semanal de horas extraordinarias'),
    verified: false,
  },
  {
    ruleCode: 'RECARGO_EXCEDENTE_TOPE',
    valueJson: { rate: '0.75', multiplier: '1.75' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 36',
    source: source('VERIFICADO', 'Recargo del excedente de los topes'),
    verified: false,
  },
  {
    ruleCode: 'RECARGO_DIA_DESCANSO',
    valueJson: { rate: '0.50', multiplier: '1.50' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 48',
    source: source('VERIFICADO', 'Trabajo en domingo o descanso obligatorio'),
    verified: false,
  },
  {
    ruleCode: 'RECARGO_DIA_COMPENSATORIO',
    valueJson: { rate: '0.50', multiplier: '1.50' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 48',
    source: source('VERIFICADO', 'Trabajo en el día compensatorio'),
    verified: false,
  },
  {
    ruleCode: 'PAGO_FERIADO_NO_TRABAJADO',
    valueJson: { rate: '1', multiplier: '1' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 45',
    source: source(
      'NO_VERIFICADO',
      'Calendario y tratamiento de feriados requieren revisión oficial',
    ),
    verified: false,
  },
  {
    ruleCode: 'RECARGO_DIA_FERIADO_TRABAJADO',
    valueJson: {
      rate: null,
      candidateRates: ['1.50', '2.50'],
      ambiguity:
        '150 percent total versus one hundred percent plus one hundred fifty percent',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 49',
    source: source(
      'NO_VERIFICADO',
      'El documento deja expresamente pendiente el multiplicador exacto',
    ),
    verified: false,
  },
  {
    ruleCode: 'RECARGO_FERIADO_JORNADA_REDUCIDA',
    valueJson: { dayRate: '0.50', mixedNightRate: '0.75' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 49, párrafo final',
    source: source(
      'NO_VERIFICADO',
      'Tratamiento específico pendiente de revisión',
    ),
    verified: false,
  },
  {
    ruleCode: 'COMBINACION_RECARGOS',
    valueJson: { order: ['dayOrHoliday', 'overtime'], mode: 'SEQUENTIAL' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 50',
    source: source('VERIFICADO', 'Los recargos se aplican de forma secuencial'),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_ACCRUAL_CUATRIMESTRE',
    valueJson: {
      periods: [
        { from: '12-16', to: '04-15' },
        { from: '04-16', to: '08-15' },
        { from: '08-16', to: '12-15' },
      ],
    },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Decreto de Gabinete No. 221 de 18-nov-1971',
    source: source(
      'VERIFICADO',
      'Periodos de devengo documentados por MITRADEL FAQ',
    ),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_PAGO_FECHAS',
    valueJson: { paymentDays: ['04-15', '08-15', '12-15'] },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Decreto de Gabinete No. 221 de 18-nov-1971',
    source: source(
      'VERIFICADO',
      'Fechas de pago documentadas por MITRADEL FAQ',
    ),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_FORMULA_BASE',
    valueJson: { formula: 'SUM_CUATRIMESTRE_DIVIDED_BY_12', divisor: '12' },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Decreto de Gabinete No. 221 de 18-nov-1971',
    source: source('VERIFICADO', 'Fórmula general del documento'),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_PRORRATEO_PARCIAL',
    valueJson: { formula: null, status: 'BLOCKED_UNTIL_LEGAL_REVIEW' },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Decreto de Gabinete No. 221 de 18-nov-1971',
    source: source(
      'NO_VERIFICADO',
      'El tratamiento de cuatrimestre parcial es ambiguo',
    ),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_BASE_INCLUYE_EXTRAORDINARIO',
    valueJson: { includesOvertimeAndCommissions: null },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Decreto de Gabinete No. 221 de 18-nov-1971',
    source: source(
      'NO_VERIFICADO',
      'La inclusión de variables no quedó confirmada',
    ),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_ISR_TRATAMIENTO',
    valueJson: { treatment: null },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Código Fiscal, Art. 708 (pendiente de confirmar)',
    source: source('NO_VERIFICADO', 'Fuentes secundarias en conflicto'),
    verified: false,
  },
  {
    ruleCode: 'DECIMO_CSS_TRATAMIENTO',
    valueJson: { treatment: null, rate: null },
    effectiveFrom: '1971-11-18',
    legalBasis: 'CSS (pendiente de confirmar)',
    source: source(
      'NO_VERIFICADO',
      'La cotización y tasa sobre décimo no fueron confirmadas',
    ),
    verified: false,
  },
  {
    ruleCode: 'VACACIONES_DERECHO_BASE',
    valueJson: {
      serviceDays: '11',
      grantDays: '1',
      fullPeriodDays: '330',
      fullGrantDays: '30',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 54-1',
    source: source(
      'VERIFICADO',
      'Devengo de un día por cada once días al servicio',
    ),
    verified: false,
  },
  {
    ruleCode: 'VACACIONES_PROPORCIONAL',
    valueJson: {
      serviceDays: '11',
      grantDays: '1',
      formula: 'SERVICE_DAYS_DIVIDED_BY_11',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 54-3',
    source: source('VERIFICADO', 'Tratamiento proporcional documentado'),
    verified: false,
  },
  {
    ruleCode: 'VACACIONES_BASE_CALCULO',
    valueJson: {
      salaryBasis: 'MAX_AVERAGE_LAST_11_MONTHS_OR_LAST_SALARY',
      divisor: '30',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 54-1',
    source: source(
      'VERIFICADO',
      'Base más favorable para remuneración vacacional',
    ),
    verified: false,
  },
  {
    ruleCode: 'VACACIONES_COMPENSACION_TERMINO',
    valueJson: {
      serviceDays: '11',
      grantDays: '1',
      payment: 'CASH_AT_TERMINATION',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 54-6',
    source: source(
      'VERIFICADO',
      'Compensación proporcional al finalizar la relación',
    ),
    verified: false,
  },
  {
    ruleCode: 'PRIMA_ANTIGUEDAD',
    valueJson: {
      weeksPerServiceYear: '1',
      base: 'AVERAGE_TOTAL_REMUNERATION_LAST_5_YEARS',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 224',
    source: source('VERIFICADO', 'Una semana por año laborado'),
    verified: false,
  },
  {
    ruleCode: 'PRIMA_ANTIGUEDAD_BASE',
    valueJson: { lookbackYears: '5', base: 'TOTAL_REMUNERATION' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 226',
    source: source(
      'VERIFICADO',
      'Promedio de remuneración de últimos cinco años',
    ),
    verified: false,
  },
  {
    ruleCode: 'PRIMA_ANTIGUEDAD_FONDO',
    valueJson: { frequency: 'QUARTERLY', destination: 'CESANTIA_FUND' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 229-B',
    source: source('VERIFICADO', 'Cuota parte para Fondo de Cesantía'),
    verified: false,
  },
  {
    ruleCode: 'BONIFICACION_ANUAL',
    valueJson: { enabled: false, requiresCompanyOverride: true },
    effectiveFrom: '1971-01-01',
    legalBasis: 'No se encontró figura legal autónoma en el documento',
    source: source(
      'NO_VERIFICADO',
      'No crear una prestación legal implícita ni duplicar el décimo',
    ),
    verified: false,
  },
  {
    ruleCode: 'CAUSALES_DESPIDO_JUSTIFICADO',
    valueJson: { causes: null, status: 'BLOCKED_UNTIL_LEGAL_REVIEW' },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 213',
    source: source(
      'NO_VERIFICADO',
      'Causales pendientes de confirmación primaria',
    ),
    verified: false,
  },
  {
    ruleCode: 'PREAVISO_EMPLEADOR',
    valueJson: {
      days: '30',
      minimumServiceYears: '2',
      status: 'BLOCKED_UNTIL_LEGAL_REVIEW',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 212',
    source: source(
      'NO_VERIFICADO',
      'Preaviso pendiente de confirmación primaria',
    ),
    verified: false,
  },
  {
    ruleCode: 'PREAVISO_TRABAJADOR',
    valueJson: {
      days: '15',
      technicalWorkerDays: '60',
      status: 'BLOCKED_UNTIL_LEGAL_REVIEW',
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Código de Trabajo, Art. 212',
    source: source(
      'NO_VERIFICADO',
      'Preaviso de renuncia pendiente de confirmación primaria',
    ),
    verified: false,
  },
  {
    ruleCode: 'INDEMNIZACION_ESCALA',
    valueJson: {
      firstYears: '10',
      weeksPerYearFirst: '3.4',
      weeksPerYearAfter: '1',
    },
    effectiveFrom: '1995-06-01',
    legalBasis: 'Código de Trabajo, Art. 225 (reforma Ley 44/1995)',
    source: source(
      'NO_VERIFICADO',
      'Escala triangulada en fuentes secundarias',
    ),
    verified: false,
  },
  {
    ruleCode: 'INDEMNIZACION_BASE_SALARIAL',
    valueJson: {
      lookbackYears: '5',
      base: 'TOTAL_REMUNERATION',
      favorable: true,
    },
    effectiveFrom: '1995-06-01',
    legalBasis: 'Código de Trabajo, Art. 226',
    source: source(
      'NO_VERIFICADO',
      'Aplicación a indemnización pendiente de revisión específica',
    ),
    verified: false,
  },
  {
    ruleCode: 'FONDO_CESANTIA_APORTE',
    valueJson: { indemnityRate: '0.05', frequency: 'QUARTERLY' },
    effectiveFrom: '1995-06-01',
    legalBasis: 'Código de Trabajo, Arts. 229-A a 229-N',
    source: source(
      'NO_VERIFICADO',
      'Aporte de indemnización no confirmado oficialmente',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_CUOTA_EMPLEADO',
    valueJson: { rate: '0.0975', contributionType: 'CSS', payer: 'EMPLOYEE' },
    effectiveFrom: '2025-03-18',
    legalBasis: 'Ley 51 de 2005, reformada por Ley 462 de 2025',
    source: source(
      'NO_VERIFICADO',
      'Tasa secundaria pendiente de texto oficial CSS/Gaceta',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_CUOTA_PATRONAL',
    valueJson: { rate: '0.1325' },
    effectiveFrom: '2025-03-18',
    effectiveTo: '2027-03-01',
    legalBasis: 'Ley 462 de 2025',
    source: source(
      'NO_VERIFICADO',
      'Tramos secundarios sin confirmación de fuente oficial',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_CUOTA_PATRONAL_TRAMO1',
    valueJson: { rate: '0.1325' },
    effectiveFrom: '2025-03-18',
    effectiveTo: '2027-03-01',
    legalBasis: 'Ley 462 de 2025',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario sin confirmación de fuente oficial',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_CUOTA_PATRONAL_TRAMO2',
    valueJson: { rate: '0.1425' },
    effectiveFrom: '2027-03-01',
    effectiveTo: '2029-03-01',
    legalBasis: 'Ley 462 de 2025',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario sin confirmación de fuente oficial',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_CUOTA_PATRONAL_TRAMO3',
    valueJson: { rate: '0.1525' },
    effectiveFrom: '2029-03-01',
    legalBasis: 'Ley 462 de 2025',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario sin confirmación de fuente oficial',
    ),
    verified: false,
  },
  {
    ruleCode: 'SEGURO_EDUCATIVO_EMPLEADO',
    valueJson: {
      rate: '0.0125',
      contributionType: 'EDUCATION',
      payer: 'EMPLOYEE',
    },
    effectiveFrom: '1987-01-01',
    legalBasis:
      'Decreto de Gabinete 168 de 1971, Ley 13 de 1987 (pendiente de confirmar)',
    source: source(
      'NO_VERIFICADO',
      'La base legal citada difiere de otra referencia del requerimiento',
    ),
    verified: false,
  },
  {
    ruleCode: 'SEGURO_EDUCATIVO_PATRONAL',
    valueJson: {
      rate: '0.015',
      contributionType: 'EDUCATION',
      payer: 'EMPLOYER',
      exclusionMonth: 'THIRTEENTH',
    },
    effectiveFrom: '1987-01-01',
    legalBasis:
      'Decreto de Gabinete 168 de 1971, Ley 13 de 1987 (pendiente de confirmar)',
    source: source(
      'NO_VERIFICADO',
      'Tasa y exclusión del mes del décimo pendientes de confirmar',
    ),
    verified: false,
  },
  {
    ruleCode: 'RIESGOS_PROFESIONALES_CLASE',
    valueJson: {
      rate: null,
      candidateRange: ['0.0056', '0.0567'],
      alternativeMinimum: '0.0105',
      riskClass: null,
    },
    effectiveFrom: '1970-07-01',
    legalBasis: 'Decreto de Gabinete 68 de 1970, Acuerdo No. 2 de 1-jul-1970',
    source: source(
      'NO_VERIFICADO',
      'Cifras secundarias en conflicto; no usar tasa cero como sustituto',
    ),
    verified: false,
  },
  {
    ruleCode: 'CSS_TOPE_SALARIAL',
    valueJson: { ceiling: null, appliesTo: 'CONTRIBUTION_BASE' },
    effectiveFrom: '2005-01-01',
    legalBasis: 'Ley 51 de 2005',
    source: source(
      'NO_VERIFICADO',
      'El documento recomienda confirmar que no hay tope de cotización',
    ),
    verified: false,
  },
  {
    ruleCode: 'ISR_BRACKET_1',
    valueJson: { annualFrom: '0', annualTo: '11000', rate: '0' },
    effectiveFrom: '2010-01-01',
    legalBasis: 'Código Fiscal, Art. 700, reformado por Ley 8 de 2010',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario pendiente de confirmación DGI',
    ),
    verified: false,
  },
  {
    ruleCode: 'ISR_BRACKET_2',
    valueJson: { annualFrom: '11000', annualTo: '50000', rate: '0.15' },
    effectiveFrom: '2010-01-01',
    legalBasis: 'Código Fiscal, Art. 700, reformado por Ley 8 de 2010',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario pendiente de confirmación DGI',
    ),
    verified: false,
  },
  {
    ruleCode: 'ISR_BRACKET_3',
    valueJson: { annualFrom: '50000', annualTo: null, rate: '0.25' },
    effectiveFrom: '2010-01-01',
    legalBasis: 'Código Fiscal, Art. 700, reformado por Ley 8 de 2010',
    source: source(
      'NO_VERIFICADO',
      'Tramo secundario pendiente de confirmación DGI',
    ),
    verified: false,
  },
  {
    ruleCode: 'ISR_FECHA_DECLARACION',
    valueJson: { month: '03', day: '15' },
    effectiveFrom: '2005-02-02',
    legalBasis: 'Ley 6 de 2-feb-2005, Art. 20 (Art. 710 Código Fiscal)',
    source: source('VERIFICADO', 'Fecha de declaración confirmada en DGI'),
    verified: false,
  },
  {
    ruleCode: 'ISR_METODO_RETENCION',
    valueJson: {
      projection: true,
      includeThirteenth: true,
      divideByRemainingPeriods: true,
    },
    effectiveFrom: '2010-01-01',
    legalBasis: 'Resolución DGI pendiente de localizar',
    source: source(
      'NO_VERIFICADO',
      'Método de retención descrito solo por fuentes secundarias',
    ),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_DECIMO_MENSUAL',
    valueJson: { formula: 'MONTHLY_DIVISOR', divisor: '3', derived: true },
    effectiveFrom: '1971-11-18',
    legalBasis: 'Derivada de la sección 2 del documento',
    source: source(
      'NO_VERIFICADO',
      'Prorrateo contable, no texto legal autónomo',
    ),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_VACACIONES_MENSUAL',
    valueJson: { formula: 'MONTHLY_DIVISOR', divisor: '11', derived: true },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Derivada de la sección 3 del documento',
    source: source(
      'NO_VERIFICADO',
      'Prorrateo contable, no texto legal autónomo',
    ),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_PRIMA_ANTIGUEDAD_MENSUAL',
    valueJson: {
      formula: 'MONTHLY_TIMES_NUMERATOR_OVER_DENOMINATOR',
      numerator: '1',
      denominator: '52',
      derived: true,
    },
    effectiveFrom: '1971-01-01',
    legalBasis: 'Derivada de la sección 4 del documento',
    source: source(
      'NO_VERIFICADO',
      'Prorrateo contable pendiente de validación',
    ),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_INDEMNIZACION_MENSUAL',
    valueJson: { formula: null, derived: true },
    effectiveFrom: '1995-06-01',
    legalBasis: 'Derivada de la sección 5 del documento',
    source: source('NO_VERIFICADO', 'Detalle de prorrateo mensual pendiente'),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_CSS_PATRONAL_MENSUAL',
    valueJson: { formula: 'MONTHLY_TIMES_RATE', rate: null, derived: true },
    effectiveFrom: '2025-03-18',
    legalBasis: 'Derivada de la sección 6 del documento',
    source: source(
      'NO_VERIFICADO',
      'Tasa patronal pendiente de validación CSS',
    ),
    verified: false,
  },
  {
    ruleCode: 'PROVISION_RIESGOS_PROFESIONALES_MENSUAL',
    valueJson: { formula: 'MONTHLY_TIMES_RATE', rate: null, derived: true },
    effectiveFrom: '1970-07-01',
    legalBasis: 'Derivada de la sección 6 del documento',
    source: source(
      'NO_VERIFICADO',
      'Tabla de riesgo pendiente de validación CSS',
    ),
    verified: false,
  },
];

export type PanamaIsrSeed = {
  annualFrom: string;
  annualTo?: string | null;
  rate: string;
};

export const PANAMA_ISR_BRACKET_SEEDS: PanamaIsrSeed[] = [
  { annualFrom: '0', annualTo: '11000', rate: '0' },
  { annualFrom: '11000', annualTo: '50000', rate: '0.15' },
  { annualFrom: '50000', annualTo: null, rate: '0.25' },
];

export type PanamaContributionSeed = {
  code: string;
  contributionType: string;
  payer: 'EMPLOYEE' | 'EMPLOYER';
  rate?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  riskClass?: number | null;
  candidateRates?: string[] | null;
};

export const PANAMA_CONTRIBUTION_SEEDS: PanamaContributionSeed[] = [
  {
    code: 'CSS_CUOTA_EMPLEADO',
    contributionType: 'CSS',
    payer: 'EMPLOYEE',
    rate: '0.0975',
    effectiveFrom: '2025-03-18',
  },
  {
    code: 'CSS_CUOTA_PATRONAL_TRAMO1',
    contributionType: 'CSS',
    payer: 'EMPLOYER',
    rate: '0.1325',
    effectiveFrom: '2025-03-18',
    effectiveTo: '2027-03-01',
  },
  {
    code: 'CSS_CUOTA_PATRONAL_TRAMO2',
    contributionType: 'CSS',
    payer: 'EMPLOYER',
    rate: '0.1425',
    effectiveFrom: '2027-03-01',
    effectiveTo: '2029-03-01',
  },
  {
    code: 'CSS_CUOTA_PATRONAL_TRAMO3',
    contributionType: 'CSS',
    payer: 'EMPLOYER',
    rate: '0.1525',
    effectiveFrom: '2029-03-01',
  },
  {
    code: 'SEGURO_EDUCATIVO_EMPLEADO',
    contributionType: 'EDUCATION',
    payer: 'EMPLOYEE',
    rate: '0.0125',
    effectiveFrom: '1987-01-01',
  },
  {
    code: 'SEGURO_EDUCATIVO_PATRONAL',
    contributionType: 'EDUCATION',
    payer: 'EMPLOYER',
    rate: '0.015',
    effectiveFrom: '1987-01-01',
  },
  {
    code: 'RIESGOS_PROFESIONALES_CLASE',
    contributionType: 'RISK',
    payer: 'EMPLOYER',
    rate: null,
    effectiveFrom: '1970-07-01',
    candidateRates: ['0.0056', '0.0567', '0.0105'],
  },
];

export const PANAMA_OVERTIME_SEEDS = [
  {
    code: 'HORA_EXTRA_DIURNA',
    dayType: 'ORDINARY',
    workPeriod: 'DAY',
    minimumHours: '0',
    maximumHours: '3',
    rate: '0.25',
  },
  {
    code: 'HORA_EXTRA_NOCTURNA',
    dayType: 'ORDINARY',
    workPeriod: 'NIGHT',
    minimumHours: '0',
    maximumHours: '3',
    rate: '0.5',
  },
  {
    code: 'HORA_EXTRA_MIXTA_NOCTURNA',
    dayType: 'ORDINARY',
    workPeriod: 'MIXED_NIGHT',
    minimumHours: '0',
    maximumHours: '3',
    rate: '0.75',
  },
  {
    code: 'RECARGO_DIA_DESCANSO',
    dayType: 'WEEKLY_REST',
    workPeriod: 'ANY',
    rate: '0.5',
  },
  {
    code: 'RECARGO_DIA_COMPENSATORIO',
    dayType: 'COMPENSATORY_REST',
    workPeriod: 'ANY',
    rate: '0.5',
  },
  {
    code: 'RECARGO_DIA_FERIADO_TRABAJADO',
    dayType: 'HOLIDAY',
    workPeriod: 'ANY',
    rate: null,
  },
  {
    code: 'RECARGO_EXCEDENTE_TOPE',
    dayType: 'ANY',
    workPeriod: 'ANY',
    rate: '0.75',
  },
] as const;

export const PANAMA_HOLIDAY_SEEDS = [
  { code: 'NEW_YEAR', name: 'Año Nuevo', month: 1, day: 1, movableKey: null },
  {
    code: 'MARTYRS_DAY',
    name: 'Día de los Mártires',
    month: 1,
    day: 9,
    movableKey: null,
  },
  {
    code: 'CARNIVAL_TUESDAY',
    name: 'Martes de Carnaval',
    month: null,
    day: null,
    movableKey: 'CARNIVAL_TUESDAY',
  },
  {
    code: 'GOOD_FRIDAY',
    name: 'Viernes Santo',
    month: null,
    day: null,
    movableKey: 'GOOD_FRIDAY',
  },
  {
    code: 'LABOR_DAY',
    name: 'Día del Trabajo',
    month: 5,
    day: 1,
    movableKey: null,
  },
  {
    code: 'SEPARATION_COLOMBIA',
    name: 'Separación de Panamá de Colombia',
    month: 11,
    day: 3,
    movableKey: null,
  },
  {
    code: 'COLON_PATRIOTIC',
    name: 'Conmemoración Patriótica de Colón',
    month: 11,
    day: 5,
    movableKey: null,
  },
  {
    code: 'FIRST_INDEPENDENCE_CRY',
    name: 'Primer Grito de Independencia',
    month: 11,
    day: 10,
    movableKey: null,
  },
  {
    code: 'INDEPENDENCE_SPAIN',
    name: 'Independencia de Panamá de España',
    month: 11,
    day: 28,
    movableKey: null,
  },
  {
    code: 'MOTHERS_DAY',
    name: 'Día de la Madre',
    month: 12,
    day: 8,
    movableKey: null,
  },
  { code: 'CHRISTMAS', name: 'Navidad', month: 12, day: 25, movableKey: null },
  {
    code: 'PRESIDENTIAL_TAKEOVER',
    name: 'Toma de Posesión Presidencial',
    month: null,
    day: null,
    movableKey: 'PRESIDENTIAL_TAKEOVER_EVERY_5_YEARS',
  },
] as const;
