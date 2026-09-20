/**
 * Data model for the `PA-INDEF` template (contrato de trabajo por tiempo
 * indefinido), spec §5.5. Fields follow Art. 68 Código de Trabajo (contenido
 * mínimo del contrato escrito) and MITRADEL's contract guide: identification
 * of both parties, the service/duties/place, start date, jornada y horario,
 * salario (amount, forma, período y lugar de pago), and lugar y fecha de
 * firma.
 *
 * This is a data shape, not legal advice: nothing produced from it should be
 * described as "legal", "aprobado" or "registrado" — see `render.ts`.
 */
export const TEMPLATE_ID = 'PA-INDEF';
export const TEMPLATE_VERSION = 'v1';
export const TEMPLATE_DATE = '2026-09';

export type ContractEmployer = {
  legalName: string;
  ruc: string;
  dv: string;
  representativeName: string;
  representativeCedula: string;
  address: string;
};

export type ContractEmployee = {
  fullName: string;
  nationality: string;
  age: string;
  sex: string;
  civilStatus: string;
  address: string;
  cedula: string;
};

export type ContractPosition = {
  /** General description of the employer's service/industry (Art. 68-3). */
  service: string;
  /** The employee's specific duties (Art. 68-3). */
  duties: string;
  /** Lugar de prestación del servicio. */
  workplace: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  /** Jornada: diurna, nocturna o mixta. */
  workday: string;
  /** Horario descriptivo, e.g. "8:00 a.m. a 5:00 p.m., lunes a viernes". */
  schedule: string;
  /**
   * Optional trial-period length in months ('1' | '2' | '3'). When set,
   * `buildContractClauses` inserts a clause after "fecha de inicio" — see
   * `clause-templates.ts` for the Art. 78 CT review note.
   */
  trialPeriodMonths?: '1' | '2' | '3';
};

export type ContractCompensation = {
  salaryAmount: string;
  /** Forma de pago: efectivo, cheque, transferencia, etc. */
  paymentMethod: string;
  /** Período de pago: mensual, quincenal, semanal. */
  paymentPeriod: string;
  /** Lugar de pago. */
  paymentPlace: string;
};

export type ContractSignature = {
  place: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
};

export type PaIndefContractData = {
  employer: ContractEmployer;
  employee: ContractEmployee;
  position: ContractPosition;
  compensation: ContractCompensation;
  signature: ContractSignature;
};
