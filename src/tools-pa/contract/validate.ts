/**
 * `validateContract(data)` — used identically by the browser (live "campos
 * pendientes" highlighting in the review step) and the server (before
 * rendering PDF/DOCX and sending the contract by email). Spec §5.5.
 */
import { toDecimal } from '../money';
import type {
  ContractCompensation,
  ContractEmployee,
  ContractEmployer,
  ContractPosition,
  ContractSignature,
} from './fields';

/** A partial draft: every leaf field is optional, as the review step fills them in gradually. */
export type PaIndefContractDraft = {
  employer?: Partial<ContractEmployer>;
  employee?: Partial<ContractEmployee>;
  position?: Partial<ContractPosition>;
  compensation?: Partial<ContractCompensation>;
  signature?: Partial<ContractSignature>;
};

export type InvalidField = { field: string; reason: string };
export type ContractValidation = {
  missing: string[];
  invalid: InvalidField[];
};

type FieldSpec = {
  path: string;
  get: (data: PaIndefContractDraft) => string | undefined;
  validate?: (value: string) => string | null;
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

const isoDateValidator = (value: string): string | null =>
  isIsoDate(value) ? null : 'Debe ser una fecha válida en formato AAAA-MM-DD.';

const FIELDS: FieldSpec[] = [
  { path: 'employer.legalName', get: (d) => d.employer?.legalName },
  { path: 'employer.ruc', get: (d) => d.employer?.ruc },
  { path: 'employer.dv', get: (d) => d.employer?.dv },
  {
    path: 'employer.representativeName',
    get: (d) => d.employer?.representativeName,
  },
  {
    path: 'employer.representativeCedula',
    get: (d) => d.employer?.representativeCedula,
  },
  { path: 'employer.address', get: (d) => d.employer?.address },
  { path: 'employee.fullName', get: (d) => d.employee?.fullName },
  { path: 'employee.nationality', get: (d) => d.employee?.nationality },
  {
    path: 'employee.age',
    get: (d) => d.employee?.age,
    validate: (value) =>
      /^\d+$/.test(value) && Number(value) > 0
        ? null
        : 'Debe ser un número entero positivo.',
  },
  { path: 'employee.sex', get: (d) => d.employee?.sex },
  { path: 'employee.civilStatus', get: (d) => d.employee?.civilStatus },
  { path: 'employee.address', get: (d) => d.employee?.address },
  { path: 'employee.cedula', get: (d) => d.employee?.cedula },
  { path: 'position.service', get: (d) => d.position?.service },
  { path: 'position.duties', get: (d) => d.position?.duties },
  { path: 'position.workplace', get: (d) => d.position?.workplace },
  {
    path: 'position.startDate',
    get: (d) => d.position?.startDate,
    validate: isoDateValidator,
  },
  { path: 'position.workday', get: (d) => d.position?.workday },
  { path: 'position.schedule', get: (d) => d.position?.schedule },
  {
    path: 'compensation.salaryAmount',
    get: (d) => d.compensation?.salaryAmount,
    validate: (value) => {
      try {
        const amount = toDecimal(value, 'salaryAmount');
        return amount.gt(0) ? null : 'Debe ser un monto mayor que cero.';
      } catch {
        return 'Debe ser un monto decimal válido.';
      }
    },
  },
  {
    path: 'compensation.paymentMethod',
    get: (d) => d.compensation?.paymentMethod,
  },
  {
    path: 'compensation.paymentPeriod',
    get: (d) => d.compensation?.paymentPeriod,
  },
  {
    path: 'compensation.paymentPlace',
    get: (d) => d.compensation?.paymentPlace,
  },
  { path: 'signature.place', get: (d) => d.signature?.place },
  {
    path: 'signature.date',
    get: (d) => d.signature?.date,
    validate: isoDateValidator,
  },
];

/** Optional fields: never reported as missing, but validated when present. */
const OPTIONAL_FIELDS: FieldSpec[] = [
  {
    path: 'position.trialPeriodMonths',
    get: (d) => d.position?.trialPeriodMonths,
    validate: (value) =>
      value === '1' || value === '2' || value === '3'
        ? null
        : 'Debe ser 1, 2 o 3 meses.',
  },
];

export function validateContract(
  data: PaIndefContractDraft,
): ContractValidation {
  const missing: string[] = [];
  const invalid: InvalidField[] = [];
  for (const field of FIELDS) {
    const raw = field.get(data);
    if (raw === undefined || raw.trim() === '') {
      missing.push(field.path);
      continue;
    }
    const reason = field.validate?.(raw.trim());
    if (reason) invalid.push({ field: field.path, reason });
  }
  for (const field of OPTIONAL_FIELDS) {
    const raw = field.get(data);
    if (raw === undefined || raw.trim() === '') continue;
    const reason = field.validate?.(raw.trim());
    if (reason) invalid.push({ field: field.path, reason });
  }
  return { missing, invalid };
}
