import {
  resolveCssEmployerCode,
  resolveRule,
  resolveRules,
  toIsoDate,
} from './resolveRules';

describe('resolveCssEmployerCode', () => {
  it.each([
    ['2025-03-18', 'CSS_CUOTA_PATRONAL_TRAMO1', '0.1325'],
    ['2026-01-01', 'CSS_CUOTA_PATRONAL_TRAMO1', '0.1325'],
    ['2027-02-28', 'CSS_CUOTA_PATRONAL_TRAMO1', '0.1325'],
    ['2027-03-01', 'CSS_CUOTA_PATRONAL_TRAMO2', '0.1425'],
    ['2028-06-15', 'CSS_CUOTA_PATRONAL_TRAMO2', '0.1425'],
    ['2029-02-28', 'CSS_CUOTA_PATRONAL_TRAMO2', '0.1425'],
    ['2029-03-01', 'CSS_CUOTA_PATRONAL_TRAMO3', '0.1525'],
    ['2030-01-01', 'CSS_CUOTA_PATRONAL_TRAMO3', '0.1525'],
  ])(
    'steps through the Ley 462/2025 tramos at %s -> %s',
    (date, expectedCode, expectedRate) => {
      const code = resolveCssEmployerCode(date);
      expect(code).toBe(expectedCode);
      const resolved = resolveRule(code, date);
      expect(resolved.value.rate).toBe(expectedRate);
    },
  );

  it('resolves the same tramo code whether given a string or a Date', () => {
    expect(resolveCssEmployerCode('2027-03-01')).toBe(
      resolveCssEmployerCode(new Date('2027-03-01T00:00:00.000Z')),
    );
  });
});

describe('resolveRules / resolveRule effective-date switching', () => {
  it('excludes a rule before its effectiveFrom', () => {
    // CSS_CUOTA_EMPLEADO is effective from 2025-03-18.
    expect(resolveRules('2025-03-17').has('CSS_CUOTA_EMPLEADO')).toBe(false);
    expect(resolveRules('2025-03-18').has('CSS_CUOTA_EMPLEADO')).toBe(true);
  });

  it('excludes a rule on or after its effectiveTo (exclusive upper bound)', () => {
    // CSS_CUOTA_PATRONAL_TRAMO1 is effective [2025-03-18, 2027-03-01).
    expect(resolveRules('2027-02-28').has('CSS_CUOTA_PATRONAL_TRAMO1')).toBe(
      true,
    );
    expect(resolveRules('2027-03-01').has('CSS_CUOTA_PATRONAL_TRAMO1')).toBe(
      false,
    );
  });

  it('throws LEGAL_RULE_NOT_FOUND for a code with no row effective on the date', () => {
    expect(() => resolveRule('CSS_CUOTA_EMPLEADO', '2020-01-01')).toThrow(
      'LEGAL_RULE_NOT_FOUND:CSS_CUOTA_EMPLEADO:2020-01-01',
    );
  });

  it('marks every resolved rule as unverified, carrying the catalog document status', () => {
    const rule = resolveRule('JORNADA_DIURNA', '2026-01-01');
    expect(rule.verified).toBe(false);
    expect(rule.documentStatus).toBe('VERIFICADO');
    const unverifiedDoc = resolveRule(
      'RIESGOS_PROFESIONALES_CLASE',
      '2026-01-01',
    );
    expect(unverifiedDoc.documentStatus).toBe('NO_VERIFICADO');
  });
});

describe('toIsoDate', () => {
  it('accepts a full ISO datetime string and truncates to the date', () => {
    expect(toIsoDate('2026-03-18T10:00:00.000Z')).toBe('2026-03-18');
  });

  it('accepts a Date and formats it as UTC YYYY-MM-DD', () => {
    expect(toIsoDate(new Date('2026-03-18T00:00:00.000Z'))).toBe('2026-03-18');
  });

  it('rejects a non-ISO string', () => {
    expect(() => toIsoDate('03/18/2026')).toThrow(
      'date must be an ISO date (YYYY-MM-DD)',
    );
  });
});
