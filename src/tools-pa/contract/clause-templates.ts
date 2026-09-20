/**
 * Clause text for the `PA-INDEF` template, kept in this single file so a
 * lawyer can review the wording without reading the surrounding code (spec
 * §5.5: "Keep clause text in one data file so it is easy for a lawyer to
 * review later"). Each entry is a plain string builder — no HTML, no
 * escaping — `render.ts`/`render-text.ts` do the escaping/formatting when
 * producing the preview.
 *
 * Wording is deliberately neutral and descriptive: it states what the
 * parties agree, drawn from the minimum content required by Art. 68 Código
 * de Trabajo, and never asserts that the document is "legal", "aprobado" or
 * "registrado" — see `render.ts` for the draft legend and registration note.
 *
 * Clause numbering (PRIMERA, SEGUNDA, ...) is assigned dynamically by
 * `clauses.ts`'s `buildContractClauses`, based on which of these entries are
 * `include`d for the given data — titles here carry only the `titleSuffix`.
 */
import { formatDateEs, formatSalaryAmountPab } from './format';
import type { PaIndefContractDraft } from './validate';

export type ContractClauseId =
  | 'partes'
  | 'objeto_funciones'
  | 'fecha_inicio'
  | 'periodo_prueba'
  | 'jornada_horario'
  | 'salario'
  | 'disposiciones_generales'
  | 'firma';

export type Clause = {
  id: ContractClauseId;
  title: string;
  text: string;
};

/** Missing leaf values render as an explicit placeholder instead of throwing, so the live preview keeps working while the review step is incomplete. */
function field(value: string | undefined | null, label: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : `[pendiente: ${label}]`;
}

/** Like `field`, but renders a valid ISO date in Spanish long form (e.g. "1 de octubre de 2026"). */
function dateField(value: string | undefined | null, label: string): string {
  const trimmed = value?.trim();
  return trimmed ? formatDateEs(trimmed) : `[pendiente: ${label}]`;
}

/** Like `field`, but renders a valid salary amount as "B/. 1,500.00"; falls back to the placeholder if the value isn't a parseable decimal yet. */
function salaryField(value: string | undefined | null, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return `[pendiente: ${label}]`;
  try {
    return formatSalaryAmountPab(trimmed);
  } catch {
    return `[pendiente: ${label}]`;
  }
}

type ClauseTemplate = {
  id: ContractClauseId;
  titleSuffix: string;
  /** Omit for a clause that is always included. */
  include?: (data: PaIndefContractDraft) => boolean;
  build: (data: PaIndefContractDraft) => string;
};

