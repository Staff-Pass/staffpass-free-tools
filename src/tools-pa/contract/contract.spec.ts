import { validateContract } from './validate';
import { buildContractClauses } from './clauses';
import { escapeHtml, renderContractHtml } from './render';
import { renderContractText } from './render-text';
import { formatDateEs, formatThousands } from './format';

const COMPLETE_DATA = {
  employer: {
    legalName: 'Acme Panamá, S.A.',
    ruc: '155646465-2-2015',
    dv: '32',
    representativeName: 'Juan Pérez',
    representativeCedula: '8-123-4567',
    address: 'Calle 50, Panamá',
  },
  employee: {
    fullName: 'María López',
    nationality: 'panameña',
    age: '30',
    sex: 'F',
    civilStatus: 'soltera',
    address: 'San Miguelito',
    cedula: '8-765-4321',
  },
  position: {
    service: 'comercio al por menor',
    duties: 'atención al cliente',
    workplace: 'sucursal Multiplaza',
    startDate: '2026-10-01',
    workday: 'diurna',
    schedule: '8:00 a.m. a 5:00 p.m., lunes a viernes',
  },
  compensation: {
    salaryAmount: '1500',
    paymentMethod: 'transferencia',
    paymentPeriod: 'quincenal',
    paymentPlace: 'oficina principal',
  },
  signature: {
    place: 'Ciudad de Panamá',
    date: '2026-09-25',
  },
};

const ALL_REQUIRED_PATHS = [
  'employer.legalName',
  'employer.ruc',
  'employer.dv',
  'employer.representativeName',
  'employer.representativeCedula',
  'employer.address',
  'employee.fullName',
  'employee.nationality',
  'employee.age',
  'employee.sex',
  'employee.civilStatus',
  'employee.address',
  'employee.cedula',
  'position.service',
  'position.duties',
  'position.workplace',
  'position.startDate',
  'position.workday',
  'position.schedule',
  'compensation.salaryAmount',
  'compensation.paymentMethod',
  'compensation.paymentPeriod',
  'compensation.paymentPlace',
  'signature.place',
  'signature.date',
];

describe('validateContract', () => {
  it('reports no missing or invalid fields for a complete contract', () => {
    expect(validateContract(COMPLETE_DATA)).toEqual({
      missing: [],
      invalid: [],
    });
  });

  it('reports every required field missing for an empty draft', () => {
    const result = validateContract({});
    expect(result.invalid).toEqual([]);
    expect(result.missing.sort()).toEqual([...ALL_REQUIRED_PATHS].sort());
  });

  it('reports only the fields missing from a partial draft', () => {
    const result = validateContract({
      employer: { legalName: 'Acme, S.A.' },
    });
    expect(result.missing).not.toContain('employer.legalName');
    expect(result.missing).toContain('employer.ruc');
    expect(result.missing).toContain('signature.date');
  });

  it('flags an invalid startDate without also reporting it as missing', () => {
    const result = validateContract({
      ...COMPLETE_DATA,
      position: { ...COMPLETE_DATA.position, startDate: '31/12/2026' },
    });
    expect(result.missing).not.toContain('position.startDate');
    expect(result.invalid).toContainEqual({
      field: 'position.startDate',
      reason: 'Debe ser una fecha válida en formato AAAA-MM-DD.',
    });
  });

  it('flags a non-positive salary amount', () => {
    const result = validateContract({
      ...COMPLETE_DATA,
      compensation: { ...COMPLETE_DATA.compensation, salaryAmount: '0' },
    });
    expect(result.invalid).toContainEqual({
      field: 'compensation.salaryAmount',
      reason: 'Debe ser un monto mayor que cero.',
    });
  });

  it('accepts an omitted trialPeriodMonths but rejects an out-of-range value', () => {
    expect(validateContract(COMPLETE_DATA).invalid).toEqual([]);
    const result = validateContract({
      ...COMPLETE_DATA,
      position: { ...COMPLETE_DATA.position, trialPeriodMonths: '5' as never },
    });
    expect(result.invalid).toContainEqual({
      field: 'position.trialPeriodMonths',
      reason: 'Debe ser 1, 2 o 3 meses.',
    });
  });
});