export const CLAUSE_TEMPLATES: ClauseTemplate[] = [
  {
    id: 'partes',
    titleSuffix: 'Partes',
    build: (data) => {
      const employer = data.employer ?? {};
      const employee = data.employee ?? {};
      return (
        `Entre ${field(employer.legalName, 'nombre o razón social del empleador')}, ` +
        `con RUC ${field(employer.ruc, 'RUC del empleador')}-${field(employer.dv, 'DV del empleador')}, ` +
        `con domicilio en ${field(employer.address, 'domicilio del empleador')}, ` +
        `representado(a) por ${field(employer.representativeName, 'nombre del representante')}, ` +
        `con cédula ${field(employer.representativeCedula, 'cédula del representante')} ` +
        `(en adelante, "el Empleador"), y ${field(employee.fullName, 'nombre del trabajador')}, ` +
        `de nacionalidad ${field(employee.nationality, 'nacionalidad')}, ` +
        `de ${field(employee.age, 'edad')} años de edad, sexo ${field(employee.sex, 'sexo')}, ` +
        `estado civil ${field(employee.civilStatus, 'estado civil')}, ` +
        `con domicilio en ${field(employee.address, 'domicilio del trabajador')} ` +
        `y cédula de identidad personal ${field(employee.cedula, 'cédula del trabajador')} ` +
        `(en adelante, "el Trabajador"), se celebra el presente contrato de trabajo por tiempo indefinido, ` +
        `que se regirá por las cláusulas siguientes y por el Código de Trabajo de Panamá.`
      );
    },
  },
  {
    id: 'objeto_funciones',
    titleSuffix: 'Servicio, funciones y lugar de prestación',
    build: (data) => {
      const position = data.position ?? {};
      return (
        `El Trabajador prestará sus servicios en ${field(position.service, 'servicio o actividad del Empleador')}, ` +
        `desempeñando las siguientes funciones: ${field(position.duties, 'funciones del trabajador')}. ` +
        `El lugar de prestación del servicio será ${field(position.workplace, 'lugar de prestación del servicio')}.`
      );
    },
  },
  {
    id: 'fecha_inicio',
    titleSuffix: 'Fecha de inicio',
    build: (data) => {
      const position = data.position ?? {};
      return (
        `La relación de trabajo iniciará el ${dateField(position.startDate, 'fecha de inicio')}. ` +
        `El presente contrato es por tiempo indefinido.`
      );
    },
  },
  {
    // Optional. Legal review note: basis to verify is Art. 78 Código de
    // Trabajo (período de prueba: máximo tres meses, debe constar por
    // escrito). This clause only appears when the data explicitly declares
    // `position.trialPeriodMonths`; it is never assumed.
    id: 'periodo_prueba',
    titleSuffix: 'Período de prueba',
    include: (data) => Boolean(data.position?.trialPeriodMonths),
    build: (data) => {
      const months = data.position?.trialPeriodMonths;
      const unit = months === '1' ? 'mes' : 'meses';
      return (
        `Las partes pactan un período de prueba de ${field(months, 'duración del período de prueba')} ${unit}, ` +
        `durante el cual cualquiera de ellas podrá dar por terminada la relación sin responsabilidad, ` +
        `conforme al Código de Trabajo.`
      );
    },
  },
  {
    id: 'jornada_horario',
    titleSuffix: 'Jornada y horario',
    build: (data) => {
      const position = data.position ?? {};
      return (
        `La jornada de trabajo será ${field(position.workday, 'jornada (diurna, nocturna o mixta)')}, ` +
        `con el siguiente horario: ${field(position.schedule, 'horario de trabajo')}, ` +
        `sujeto a los límites y recargos establecidos en el Código de Trabajo.`
      );
    },
  },
  {
    id: 'salario',
    titleSuffix: 'Salario, forma, período y lugar de pago',
    build: (data) => {
      const compensation = data.compensation ?? {};
      return (
        `El Empleador pagará al Trabajador un salario de ${salaryField(compensation.salaryAmount, 'monto del salario')}, ` +
        `pagadero en la forma siguiente: ${field(compensation.paymentMethod, 'forma de pago')}, ` +
        `con periodicidad ${field(compensation.paymentPeriod, 'período de pago')}, ` +
        `en ${field(compensation.paymentPlace, 'lugar de pago')}.`
      );
    },
  },
  {
    id: 'disposiciones_generales',
    titleSuffix: 'Disposiciones generales',
    build: () =>
      'En todo lo no previsto expresamente en este contrato, las partes se sujetan a lo dispuesto en el Código de Trabajo de Panamá y demás normas laborales aplicables. Este documento es un borrador para revisión y no sustituye el asesoramiento legal ni el registro que corresponda ante las autoridades competentes.',
  },
  {
    id: 'firma',
    titleSuffix: 'Lugar y fecha de firma',
    build: (data) => {
      const signature = data.signature ?? {};
      return (
        `Firmado en ${field(signature.place, 'lugar de firma')}, ` +
        `el ${dateField(signature.date, 'fecha de firma')}.\n\n` +
        `___________________________          ___________________________\n` +
        `Firma del Empleador                              Firma del Trabajador`
      );
    },
  },
];