describe('buildContractClauses ordinal numbering', () => {
  it('numbers PRIMERA..OCTAVA sequentially when the trial-period clause is included', () => {
    const clauses = buildContractClauses({
      ...COMPLETE_DATA,
      position: { ...COMPLETE_DATA.position, trialPeriodMonths: '2' },
    });
    expect(clauses.map((c) => c.title.split(':')[0])).toEqual([
      'PRIMERA',
      'SEGUNDA',
      'TERCERA',
      'CUARTA',
      'QUINTA',
      'SEXTA',
      'SÉPTIMA',
      'OCTAVA',
    ]);
    expect(clauses[3].id).toBe('periodo_prueba');
  });

  it('omits the trial-period clause and renumbers the rest when not declared', () => {
    const clauses = buildContractClauses(COMPLETE_DATA);
    expect(clauses.some((c) => c.id === 'periodo_prueba')).toBe(false);
    expect(clauses.map((c) => c.title.split(':')[0])).toEqual([
      'PRIMERA',
      'SEGUNDA',
      'TERCERA',
      'CUARTA',
      'QUINTA',
      'SEXTA',
      'SÉPTIMA',
    ]);
  });
});

describe('HTML escaping', () => {
  it('escapes the five reserved HTML characters', () => {
    expect(escapeHtml(`<script>&"'</script>`)).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });

  it('never emits raw markup from an attacker-controlled clause field', () => {
    const clauses = buildContractClauses({
      ...COMPLETE_DATA,
      employer: {
        ...COMPLETE_DATA.employer,
        legalName: '<img src=x onerror=alert(1)>',
      },
    });
    const html = renderContractHtml(clauses);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('always carries the draft legend and the MITRADEL registration note, and never claims the document is legal/approved/registered', () => {
    const html = renderContractHtml(buildContractClauses(COMPLETE_DATA));
    expect(html).toContain('Borrador para revisión');
    expect(html).toContain('PA-INDEF');
    expect(html).toContain('trámite independiente');
    // "no constituye asesoría legal", "no ... un documento aprobado o
    // registrado" are correct negations required by spec §5.5 — only an
    // affirmative claim ("es/está/ha sido legal/aprobado/registrado") would
    // violate it.
    expect(html).not.toMatch(
      /\b(es|está|ha sido)\s+(un\s+documento\s+)?(legal|aprobado|registrado)\b/i,
    );
  });
});

describe('renderContractText', () => {
  it('carries the same legend, clauses and registration note as the HTML renderer', () => {
    const clauses = buildContractClauses(COMPLETE_DATA);
    const text = renderContractText(clauses);
    expect(text).toContain('BORRADOR PARA REVISIÓN');
    expect(text).toContain('PA-INDEF');
    for (const clause of clauses) {
      expect(text).toContain(clause.title);
      expect(text).toContain(clause.text);
    }
    expect(text).toContain('trámite independiente');
  });
});

describe('formatDateEs / formatThousands', () => {
  it('formats an ISO date in Spanish long form', () => {
    expect(formatDateEs('2026-10-01')).toBe('1 de octubre de 2026');
  });

  it('leaves a non-ISO value unchanged', () => {
    expect(formatDateEs('[pendiente: fecha]')).toBe('[pendiente: fecha]');
  });

  it('inserts thousands separators', () => {
    expect(formatThousands('1500.00')).toBe('1,500.00');
    expect(formatThousands('1000000.50')).toBe('1,000,000.50');
    expect(formatThousands('999.99')).toBe('999.99');
  });

  it('renders the salary clause with thousands-separated PAB formatting', () => {
    const clauses = buildContractClauses(COMPLETE_DATA);
    const salario = clauses.find((c) => c.id === 'salario');
    expect(salario?.text).toContain('B/. 1,500.00');
  });
});
